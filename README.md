[![build](https://github.com/apowers313/dataflow-designer/actions/workflows/build.yml/badge.svg)](https://github.com/apowers313/dataflow-designer/actions/workflows/build.yml) [![Coverage Status](https://coveralls.io/repos/github/apowers313/dataflow-designer/badge.svg?branch=master)](https://coveralls.io/github/apowers313/dataflow-designer?branch=master)

Monorepo for dataflow. Work in progress. Do not use.

[API Docs](https://apowers313.github.io/dataflow-designer/)

Components
* File
  * [Source](./packages/node-red-dataflow-file/dataflow-file-source/dataflow-file-source-help.md)
  * [Sink](./packages/node-red-dataflow-file/dataflow-file-sink/dataflow-file-sink-help.md)

Development Notes
* SDLC
  * `lerna run build`
  * `lerna run test`
  * `lerna run lint`
  * `lerna run publish`
* Templates
  * `yarn create:dataflow`
  * `yarn create:nodered`
  * `yarn add:nodered`
* Docker
  * `yarn docker:build`
  * `yarn docker:publish` - usually run by `lerna publish`
  * `yarn docker:shell`
  * `yarn docker:run`