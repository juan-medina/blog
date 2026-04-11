# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**juan-medina.com** is Juan Medina's personal blog — a static site built with Jekyll and hosted on GitHub Pages. Posts cover programming, cloud, games, and technology. The site is designed and maintained by one developer.

Follow YAGNI — only implement what's needed for the current scope.

## Stack

- **Jekyll 3.8** — static site generator, Liquid templating, kramdown Markdown
- **Ruby / Bundler** — dependency management via `Gemfile`
- **Sass** — styles compiled by Jekyll (`_sass/`, compressed output)
- **Trophy Jekyll theme** — base theme with custom tweaks
- **Disqus** — comments (toggled per-post and globally via `_config.yml`)
- **Google Analytics** — `UA-71726617-1`

## Build Commands

```shell
# Install dependencies
bundle install

# Serve locally with live reload (http://localhost:4000)
bundle exec jekyll serve

# Build static output to _site/
bundle exec jekyll build

# Serve with draft posts visible
bundle exec jekyll serve --drafts --config _config.yml,_draft.yml
```

## Project Structure

```
.
├── _config.yml          # main site config (production)
├── _draft.yml           # overrides for local draft mode (disables analytics/comments)
├── Gemfile              # Ruby dependencies
├── _posts/              # blog posts (Markdown, named YYYY-MM-DD-slug.md)
├── _categories/         # one page per category for category browsing
├── _layouts/            # page templates (default, post, page, category)
├── _includes/           # reusable partials (header, footer, disqus, etc.)
├── _sass/               # Sass source files
├── assets/
│   ├── img/             # post hero images and thumbnails
│   └── fonts/
├── index.html           # homepage (paginated post list)
├── build.sh             # convenience wrapper around jekyll build
└── serve.sh             # convenience wrapper around jekyll serve
```

## Post Format

All posts live in `_posts/` with the filename `YYYY-MM-DD-slug.md`.

Required front matter:

```yaml
---
layout: post
title: Your Post Title
date: YYYY-MM-DD HH:MM:SS
author: Juan Medina
comments: true
categories: [Category]       # e.g. [Programming], [Cloud,Programming]
image: /assets/img/hero.png
image-sm: /assets/img/hero.png
---
```

Available categories (match existing `_categories/` pages): `Programming`, `Cloud`, `Gaming`.

## Writing Conventions

- Body text is Markdown with Liquid extensions
- Code blocks use Jekyll's `{% highlight lang %}...{% endhighlight %}` tag (not fenced backticks) for syntax highlighting via Rouge
- External links use `{:target="_blank"}` attribute
- Images are embedded with Liquid/Markdown and styled inline:
  ```markdown
  [![alt](/assets/img/captures/foo.jpg){:style="width:80%; display:block; margin-left:auto; margin-right:auto;"}](/assets/img/captures/foo.jpg){:target="_blank"}
  ```
- Internal cross-links use `{% link _posts/YYYY-MM-DD-slug.md %}` to avoid broken URLs

## Plugins

| Plugin | Purpose |
|---|---|
| `jekyll-paginate` | Homepage pagination (5 posts/page) |
| `jekyll-sitemap` | Auto-generated sitemap.xml |
| `jekyll-feed` | RSS/Atom feed |
| `jekyll-youtube` | `{% youtube VIDEO_ID %}` shortcode |
| `octopress-autoprefixer` | CSS vendor prefixing |

## Configuration Notes

- `_config.yml` is production config — do not commit secrets or toggle analytics/comments off here
- `_draft.yml` sets `google_analytics: false` and `comments: false` for local work; use it with `--config _config.yml,_draft.yml`
- `_site/` is generated output — never edit files there directly
- `_screenshots/` and `docs/` are excluded from the Jekyll build

## Sass / Styling

- Source files live in `_sass/`
- Output is compressed (`sass.style: compressed` in `_config.yml`)
- Theme colour variable is `$color-alpha` — used for links and accents

## Assets

- Hero images go in `assets/img/` — provide both `image:` and `image-sm:` front matter keys pointing to the same or a smaller version
- Captured screenshots go in `assets/img/captures/`
- No image processing pipeline — resize/optimise images before committing

## No Formal Tests

There is no test suite. Verify changes by running `bundle exec jekyll serve` and checking locally before pushing.