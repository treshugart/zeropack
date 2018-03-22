const yargs = require("yargs");
const { zeropack } = require(".");

(async function() {
  const { _, $0, help, version, ...args } = yargs.argv;
  await zeropack(args);
})();
