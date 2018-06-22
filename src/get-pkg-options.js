// @flow

import merge from "lodash/merge";
import readPkgUp from "read-pkg-up";
import importFile from "./import-file";
import readFile from "./read-file";

async function getDefaultPkgOptions() {
  return {
    devDependencies: {},
    engines: { node: (await readFile(".nvmrc")) || "current" },
    main: "./dist/index.js",
    name: "unknown"
  };
}

async function getUserPkgOptions() {
  return (await readPkgUp()).pkg;
}

export default async function getPkgOptions() {
  return merge(await getDefaultPkgOptions(), await getUserPkgOptions());
}
