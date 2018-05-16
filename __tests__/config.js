const { getDefaultOptions, getFlowOptions, getWebpackOptions } = require("..");

test("default", async () => {
  expect(await getDefaultOptions()).toMatchSnapshot();
});

test("flow", async () => {
  expect(await getFlowOptions()).toMatchSnapshot();
});

test("webpack", async () => {
  expect(await getWebpackOptions()).toMatchSnapshot();
});
