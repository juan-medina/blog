# GitHub Copilot Instructions

This is **juan-medina.com**, Juan Medina's personal blog. A static site built with **Jekyll 3.8**, Ruby, Sass, and the Trophy Jekyll theme. Hosted on GitHub Pages.

## What This Repo Is

- A developer personal blog covering Programming, Cloud, and Gaming topics
- Posts are Markdown files in `_posts/`, one file per post
- No backend, no database — pure static site output to `_site/`

## Post Front Matter

Every post needs this exact front matter shape:

```yaml
---
layout: post
title: Post Title Here
date: YYYY-MM-DD HH:MM:SS
author: Juan Medina
comments: true
categories: [Programming]
image: /assets/img/filename.png
image-sm: /assets/img/filename.png
---
```

Valid categories are: `Programming`, `Cloud`, `Gaming`. Multiple categories: `[Cloud, Programming]`.

## Liquid / Jekyll Patterns

Use `{% highlight lang %}` blocks, not fenced backticks, for all code samples:

```liquid
{% highlight shell %}
bundle exec jekyll serve
{% endhighlight %}
```

Cross-link other posts using `{% link %}`:

```liquid
[previous article]({{ site.baseurl }}{% link _posts/2020-01-11-slug.md %}){:target="_blank"}
```

All external links need `{:target="_blank"}`.

Image embeds:

```markdown
[![alt text](/assets/img/captures/foo.jpg){:style="width:80%; display:block; margin-left:auto; margin-right:auto;"}](/assets/img/captures/foo.jpg){:target="_blank"}
```

## File Naming

Posts: `_posts/YYYY-MM-DD-short-slug.md` — the slug becomes the URL path.

## Build

```shell
bundle install
bundle exec jekyll serve                                      # local preview
bundle exec jekyll serve --drafts --config _config.yml,_draft.yml  # with drafts
bundle exec jekyll build                                      # static output
```

## What Not to Do

- Do not edit files inside `_site/` — it is generated output
- Do not use fenced code blocks (` ``` `) in posts — use `{% highlight %}` tags
- Do not commit changes to `_config.yml` that disable analytics or comments — use `_draft.yml` locally for that
- Do not add new Jekyll plugins without updating both `Gemfile` and `_config.yml`
- Do not use internal `file://` links — always use `{% link %}` for cross-post references