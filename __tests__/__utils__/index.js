const exec = require("execa");
const path = require("path");

async function cwd(newCwd) {
  newCwd = path.join(process.cwd(), newCwd);
  const oldCwd = process.cwd();
  const oldCwdFn = process.cwd;
  const newCwdFn = () => newCwd;
  process.cwd = newCwdFn;
  await exec("cd", [newCwd]);
  return async () => {
    await exec("cd", [oldCwd]);
    process.cwd = oldCwdFn;
  };
}

module.exports = { cwd };
