#!/bin/bash

# make sure our CWD is this directory
cd "$(dirname "$0")"

# get the lerna version
VERSION=`npx jq2 "$.version" ../lerna.json`
PACKAGE="apowers313/dataflow-designer"
LATEST_PACKAGE=$PACKAGE:latest
VERSION_PACKAGE=$PACKAGE:v$VERSION

if [ "$1" = "build" ]; then
    ls -d ../packages/node-red-dataflow* | cut -d/ -f3 > assets/npm_manifest
    docker build --no-cache --tag $LATEST_PACKAGE --tag $VERSION_PACKAGE .
elif [ "$1" = "publish" ]; then
    docker login
    docker push $LATEST_PACKAGE
    docker push $VERSION_PACKAGE
else
    echo "usage: $0 <build|publish>"
fi
