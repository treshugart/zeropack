// @flow

const buildClean = require("./build-clean");
const buildFlow = require("./build-flow");
const buildWebpack = require("./build-webpack");

module.exports = async function buildZeropack() {
  await buildClean();
  return Promise.all([buildFlow(), buildWebpack()]);
};
