// @flow

const fs = require("fs-extra");
const path = require("path");

module.exports = async function getPath(
  ...parts /*: Array<string> */
) /*: Promise<?string> */ {
  const possiblePath = path.join(process.cwd(), ...parts);
  return (await fs.exists(possiblePath)) ? possiblePath : null;
};
