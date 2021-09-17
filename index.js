const rwc = require("random-weighted-choice");
const { isEqual, cloneDeep } = require("lodash");
const mergeImages = require("merge-images");
const { Canvas, Image } = require("canvas");
const fs = require("fs").promises;
const fsExtra = require("fs-extra");
const { orgKey, TOTAL_IMAGES } = require("./settings");

const basePath = `./configs/${orgKey}`;
const metaModel = require(`${basePath}/meta`);
const assets = require(`${basePath}/traits.json`);

// Generate Traits
const allImages = [];

// Helper functions
const LAYER_KEYS = Object.keys(assets);
const getLayer = (layerKey) => assets[layerKey];
const getWeights = (layerKey) => getLayer(layerKey).map((x) => x.weight);
const getOneWeight = (layerKey, imageKey) =>
  getLayer(layerKey).find((x) => x.id === imageKey);
const toStr = (json) => JSON.stringify(json, null, 2);

const sumWeights = (weightArray) =>
  weightArray.reduce((total, weight) => total + weight, 0);

// Check weight total
const doWeightsAddUpTo100 = LAYER_KEYS.reduce((total, layerKey) => {
  const totalLayerWeights = sumWeights(getWeights(layerKey));
  return total + totalLayerWeights;
}, 0);

// Test: console.log("ir2", { doWeightsAddUpTo100 });

// A recursive function to generate unique image combinations
async function createNewImage(index) {
  const newImage = {};
  // For each trait category, select a random trait based on the weightings
  LAYER_KEYS.forEach((layerKey) => {
    newImage[layerKey] = rwc(getLayer(layerKey));
  });

  const hasDuplicate = allImages.find((existingImage) => {
    const matches = isEqual(existingImage, newImage);
    return matches;
  });

  if (hasDuplicate) {
    console.log("Found duplicate regenerating");
    const tryAgain = await createNewImage(index);
    return tryAgain;
  } else {
    const imageArray = Object.values(newImage).map(
      (name) => `${basePath}/images/${name}.png`
    );
    const options = { Canvas, Image };
    const data = await mergeImages(imageArray, options);
    let base64Data = data.replace(/^data:image\/png;base64,/, "");
    base64Data += base64Data.replace("+", " ");
    const binaryData = Buffer.from(base64Data, "base64").toString("binary");
    await fs.writeFile(`${basePath}/assets/${index}.png`, binaryData, "binary");
    return newImage;
  }
}

async function generateImages() {
  // Generate the unique combinations based on trait weightings
  for (let i = 0; i < TOTAL_IMAGES; i++) {
    const newImage = await createNewImage(i);
    allImages.push(newImage);
  }

  // add tokenId
  for (let i = 0; i < allImages.length; i++) {
    allImages.tokenId = i;
  }
}

async function main() {
  // Delete any old files
  await fsExtra.emptyDir(`${basePath}/assets`);
  await fsExtra.emptyDir(`${basePath}/other`);

  await generateImages();

  // Returns true if all images are unique
  // Test: allImages.push(allImages[0]);
  function allImagesAreUnique() {
    for (let i = 0; i < allImages.length; i++) {
      for (let j = 0; j < allImages.length; j++) {
        if (j !== i) {
          const areEqual = isEqual(allImages[i], allImages[j]);
          if (areEqual) return false;
        }
      }
    }
    return true;
  }

  // Double check all images are unique
  if (allImagesAreUnique()) {
    console.log("All images are unique");
  } else {
    console.log("Duplicate images found");
    process.exit(1);
  }

  // Get trait counts
  const traitCounts = {};
  for (let i = 0; i < allImages.length; i++) {
    const image = allImages[i];
    LAYER_KEYS.forEach((layerKey) => {
      const imageKey = image[layerKey];
      if (!traitCounts[imageKey]) traitCounts[imageKey] = 0;
      traitCounts[imageKey] += 1;
    });
  }
  await fs.writeFile(`${basePath}/other/traitCounts.json`, toStr(traitCounts));

  function generateMeta(index) {
    const image = allImages[index];
    const meta = cloneDeep(metaModel);

    // add attributes
    LAYER_KEYS.forEach((layerKey) => {
      const nextAttribute = {
        trait_type: layerKey,
        value: image[layerKey],
      };
      meta.attributes.push(nextAttribute);
    });

    meta.properties.files = [{ uri: `${index}.png`, type: "image/png" }];

    // other
    meta.image = `${index}.png`;
    return meta;
  }

  const finalMeta = [];
  for (let i = 0; i < allImages.length; i++) {
    const meta = generateMeta(i);
    finalMeta.push(meta);
    await fs.writeFile(`${basePath}/assets/${i}.json`, toStr(meta));
  }
  await fs.writeFile(`${basePath}/other/allMeta.json`, toStr(finalMeta));

  // console.log(traitCounts);
  // console.log(finalMeta);
  // console.log(allImages);
}

main()
  .then(() => {
    console.log("Images generated");
  })
  .catch((err) => console.error("Error", err));
