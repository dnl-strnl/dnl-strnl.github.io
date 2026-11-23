---
title: "Blog"
permalink: /blog/
author_profile: true
layout: single
---

<style>
/* Every tag as a chip; they wrap onto as many rows as they need. */
#blog-tags { display: flex; flex-wrap: wrap; gap: 0.4em; min-height: 1.7em; }
#blog-tags button { flex: none; display: inline-flex; align-items: center; gap: 0.5em; margin: 0; padding: 0.2em 0.8em; font: inherit; font-size: 0.7em; white-space: nowrap; color: inherit; background: transparent; border: 1px solid rgba(128, 128, 128, 0.3); border-radius: 1em; cursor: pointer; }
#blog-tags button:hover { border-color: currentColor; }
#blog-tags button.on { background: rgba(128, 128, 128, 0.25); border-color: currentColor; }
#blog-tags small { opacity: 0.5; }
</style>

<div id="blog-tags"></div>

{% assign posts = site.categories.blog %}
{% for post in posts %}
<div class="blog-post" data-tags="{{ post.tags | join: ' ' }}">
  <h2><a href="{{ post.url }}">{{ post.title }}</a></h2>
  <p>{{ post.excerpt }}</p>
</div>
{% endfor %}

<script src="{{ '/assets/js/blog-tags.js' | relative_url }}"></script>
