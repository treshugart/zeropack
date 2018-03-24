# Zeropack

Practical, zero-config Webpack, until you need it.

* Node / ES2015 transpilation.
* Webpack bundles for browsers and apps.
* Flowtypes are automatically output if it's being used.

## Installing

```sh
npm i -D zeropack
```

## Usage

```sh
$ zeropack
```

## Types of builds

The goal of this project is to provide the most practical zero-config setup and infer defaults where possible from other parts of your project, such as your `package.json`. As we all know, even projects that offer zero configuration up front still need to be configurable to some extent, so being flexible is also a priority, though secondary.

As already stated, everything revolves around inferring information from your existing setup as much as possible. Most of this can be done by looking at existing conventions for "main" fields in your `package.json`. Fields such as `browser`, `main` and `module` are already highly conventionalised and give meaning to your project and, thus, also to your build, giving us a lot to work with.

There's two main types of builds:

1.  Separated
2.  Bundled

### Separated

Separated builds happen when your entry point is traced, and each file in your project is pushed through Babel and emitted in the output directory as they appear relative to their source directory.

Main fields that output a separated build:

* `main` - Node. Babel config defaults to `{ ["env", "targets": { "node": /* value of .nvmrc or "current" */ }] }`
* `module` - ES2015 modules. Babel config defaults to `{ "presets": ["env", { "modules": false }] }`.

As an example, consider the following structure:

```
- src
  - index.js
  - some
    - file.js
```

If you set your main field as `dist/main.js`, it would output:

```
- dist
  - main.js
  - some
    - file.js
```

Notice that `index.js` was renamed to `main.js`. This is because the `source` (see later in "Custom configuration") has been specified as `src/index.js` (this is the default), but the main was `dist/main.js`. This means that your entry point is renamed prior to emitting, if it is different from the source.

You can even specify mains deeper than a single level. For example, `dist/main/index.js` would work just fine.

### Bundled

Bundled builds are passed through Webpack and use `babel-loader` by default for all `.js` or `.jsx` files.

Main fields that output a bundled build:

* `browser` - Your entire project is bundled up so that it can be consumed by a browser. Babel config defaults to `{ "presets": ["env"] }`.

### Similarities between builds

All builds share the following similarities:

* Babel is used for transpilation.
* `BABEL_ENV` is always set to the "main" field that triggered the build (i.e. `module`). This allows you to customise your babel configuration on a per-build basis using the `env` option, if necessary.
* If you have `flow-bin` specified as a `devDependency`, each file that is emitted gets a corresponding `.js.flow` file for it.
* Source maps are automatically output for every file that gets emitted.

## Custom configuration

The following are options that you can use as custom configuration in the `package.json`.

### `source`

Specifies the entry point for all builds. This defaults to `./src/index.js`.
