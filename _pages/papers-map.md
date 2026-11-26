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
.page__content a, .page__content button { pointer-events: auto; }
#papers-graph .area { font-size: 13px; }
#papers-info, .papers-map__src { position: fixed; bottom: 1em; margin: 0; font-size: 0.75em; opacity: 0.8; }
#papers-info { left: 1.5em; right: 14em; pointer-events: none; }
.papers-map__src { right: 1.5em; z-index: 1; }
/* The rainbow dot sits in the top right, just under the masthead (80px, as papers-graph.js allows for). */
.papers-map__mesh { position: fixed; top: calc(80px + 1em); right: 1.5em; z-index: 1; margin: 0; line-height: 0; }
/* Four arrows pointing in: back to /papers/, as Esc is. */
.papers-map__src { line-height: 0; }
.papers-map__src a, .papers-map__src a:visited { color: gray; opacity: 0.5; }
.papers-map__src a:hover { color: gray; opacity: 1; }
.papers-map__src svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
</style>

<div id="papers-graph" data-poster data-index="{{ '/assets/js/papers-index.json' | relative_url }}"></div>
<p id="papers-info"></p>
<p class="papers-map__mesh">{% include papers-mesh.html %}</p>
<p class="papers-map__src"><a class="papers__carry" href="{{ '/papers/' | relative_url }}" title="Exit full screen (Esc)" aria-label="Exit full screen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l6 6M9 4v5H4M21 3l-6 6M15 4v5h5M3 21l6-6M4 15h5v5M21 21l-6-6M20 15h-5v5"/></svg></a></p>
<script>
document.addEventListener('keydown', function (ev) {
  if (ev.key !== 'Escape' || ev.defaultPrevented || ev.target.closest('input, textarea, [role="dialog"]')) return;
  location.href = document.querySelector('.papers-map__src a').href;
});
</script>

<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<script src="{{ '/assets/js/papers-graph.js' | relative_url }}"></script>
