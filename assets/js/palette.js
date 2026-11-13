// Command palette (Cmd/Ctrl+K). Fuzzy-searches pages, post titles, post tags,
// post text, and every outbound link, using the index Jekyll builds at
// palette-index.json. A `#tag` in the query narrows it to posts with that tag.
// The index is fetched on first open, so pages that never open it pay nothing.
(function () {
  const indexUrl = document.currentScript.dataset.index;
  const siteHost = document.currentScript.dataset.siteHost;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const MAX_RESULTS = 12;
  const KINDS = { page: 'Page', post: 'Post', tag: 'Tag', link: 'Link' };

  let items = null;
  let results = [];
  let active = 0;
  let overlay, input, list;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  // Each link arrives as the raw HTML between `href="` and `</a>`.
  function parseLink(fragment, post) {
    const quote = fragment.indexOf('"');
    const url = fragment.slice(0, quote).replace(/&amp;/g, '&');
    let host;
    try { host = new URL(url).host.replace(/^www\./, ''); } catch (e) { return null; }
    if (host === siteHost) return null;
    const dom = new DOMParser().parseFromString(fragment.slice(fragment.indexOf('>', quote) + 1), 'text/html');
    const label = dom.body.textContent.trim();
    return { kind: 'link', title: label || url, url: url, sub: host + ' · in ' + post.title, extra: url };
  }

  function build(index) {
    const out = [];
    const seen = new Set();
    index.pages.filter(Boolean).forEach(function (p) {
      out.push({ kind: 'page', title: p.title, url: p.url, sub: '' });
    });
    const tagCounts = new Map();
    index.posts.filter(Boolean).forEach(function (p) {
      const tags = p.tags || [];
      const sub = [p.date].concat(tags.map(function (t) { return '#' + t; })).join(' · ');
      out.push({ kind: 'post', title: p.title, url: p.url, sub: sub, tags: tags, extra: tags.join(' '), text: p.text, lower: p.text.toLowerCase() });
      tags.forEach(function (t) { tagCounts.set(t, (tagCounts.get(t) || 0) + 1); });
    });
    // A tag row doesn't navigate; picking it rewrites the query to `#tag`.
    Array.from(tagCounts.keys()).sort().forEach(function (t) {
      const n = tagCounts.get(t);
      out.push({ kind: 'tag', title: '#' + t, url: '#', sub: n + (n === 1 ? ' post' : ' posts') });
    });
    index.posts.filter(Boolean).forEach(function (p) {
      p.links.filter(Boolean).forEach(function (fragment) {
        const link = parseLink(fragment, p);
        if (!link || seen.has(link.url)) return;
        seen.add(link.url);
        out.push(link);
      });
    });
    return out;
  }

  // Score one query token against a string: substring hits beat in-order
  // character hits, and hits at the start of a word beat hits inside one.
  function scoreToken(token, text) {
    const at = text.indexOf(token);
    if (at >= 0) return 100 - Math.min(at, 40) + (at === 0 || /\W/.test(text[at - 1]) ? 30 : 0);
    // Typo tolerance: the characters in order, with at most as many skipped
    // characters as the token is long. Scores below a hit in a post's text.
    if (token.length < 3) return 0;
    let best = 0;
    for (let start = text.indexOf(token[0]); start >= 0; start = text.indexOf(token[0], start + 1)) {
      let pos = start, gaps = 0;
      for (let i = 1; i < token.length && pos >= 0 && gaps <= token.length; i++) {
        const next = text.indexOf(token[i], pos + 1);
        gaps += next - pos - 1;
        pos = next;
      }
      if (pos >= 0 && gaps <= token.length) best = Math.max(best, 9 - Math.min(gaps, 8));
    }
    return best;
  }

  function scoreAll(tokens, text) {
    let total = 0;
    for (let i = 0; i < tokens.length; i++) {
      const s = scoreToken(tokens[i], text);
      if (!s) return 0;
      total += s;
    }
    return total;
  }

  function snippet(item, token) {
    const at = item.lower.indexOf(token);
    const start = Math.max(0, at - 40);
    return (start ? '…' : '') + item.text.slice(start, at + 80).trim() + '…';
  }

  function search(query) {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) {
      return items.filter(function (it) { return it.kind === 'page' || it.kind === 'post'; })
        .map(function (it) { return { item: it, sub: it.sub }; });
    }
    // `#tag` tokens keep only posts carrying a tag with that prefix; whatever
    // else was typed is then scored against those posts as usual.
    const isFilter = function (t) { return t.length > 1 && t[0] === '#'; };
    const filters = tokens.filter(isFilter).map(function (t) { return t.slice(1); });
    const words = tokens.filter(function (t) { return !isFilter(t); });
    const hits = [];
    items.forEach(function (it) {
      if (filters.length && !(it.kind === 'post' && filters.every(function (f) {
        return it.tags.some(function (tag) { return tag.indexOf(f) === 0; });
      }))) return;
      const haystack = (it.title + ' ' + (it.extra || '')).toLowerCase();
      let score = words.length ? scoreAll(words, haystack) : 1;
      let sub = it.sub;
      // Links are the long tail; keep them below an equally good post or page.
      if (score && it.kind !== 'link') score += 20;
      if (!score && it.kind === 'post' && words.every(function (t) { return it.lower.includes(t); })) {
        score = 10;
        sub = snippet(it, words[0]);
      }
      if (score) hits.push({ item: it, sub: sub, score: score });
    });
    return hits.sort(function (a, b) { return b.score - a.score; }).slice(0, MAX_RESULTS);
  }

  function setActive(i) {
    active = Math.max(0, Math.min(i, results.length - 1));
    Array.prototype.forEach.call(list.children, function (row, n) {
      row.classList.toggle('active', n === active);
    });
    if (list.children[active]) list.children[active].scrollIntoView({ block: 'nearest' });
  }

  function render() {
    list.textContent = '';
    if (!items) {
      list.appendChild(el('li', 'palette__empty', 'Loading…'));
      return;
    }
    results = search(input.value);
    if (!results.length) list.appendChild(el('li', 'palette__empty', 'Nothing matches.'));
    results.forEach(function (r, i) {
      const row = el('li');
      const a = el('a', 'palette__row');
      a.href = r.item.url;
      if (r.item.kind === 'link') { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      if (r.item.kind === 'tag') {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          input.value = r.item.title + ' ';
          render();
          input.focus();
        });
      }
      const main = el('span', 'palette__main');
      main.appendChild(el('span', 'palette__title', r.item.title));
      if (r.sub) main.appendChild(el('span', 'palette__sub', r.sub));
      a.appendChild(main);
      a.appendChild(el('span', 'palette__kind', KINDS[r.item.kind]));
      row.appendChild(a);
      row.addEventListener('mousemove', function () { if (active !== i) setActive(i); });
      list.appendChild(row);
    });
    setActive(0);
  }

  function create() {
    overlay = el('div', 'palette');
    const box = el('div', 'palette__box');
    input = el('input', 'palette__input');
    input.type = 'text';
    input.placeholder = 'Search posts, pages, links, and #tags…';
    input.setAttribute('aria-label', 'Search');
    input.autocomplete = 'off';
    input.spellcheck = false;
    list = el('ul', 'palette__list');
    box.appendChild(input);
    box.appendChild(list);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    input.addEventListener('input', render);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
    list.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter' && results[active]) { e.preventDefault(); list.children[active].firstChild.click(); }
    });
  }

  function open() {
    if (!overlay) create();
    overlay.classList.add('open');
    input.value = '';
    render();
    input.focus();
    if (items) return;
    fetch(indexUrl)
      .then(function (res) { return res.json(); })
      .then(function (index) { items = build(index); render(); })
      .catch(function () {
        list.textContent = '';
        list.appendChild(el('li', 'palette__empty', 'Search index failed to load.'));
      });
  }

  function close() {
    if (overlay) overlay.classList.remove('open');
  }

  function isOpen() {
    return overlay && overlay.classList.contains('open');
  }

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (isOpen()) close(); else open();
    } else if (e.key === 'Escape' && isOpen()) {
      close();
    }
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-palette-open]')) return;
    e.preventDefault();
    open();
  });

  // A masthead entry, so the palette is reachable without a keyboard. It is
  // added as a regular nav item so the theme's greedy nav can collapse it.
  const nav = document.querySelector('.greedy-nav .visible-links');
  if (nav) {
    const item = el('li', 'masthead__menu-item');
    const a = el('a', 'palette__toggle');
    a.href = '#';
    a.setAttribute('data-palette-open', '');
    a.setAttribute('aria-label', 'Search');
    const icon = el('i', 'fas fa-search');
    icon.setAttribute('aria-hidden', 'true');
    a.appendChild(icon);
    a.appendChild(el('span', 'palette__hint', isMac ? '⌘K' : 'Ctrl K'));
    item.appendChild(a);
    nav.appendChild(item);
  }
})();
