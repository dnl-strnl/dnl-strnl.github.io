---
title: "Links"
permalink: /links/
author_profile: false
classes: wide
layout: single
---

<style>
/* The graph is the page: a fixed full-viewport canvas under the masthead, with the text floating on top of it. */
#links-graph { position: fixed; inset: 0; z-index: 0; }
.page__footer { display: none; }
#main { max-width: 100%; padding-left: 1.5em; }
#main .page { float: none; width: 100%; padding: 0; }
#links-graph svg { display: block; width: 100%; height: 100%; cursor: grab; }
#links-graph .edge { stroke: currentColor; stroke-opacity: 0.12; }
#links-graph .edge.sim { stroke-dasharray: 2 3; }
#links-graph .node { cursor: pointer; }
#links-graph .node text { fill: currentColor; font-size: 9px; pointer-events: none; opacity: 0; }
#links-graph .node.doc text { font-size: 11px; font-weight: 600; opacity: 0.9; }
#links-graph.zoomed .node text, #links-graph .node.lit text { opacity: 0.9; }
#links-graph .dim { opacity: 0.08; }
#links-graph .edge.lit { stroke-opacity: 0.6; }
#links-legend { position: fixed; left: 1.5em; bottom: 4.5em; display: flex; flex-wrap: wrap; gap: 0.25em 1.25em; font-size: 0.75em; pointer-events: none; }
#links-legend i { display: inline-block; width: 0.7em; height: 0.7em; border-radius: 50%; margin-right: 0.4em; }
#links-info { position: fixed; left: 1.5em; right: 1.5em; bottom: 1em; min-height: 3em; margin: 0; font-size: 0.75em; opacity: 0.8; overflow-wrap: anywhere; pointer-events: none; }
</style>

<div id="links-graph" data-site-host="{{ site.url | split: '//' | last }}"></div>
<div id="links-legend"></div>
<p id="links-info"></p>

<script type="application/json" id="links-data">
[{% for post in site.posts %}{"title": {{ post.title | jsonify }}, "url": {{ post.url | relative_url | jsonify }}, "kind": "post", "html": {{ post.content | jsonify | replace: '</', '<\/' }}},
{% endfor %}{% for p in site.pages %}{% if p.permalink == '/about/' or p.permalink == '/resume/' %}{"title": {{ p.title | jsonify }}, "url": {{ p.url | relative_url | jsonify }}, "kind": "page", "html": {{ p.content | markdownify | jsonify | replace: '</', '<\/' }}},
{% endif %}{% endfor %}null]
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<script src="{{ '/assets/js/links-graph.js' | relative_url }}"></script>
