#!/usr/bin/env bash

set -o errexit

echo "deleting all copy of cv"
rm -rf cv
echo "old copy deleted"

echo "creating cv directory"
mkdir cv
echo "directory created"

echo "copying files into cv directory"
cp -r ../cv/docs/* cv/
echo "files copied"