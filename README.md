# Image Generator

## Setup

```bash
yarn install
```

## Generate

You can copy and rename the `./configs/smiley` directory to create your own custom collection.
Add your image layers to `images` then update the `meta.js` and `traits.json` to reflect your collection.
The last step is to update `settings.js` to point to the new folder you created in configs.

```bash
yarn generate
```
