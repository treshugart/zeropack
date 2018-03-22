const exec = require("execa");
const path = require("path");
const { zeropack: zp } = require("../..");

async function zeropack(...args) {
  const { filename } = module.parent;
  const basename = path.basename(filename).replace(".js", "");
  const cwd = process.cwd();
  await exec("cd", [path.join(cwd, "__tests__", "__fixtures__", basename)]);
  await zp(...args);
  await exec("cd", [cwd]);
}

module.exports = { zeropack };
