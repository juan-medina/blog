#!/usr/bin/env pwsh

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

bundle exec jekyll serve -d docs --watch --drafts --config=_config.yml,_draft.yml