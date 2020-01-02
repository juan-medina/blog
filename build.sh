#!/usr/bin/env bash

set -o errexit

bundle exec jekyll build --safe -d docs
