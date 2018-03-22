const { zeropack } = require("..");
const { cwd } = require("./__utils__");

test("default", async () => {
  const restore = await cwd("__tests__/__fixtures__/defaults");
  console.log(process.cwd());
  await restore();
  console.log(process.cwd());
});
