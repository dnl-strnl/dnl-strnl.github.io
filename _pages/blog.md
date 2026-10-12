---
title: "Blog"
permalink: /blog/
author_profile: true
layout: single
---

{% assign posts = site.categories.blog %}
{% for post in posts %}
  <h2><a href="{{ post.url }}">{{ post.title }}</a></h2>
  <p>{{ post.excerpt }}</p>
{% endfor %}
