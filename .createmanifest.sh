#!/bin/bash -x

ls -d packages/node-red-dataflow* | cut -d/ -f2 > docker/assets/npm_manifest
