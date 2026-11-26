---
title: "Papers"
permalink: /papers/
author_profile: true
classes: wide
layout: single
header:
  og_image: /assets/images/papers-map.png
---

<style>
/* The map: papers as dots, drawn together by what they cite and what they share. */
#papers-search, #papers-search:focus { width: 100%; margin: 0 0 0.8em; padding: 0.6em 0.9em; font-size: 0.8em; color: inherit; background: transparent; border: 1px solid rgba(128, 128, 128, 0.3); border-radius: 6px; box-shadow: none; outline: none; }
#papers-search:focus { border-color: #8f80dc; }
#papers-areas { display: flex; flex-wrap: wrap; gap: 0.4em; min-height: 1.7em; margin-top: 0.8em; }
#papers-areas button { flex: none; white-space: nowrap; }
#papers-areas button { display: inline-flex; align-items: center; gap: 0.5em; margin: 0; padding: 0.2em 0.8em; font: inherit; font-size: 0.7em; color: inherit; background: transparent; border: 1px solid rgba(128, 128, 128, 0.3); border-radius: 1em; cursor: pointer; }
#papers-areas button:hover { border-color: currentColor; }
#papers-areas button.on { background: rgba(128, 128, 128, 0.25); border-color: currentColor; }
#papers-areas i { width: 0.7em; height: 0.7em; border-radius: 50%; }
#papers-areas i.ring { background: transparent; border: 2px solid currentColor; }
#papers-areas small { opacity: 0.5; }
#papers-graph { position: relative; height: 640px; margin: 0.8em 0 0; border: 1px solid rgba(128, 128, 128, 0.3); border-radius: 8px; overflow: hidden; }
@media (max-width: 600px) { #papers-graph { height: 420px; } }
.papers__tools { position: absolute; top: 0.6em; right: 0.9em; line-height: 0; }
.papers__full, .papers__full:visited { position: absolute; bottom: 0.6em; right: 0.9em; font-size: 0.65em; letter-spacing: 0.08em; text-transform: uppercase; color: inherit; opacity: 0.5; }
.papers__full:hover { color: inherit; opacity: 1; }
#papers-info { min-height: 4.2em; margin: 0.7em 0 0; font-size: 0.7em; line-height: 1.5; opacity: 0.8; }

.papers__list > summary { margin-top: 1em; font-size: 0.8em; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; }
.papers__list > summary small { margin-left: 0.4em; font-weight: 400; opacity: 0.5; }
.papers h2 { display: flex; align-items: baseline; gap: 0.6em; margin: 1.5em 0 0.5em; padding-bottom: 0.4em; border-bottom: 1px solid rgba(128, 128, 128, 0.3); font-size: 1em; letter-spacing: 0.08em; text-transform: uppercase; }
.papers h2 small { font-size: 0.75em; font-weight: 400; opacity: 0.5; }
.papers a { text-decoration: none; }
.papers ul { margin: 0; padding: 0; list-style: none; }
.paper { padding: 0.7em 0; border-bottom: 1px solid rgba(128, 128, 128, 0.15); scroll-margin-top: 5em; }
.paper:last-child { border-bottom: 0; }
.paper__dot { display: inline-block; width: 0.55em; height: 0.55em; margin-right: 0.6em; border-radius: 50%; cursor: pointer; }
.paper__title { font-size: 0.85em; font-weight: 600; }
.paper__meta { display: block; margin-top: 0.15em; font-size: 0.7em; opacity: 0.6; }
/* The annotation reads as a margin note: indented behind a lavender rule. */
.paper__note { margin-top: 0.5em; padding-left: 0.9em; font-size: 0.75em; line-height: 1.5; opacity: 0.85; border-left: 2px solid rgba(143, 128, 220, 0.6); }
.paper__note p { margin: 0; }
.paper__post { display: inline-block; margin: 0.5em 0.6em 0 0; font-size: 0.6em; letter-spacing: 0.08em; text-transform: uppercase; color: #5ec4bd; }
.thread-chip, .thread-chip:visited { display: inline-block; margin: 0.5em 0.3em 0 0; padding: 0.1em 0.6em; font-size: 0.6em; color: var(--thread, #8f80dc); border: 1px solid color-mix(in srgb, var(--thread, #8f80dc) 50%, transparent); border-radius: 1em; }
.thread-chip:hover { color: var(--thread, #8f80dc); background: color-mix(in srgb, var(--thread, #8f80dc) 15%, transparent); }
.papers__empty { font-size: 0.8em; opacity: 0.5; }
</style>
{% include papers-graph-style.html %}

Papers I've read or am working through, as a map rather than a list. Lines join papers that cite each other or draw on the same references, and the colors are the clusters that fall out of that, which is roughly where my attention has been.

<div class="papers">
<input id="papers-search" type="search" placeholder="Search titles, abstracts, notes and references" aria-label="Search papers">
<div id="papers-graph" data-index="{{ '/assets/js/papers-index.json' | relative_url }}"><div class="papers__tools">{% include papers-mesh.html %}</div><a class="papers__full papers__carry" href="{{ '/papers/map/' | relative_url }}">Full screen</a></div>
<p id="papers-info"></p>
<div id="papers-areas"></div>

<details id="papers-list" class="papers__list"{% if site.data.papers.size < 30 %} open{% endif %}>
<summary>Papers <small>{{ site.data.papers.size }}</small></summary>
{% assign sections = "reading|Currently reading,read|Read,queue|Reading list" | split: "," %}
{% for section in sections %}
{% assign parts = section | split: "|" %}
{% assign papers = site.data.papers | where: "status", parts[0] %}
{% if papers.size > 0 %}
<section class="papers__section">
<h2 id="{{ parts[0] }}">{{ parts[1] }} <small>{{ papers.size }}</small></h2>
<ul>
{% for paper in papers %}
{% assign m = site.data.papers_meta.papers[paper.id] %}
{% assign authors = paper.authors %}
{% unless authors %}{% if m.authors.size > 3 %}{% assign authors = m.authors | first | append: " et al." %}{% else %}{% assign authors = m.authors | join: ", " %}{% endif %}{% endunless %}
{% assign venue = paper.venue | default: m.venue %}
{% assign year = paper.year | default: m.year %}
{% assign post = nil %}
{% if paper.post %}{% assign post = site.posts | where: "slug", paper.post | first %}{% endif %}
<li class="paper" id="paper-{{ paper.id }}">
<a class="paper__title" href="{{ paper.url }}">{{ paper.title | default: m.title | default: paper.url }}</a>
<span class="paper__meta">{{ authors }}{% if venue %} · {{ venue }}{% endif %}{% if year %} · {{ year }}{% endif %}</span>
{% if paper.note %}<div class="paper__note">{{ paper.note | markdownify }}</div>{% endif %}
{% if post %}<a class="paper__post" href="{{ post.url | relative_url }}">Write-up →</a>{% endif %}
{% include thread-chips.html id=paper.id %}
</li>
{% endfor %}
</ul>
</section>
{% endif %}
{% endfor %}
</details>
{% if site.data.papers.size == 0 %}<p class="papers__empty">Nothing logged yet.</p>{% endif %}
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<script src="{{ '/assets/js/papers-graph.js' | relative_url }}"></script>
