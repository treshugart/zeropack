const exec = require("execa");
const fs = require("fs-extra");
const path = require("path");

const base = path.join(__dirname, "..", "__fixtures__");

async function cwd(newCwd) {
  newCwd = path.join(base, newCwd);
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

async function read(p) {
  return (await fs.readFile(path.join(process.cwd(), p))).toString("utf8");
}

async function rm(p) {
  await fs.remove(path.join(process.cwd(), p));
}

async function run(fixture, ...args) {
  await cwd(fixture);
  await exec("node", ["../../../bin.js", ...args], { cwd: process.cwd() });
}

module.exports = { cwd, read, rm, run };
