// @flow

const fs = require("fs-extra");
const getPath = require("./get-path");

module.exports = async function readFile(...parts /*: Array<string>*/) {
  const possiblePath = await getPath(...parts);
  return possiblePath
    ? (await fs.readFile(possiblePath)).toString("utf-8")
    : null;
};
