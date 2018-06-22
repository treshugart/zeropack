// @flow

import babelPresetEnv from "babel-preset-env";
import babelPresetFlow from "babel-preset-flow";
import babelPresetReact from "babel-preset-react";
import babelPresetStage0 from "babel-preset-stage-0";
import cosmiconfig from "cosmiconfig";
import merge from "lodash/merge";
import getPkgOptions from "./get-pkg-options";

const defaultBabelPresets = [
  babelPresetFlow,
  babelPresetReact,
  babelPresetStage0
];

async function getDefaultBabelOptions() {
  const pkg = await getPkgOptions();
  const node = pkg.engines ? pkg.engines.node : "current";
  return {
    // We have to add the stage-0 preset after the env preset otherwise
    // it complains that the class properties transform doesn't exist.
    env: {
      // Uses the env preset, straight up.
      browser: {
        presets: [...defaultBabelPresets, babelPresetEnv, babelPresetStage0]
      },
      // Customises the env preset to target node.
      main: {
        presets: [
          ...defaultBabelPresets,
          [babelPresetEnv, { targets: { node } }],
          babelPresetStage0
        ]
      },
      // Customises the env preset to target esmodules.
      module: {
        presets: [
          ...defaultBabelPresets,
          [babelPresetEnv, { modules: false }],
          babelPresetStage0
        ]
      }
    },
    // We define the defaults even though we have to override them in "env".
    presets: defaultBabelPresets,
    sourceMaps: true
  };
}

async function getUserBabelOptions() {
  const loaded = await cosmiconfig("babel").load();
  return loaded ? loaded.config : {};
}

export default async function getBabelOptions() {
  return merge(await getDefaultBabelOptions(), await getUserBabelOptions());
}
