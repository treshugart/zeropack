// @flow

import fs from "fs-extra";
import getPath from "./get-path";

export default async function readFile(...parts /*: Array<string>*/) {
  const possiblePath = await getPath(...parts);
  return possiblePath
    ? (await fs.readFile(possiblePath)).toString("utf-8")
    : null;
}
