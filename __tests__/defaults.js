const { zeropack } = require("..");
const { cwd } = require("./__utils__");

beforeAll(async () => {
  await cwd("__tests__/__fixtures__/defaults");
});

test("default", async () => {
  await zeropack();
});
