#!/usr/bin/env node

const nodeWatch = require("node-watch");
const readPkgUp = require("read-pkg-up");
const yargs = require("yargs");
const { zeropack } = require(".");

(async function() {
  const { _, $0, help, pkg, version, watch, ...args } = yargs.argv;
  const rpkg = pkg ? JSON.parse(pkg) : (await readPkgUp()).pkg;
  const opts = { ...rpkg, ...args };
  if (watch) {
    nodeWatch(".", { recursive: true }, async () => await zeropack(opts));
  } else {
    await zeropack(opts);
  }
})();
