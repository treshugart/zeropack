const yargs = require("yargs");
const { zeropack } = require(".");

(async function() {
  await zeropack(yargs.argv);
})();
