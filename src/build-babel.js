// @flow

const babel = require("babel-core");
const fs = require("fs-extra");
const map = require("lodash/map");
const path = require("path");
const pickBy = require("lodash/pickBy");
const trace = require("source-trace");
const getBabelOptions = require("./get-babel-options");
const getZeropackOptions = require("./get-zeropack-options");

module.exports = async function buildBabel() {
  const optBabel = await getBabelOptions();
  const optZeropack = await getZeropackOptions();
  return Promise.all(
    map(
      pickBy(optZeropack, (o, k) => k === "main" || k === "module"),
      (o, k) => {
        const base = path.resolve(path.dirname(o.entry));
        return trace(o.entry).map(async f => {
          const relativeDest = f.resolvedPath.replace(`${base}/`, "");
          const relativeDestMap = `./${relativeDest}.map`;
          const absoluteDest = path.join(o.output.path, relativeDest);
          const absoluteDestMap = `${absoluteDest}.map`;
          const code = (await fs.readFile(f.resolvedPath)).toString();
          const transformed = babel.transform(code, optBabel);
          const transformedPaths = transformed.code.replace(
            f.originalPath,
            f.path
          );
          await Promise.all([
            fs.outputFile(
              absoluteDest,
              `${transformedPaths}\n\n//# sourceMappingURL=${relativeDestMap}`
            ),
            fs.outputFile(absoluteDestMap, JSON.stringify(transformed.map))
          ]);
        });
      }
    )
  );
};
