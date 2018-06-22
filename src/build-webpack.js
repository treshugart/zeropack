// @flow

import map from "lodash/map";
import webpack from "webpack";
import getZeropackOptions from "./get-zeropack-options";

export default async function buildWebpack() {
  const opt = await getZeropackOptions();
  return Promise.all(
    map(opt, o => {
      return new Promise((yup, nup) => {
        webpack(o, (error, stats) => {
          if (error) {
            nup(error);
            return;
          } else if (stats.hasErrors() || stats.hasWarnings()) {
            const info = stats.toJson();
            nup(info.warnings.concat(info.errors).join("\n\n"));
            return;
          } else {
            yup(stats);
          }
        });
      }).catch(console.error);
    })
  );
}
