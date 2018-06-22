// @flow

import fs from "fs-extra";
import path from "path";

export default async function getPath(
  ...parts /*: Array<string> */
) /*: Promise<?string> */ {
  const possiblePath = path.join(process.cwd(), ...parts);
  return (await fs.exists(possiblePath)) ? possiblePath : null;
}
