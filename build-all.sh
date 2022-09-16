#!/bin/bash

set -e

BASEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

#yarn install && yarn upgrade @sentio/sdk

for dir in $BASEDIR/projects/*/; do # list directories in the form "/tmp/dirname/"
  dir=${dir%*/}                           # remove the trailing "/"
  echo "### Build ${dir##*/}"             # print everything after the final "/"
  cd $dir
  rm -rf src/types
  yarn sentio build
done
