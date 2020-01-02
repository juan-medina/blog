#!/usr/bin/env bash

set -o errexit

bundle exec jekyll serve -d docs --watch --drafts
