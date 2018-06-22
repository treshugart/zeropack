// @flow

import fs from "fs-extra";
import map from "lodash/map";
import getZeropackOptions from "./get-zeropack-options";

export default async function clean() {
  const opt = await getZeropackOptions();
  return Promise.all(map(opt, o => fs.remove(o.output.path)));
}
