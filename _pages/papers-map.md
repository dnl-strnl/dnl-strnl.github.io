---
title: "Papers"
permalink: /papers/map/
author_profile: false
classes: wide
layout: single
header:
  og_image: /assets/images/papers-map.png
---

{% include papers-graph-style.html %}
<style>
/* The map is the page: a fixed full-viewport canvas under the masthead, with the caption floating on top of it. */
.page__title { display: none; }
#papers-graph { position: fixed; inset: 0; z-index: 0; }
.page__footer { display: none; }
#main { max-width: 100%; padding-left: 1.5em; }
#main .page { float: none; width: 100%; padding: 0; }
.page__title, .page__content { position: relative; z-index: 1; pointer-events: none; }
.page__content a { pointer-events: auto; }
#papers-graph .area { font-size: 13px; }
#papers-info, .papers-map__src { position: fixed; bottom: 1em; margin: 0; font-size: 0.75em; opacity: 0.8; }
#papers-info { left: 1.5em; right: 14em; pointer-events: none; }
.papers-map__src { right: 1.5em; z-index: 1; }
.papers-map__src a, .papers-map__src a:visited { color: inherit; text-decoration: none; }
</style>

<div id="papers-graph" data-poster data-index="{{ '/assets/js/papers-index.json' | relative_url }}"></div>
<p id="papers-info"></p>
<p class="papers-map__src"><a href="{{ '/papers/' | relative_url }}">{{ site.url | split: '//' | last }}/papers</a></p>

<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<script src="{{ '/assets/js/papers-graph.js' | relative_url }}"></script>
