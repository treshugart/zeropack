const babel = require("babel-core");
const babelPresetEnv = require("babel-preset-env");
const babelPresetFlow = require("babel-preset-flow");
const babelPresetReact = require("babel-preset-react");
const babelPresetStage0 = require("babel-preset-stage-0");
const cosmiconfig = require("cosmiconfig");
const flowCopySource = require("flow-copy-source");
const fs = require("fs-extra");
const map = require("lodash/map");
const merge = require("lodash/merge");
const path = require("path");
const pickBy = require("lodash/pickBy");
const sourceTrace = require("source-trace");
const uppercamelcase = require("uppercamelcase");
const webpack = require("webpack");
const webpackServe = require("webpack-serve");
const webpackNodeExternals = require("webpack-node-externals");

const defaultBabelPresets = [
  babelPresetFlow,
  babelPresetReact,
  babelPresetStage0
];

async function getPath(...parts) {
  const possiblePath = path.join(process.cwd(), ...parts);
  return (await fs.exists(possiblePath)) ? possiblePath : null;
}

async function importFile(...parts) {
  const possiblePath = await getPath(...parts);
  return possiblePath ? require(possiblePath) : null;
}

async function readFile(...parts) {
  const possiblePath = await getPath(...parts);
  return possiblePath
    ? (await fs.readFile(possiblePath)).toString("utf-8")
    : null;
}

async function getDefaultBabelOptions() {
  const pkg = getPkgOptions();
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

async function getBabelOptions() {
  return merge(await getDefaultBabelOptions(), await getUserBabelOptions());
}

async function getDefaultPkgOptions() {
  return {
    devDependencies: {},
    engines: { node: (await readFile(".nvmrc")) || "current" },
    main: "./dist/index.js",
    name: "unknown"
  };
}

async function getUserPkgOptions() {
  return importFile("package.json");
}

async function getPkgOptions() {
  return merge(await getDefaultPkgOptions(), await getUserPkgOptions());
}

function getOutputPath(file) {
  const dirname = path.dirname(file);
  return path.join(process.cwd(), dirname === "." ? "dist" : dirname);
}

function getLibraryTarget(type) {
  return type === "main" ? "commonjs2" : "umd";
}

async function getDefaultZeropackOptionsForType(type) {
  const pkg = await getPkgOptions();
  const { babelConfig, env } = await getBabelOptions();
  return pkg[type]
    ? {
        devtool: "source-map",
        entry: `./src/index.js`,
        externals: Object.keys({
          ...pkg.dependencies,
          ...pkg.devDependencies,
          ...pkg.optionalDependencies,
          ...pkg.peerDependencies
        }),
        mode: "development",
        module: {
          rules: [
            {
              test: /\.jsx?$/,
              use: [
                {
                  loader: require.resolve("babel-loader"),
                  options: merge(babelConfig, env[type], { env })
                }
              ]
            }
          ]
        },
        output: {
          filename: path.basename(pkg[type]),
          library: uppercamelcase(pkg.name),
          libraryTarget: getLibraryTarget(type),
          path: getOutputPath(pkg[type])
        },
        resolve: {
          alias: { [pkg.name]: "./src/index.js" }
        }
      }
    : null;
}

async function getDefaultZeropackOptions() {
  return {
    browser: await getDefaultZeropackOptionsForType("browser"),
    main: await getDefaultZeropackOptionsForType("main"),
    module: await getDefaultZeropackOptionsForType("module")
  };
}

async function getUserZeropackOptions() {
  const loaded = await cosmiconfig("zeropack").load();
  return loaded ? loaded.config : {};
}

async function getZeropackOptions() {
  return pickBy(
    merge(await getDefaultZeropackOptions(), await getUserZeropackOptions()),
    Boolean
  );
}

async function buildFlow() {
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

async function buildWebpack() {
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

async function clean() {
  const opt = await getZeropackOptions();
  return Promise.all(map(opt, o => fs.remove(o.output.path)));
}

async function zeropack() {
  await clean();
  return Promise.all([await buildWebpack(), await buildFlow()]);
}

module.exports = {
  zeropack
};
