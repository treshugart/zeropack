// @flow

import fs from "fs-extra";
import map from "lodash/map";
import path from "path";
import sourceTrace from "source-trace";
import getZeropackOptions from "./get-zeropack-options";

export default async function buildFlow() {
  const opt = await getZeropackOptions();
  return Promise.all(
    map(opt, async o => {
      const { entry } = o;
      const { filename: outputFileBasename, path: outputPath } = o.output;
      const entryResolved = path.resolve(entry);
      return Promise.all(
        await sourceTrace(entry).map(async file => {
          const relativeFile =
            file === entryResolved
              ? outputFileBasename
              : path.relative(path.dirname(entryResolved), file);
          const outputFile = path.join(outputPath, relativeFile) + ".flow";
          return fs.copy(file, outputFile);
        })
      );
    })
  );
}
