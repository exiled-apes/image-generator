const meta = {
  image: "",
  name: "Individual NFT Name",
  symbol: "TICKER",
  collection: {
    name: "Collection Name",
    family: "NFT Family",
  },
  attributes: [],
  seller_fee_basis_points: 500, // basis points 500 = 5%
  properties: {
    creators: [
      { address: "", share: 60.0 }, // for splitting royalties between wallet addresses 60.0 = 60%
      { address: "", share: 40.0 }, // 40 = 40% for a total of 100%
    ],
    files: [{ uri: "", type: "image/png" }],
  },
};

module.exports = meta;
