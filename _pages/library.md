---
title: "Library"
permalink: /library/
author_profile: false
classes: wide
layout: single
---

<style>
.library h2 { display: flex; align-items: baseline; gap: 0.6em; margin: 2em 0 1em; padding-bottom: 0.4em; border-bottom: 1px solid rgba(128, 128, 128, 0.3); font-size: 1em; letter-spacing: 0.08em; text-transform: uppercase; }
.library h2 small { font-size: 0.75em; font-weight: 400; opacity: 0.5; }
.library a { text-decoration: none; }

/* Threads: a thought on the left of a colored rule (each thread has its own color, --thread), the works it draws on underneath. */
.thread { margin: 0 0 1.5em; padding: 0.2em 0 0.2em 1.1em; border-left: 3px solid var(--thread, #8f80dc); scroll-margin-top: 5em; }
.thread:target { background: color-mix(in srgb, var(--thread, #8f80dc) 10%, transparent); }
.thread__title { display: block; font-weight: 600; }
.thread__thought { font-size: 0.85em; opacity: 0.85; }
.thread__thought p { margin: 0.3em 0 0.8em; }
.thread__refs { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.8em; }
.thread__refs a, .thread__refs a:visited { color: inherit; font-size: 0.7em; }
.thread__refs a:hover { color: var(--thread, #8f80dc); }
.thread__refs img { display: block; height: 72px; width: auto; filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.5)); transition: transform 0.15s; }
.thread__refs a:hover img { transform: translateY(-2px); }
.thread__paper { padding: 0.3em 0.7em; border: 1px solid rgba(128, 128, 128, 0.3); border-radius: 6px; }

/* Shelves: every cover stands on the same baseline whatever its proportions, and its shadow follows
   the image's alpha, so a transparent PNG keeps its own outline. */
.shelf { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 2em 1.5em; }
.book { scroll-margin-top: 5em; }
.book__link, .book__link:visited { display: block; color: inherit; }
.book__cover { display: flex; align-items: flex-end; justify-content: center; height: 200px; margin-bottom: 0.8em; }
.book__cover img { max-width: 100%; max-height: 100%; filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.55)); transition: transform 0.15s, filter 0.15s; }
.book__link:hover .book__cover > *, .book__link:focus-visible .book__cover > * { transform: translateY(-4px); }
.book__link:hover .book__cover img { filter: drop-shadow(0 12px 16px rgba(0, 0, 0, 0.6)); }
.book__blank { display: flex; align-items: center; width: 133px; max-width: 100%; height: 100%; padding: 0.8em; font-size: 0.7em; font-weight: 600; line-height: 1.3; border: 1px solid rgba(128, 128, 128, 0.3); border-left-width: 5px; border-radius: 2px 4px 4px 2px; background: rgba(128, 128, 128, 0.12); transition: transform 0.15s; }
.book__title { display: block; font-size: 0.8em; font-weight: 600; line-height: 1.3; }
.book__link:hover .book__title { color: #8f80dc; }
.book__subtitle { display: block; font-size: 0.7em; line-height: 1.3; }
.book__author { display: block; margin-top: 0.2em; font-size: 0.7em; opacity: 0.6; }
.book__review { display: inline-block; margin-top: 0.5em; font-size: 0.6em; letter-spacing: 0.08em; text-transform: uppercase; color: #5ec4bd; }
.book__note { margin-top: 0.5em; font-size: 0.7em; line-height: 1.45; opacity: 0.8; }
.book__note p { margin: 0; }
.book:target .book__title { color: #8f80dc; }
.thread-chip, .thread-chip:visited { display: inline-block; margin: 0.5em 0.3em 0 0; padding: 0.1em 0.6em; font-size: 0.6em; color: var(--thread, #8f80dc); border: 1px solid color-mix(in srgb, var(--thread, #8f80dc) 50%, transparent); border-radius: 1em; }
.thread-chip:hover { color: var(--thread, #8f80dc); background: color-mix(in srgb, var(--thread, #8f80dc) 15%, transparent); }
.library__empty { font-size: 0.8em; opacity: 0.5; }
</style>

The books on my shelves, sorted by where I am with them: what I'm reading now, what I've finished, and what's still waiting its turn. Threads, at the top, each pin one idea to sources I'm drawing it from.

<div class="library">
{% if site.data.threads.size > 0 %}
<h2>Threads</h2>
{% assign thread_colors = "#ffd84d,#ff5fa2,#3fd9c4,#8f80dc" | split: "," %}
{% for thread in site.data.threads %}{% assign turn = forloop.index0 | modulo: thread_colors.size %}
<div class="thread" id="thread-{{ thread.id }}" style="--thread: {{ thread.color | default: thread_colors[turn] }}">
<span class="thread__title">{{ thread.title }}</span>
<div class="thread__thought">{{ thread.thought | markdownify }}</div>
<div class="thread__refs">
{% for ref in thread.refs %}
{% assign book = site.data.library | where: "id", ref | first %}
{% if book.cover %}<a href="#book-{{ book.id }}" title="{{ book.title | escape }}"><img src="{{ book.cover | relative_url }}" alt="{{ book.title | escape }}" loading="lazy"></a>
{% elsif book %}<a class="thread__paper" href="#book-{{ book.id }}">{{ book.title }}</a>
{% endif %}
{% endfor %}
</div>
</div>
{% endfor %}
{% endif %}

{% assign shelves = "reading|Currently reading,read|Read,queue|Reading list,reference|References" | split: "," %}
{% for shelf in shelves %}
{% assign parts = shelf | split: "|" %}
{% assign books = site.data.library | where: "status", parts[0] %}
{% unless parts[0] == "reading" %}{% assign books = books | sort_natural: "title" %}{% endunless %}
<h2 id="{{ parts[0] }}">{{ parts[1] }} <small>{{ books.size }}</small></h2>
{% if books.size == 0 %}<p class="library__empty">Nothing here right now.</p>{% endif %}
<div class="shelf">
{% for book in books %}
{% assign href = book.url %}
{% assign post = nil %}
{% if book.post %}{% assign post = site.posts | where: "slug", book.post | first %}{% endif %}
{% if post %}{% assign href = post.url | relative_url %}{% endif %}
<div class="book" id="book-{{ book.id }}">
{% if href %}<a class="book__link" href="{{ href }}">{% else %}<div class="book__link">{% endif %}
<span class="book__cover">{% if book.cover %}<img src="{{ book.cover | relative_url }}" alt="Cover of {{ book.title | escape }}" loading="lazy">{% else %}<span class="book__blank">{{ book.title }}</span>{% endif %}</span>
<span class="book__title">{{ book.title }}</span>
{% if book.subtitle %}<span class="book__subtitle">{{ book.subtitle }}</span>{% endif %}
<span class="book__author">{{ book.author }}{% if book.year %} · {{ book.year }}{% endif %}</span>
{% if post %}<span class="book__review">Review →</span>{% endif %}
{% if href %}</a>{% else %}</div>{% endif %}
{% if book.note %}<div class="book__note">{{ book.note | markdownify }}</div>{% endif %}
{% include thread-chips.html id=book.id %}
</div>
{% endfor %}
</div>
{% endfor %}
</div>
