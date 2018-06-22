// @flow

import buildClean from "./build-clean";
import buildFlow from "./build-flow";
import buildWebpack from "./build-webpack";

export default async function zeropack() {
  await buildClean();
  return Promise.all([await buildWebpack(), await buildFlow()]);
}
