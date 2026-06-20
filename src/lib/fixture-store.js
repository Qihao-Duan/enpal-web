const fs = require("fs");
const path = require("path");

const FIXTURE_FILES = {
  household: "household-profile.json",
  contract: "tariff-contract.json",
  forecast: "forecasts-24h.json",
  deviceState: "device-state.json",
  recommendationFixture: "ev-charging-recommendation.json",
  productCatalog: "product-catalog.json"
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadFixtures(rootDir = path.resolve(__dirname, "../..")) {
  const dataDir = path.join(rootDir, "data");
  return Object.fromEntries(
    Object.entries(FIXTURE_FILES).map(([key, fileName]) => [
      key,
      readJson(path.join(dataDir, fileName))
    ])
  );
}

module.exports = {
  loadFixtures,
  readJson
};
