// @flow

const getPath = require("./get-path");

module.exports = async function importFile(...parts /*: Array<string>*/) {
  const possiblePath = await getPath(...parts);
  return possiblePath ? require(possiblePath) : null;
};
