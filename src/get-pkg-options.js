// @flow

const merge = require("lodash/merge");
const readPkgUp = require("read-pkg-up");
const importFile = require("./import-file");
const readFile = require("./read-file");

async function getDefaultPkgOptions() {
  return {
    devDependencies: {},
    engines: { node: (await readFile(".nvmrc")) || "current" },
    main: "./dist/index.js",
    name: "unknown"
  };
}

async function getUserPkgOptions() {
  return importFile("package.json");
}

module.exports = async function getPkgOptions() {
  return merge(await getDefaultPkgOptions(), await getUserPkgOptions());
};
