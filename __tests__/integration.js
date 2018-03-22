const { read, run } = require("./__utils__");

test("defaults", async () => {
  await run("defaults");
  expect(await read("dist/index.js")).toMatchSnapshot();
});

test("defaults - { mode: development }", async () => {
  await run("defaults", "--mode", "development");
  expect(await read("dist/index.js")).toMatchSnapshot();
});

test.only("custom", async () => {
  await run("custom");
  expect(await read("dist/main.js")).toMatchSnapshot();
  expect(await read("dist/main.js.flow")).toMatchSnapshot();
});
