// @flow

const fs = require("fs-extra");
const map = require("lodash/map");
const getZeropackOptions = require("./get-zeropack-options");

module.exports = async function clean() {
  const opt = await getZeropackOptions();
  return Promise.all(map(opt, o => fs.remove(o.output.path)));
};
