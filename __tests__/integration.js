const { read, run } = require("./__utils__");

test("defaults", async () => {
  await run("defaults");
  expect(await read("dist/index.js")).toMatchSnapshot();
});

test("defaults - { mode: development }", async () => {
  await run("defaults", "--mode", "development");
  expect(await read("dist/index.js")).toMatchSnapshot();
});