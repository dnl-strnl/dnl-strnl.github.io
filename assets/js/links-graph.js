// Link map for /links/. Reads the rendered HTML of every post and page (inlined
// as JSON by _pages/links.md), pulls out the outbound links, and lays them out
// so that links mentioned in similar contexts end up near each other.
(function () {
  const root = document.getElementById('links-graph');
  const info = document.getElementById('links-info');
  const docs = JSON.parse(document.getElementById('links-data').textContent).filter(Boolean);
  const siteHost = root.dataset.siteHost;

  const KINDS = {
    doc: { label: 'Post', color: '#ff4d94' },
    paper: { label: 'Paper', color: '#6aa2ff' },
    code: { label: 'Code', color: '#4be36a' },
    wiki: { label: 'Wikipedia', color: '#e6db5a' },
    web: { label: 'Elsewhere', color: '#ff9e3d' },
  };
  const LOCAL_HOST = /^(localhost|[\d.]+)(:\d+)?$/;
  const MEDIA = /\.(png|jpe?g|gif|svg|webp|mp4)$/i;
  const STOP = new Set(('the and for with that this from are was were has have had not but you your its their they ' +
    'them our can will would could should into over under than then also more most such which when what where while ' +
    'how who why does did been being both each any all one two out about just like only very because between after ' +
    'before these those there here some other www com org net html http https github arxiv abs doi wikipedia wiki docs').split(' '));

  function kindOf(host) {
    if (/arxiv\.org|doi\.org|wiley\.com|openreview\.net|acm\.org|ieee\.org/.test(host)) return 'paper';
    if (/github\.com|gitlab\.com/.test(host)) return 'code';
    if (/wikipedia\.org/.test(host)) return 'wiki';
    return 'web';
  }

  // "TorchServe docs" -> [torchserve, torch, serve, docs]
  function tokens(text) {
    const out = [];
    (text.match(/[A-Za-z][A-Za-z0-9]+/g) || []).forEach(function (word) {
      const parts = word.split(/(?<=[a-z])(?=[A-Z])/);
      (parts.length > 1 ? [word].concat(parts) : [word]).forEach(function (t) {
        t = t.toLowerCase();
        if (t.length > 2 && !STOP.has(t)) out.push(t);
      });
    });
    return out;
  }

  // ---- Extract links ------------------------------------------------------
  const docByPath = new Map(docs.map(function (d) { return [d.url, d]; }));
  const links = new Map(); // normalized url -> link node
  const edges = [];
  const seenEdge = new Set();
  const parser = new DOMParser();

  function addEdge(source, target, type, weight) {
    const key = source.id < target.id ? source.id + '|' + target.id : target.id + '|' + source.id;
    if (source === target || seenEdge.has(key)) return;
    seenEdge.add(key);
    edges.push({ source: source, target: target, type: type, weight: weight });
  }

  docs.forEach(function (doc) {
    doc.id = doc.url;
    doc.type = 'doc';
    doc.kind = 'doc';
    doc.label = doc.title;
    doc.href = doc.url;
  });

  docs.forEach(function (doc) {
    const dom = parser.parseFromString(doc.html, 'text/html');
    dom.querySelectorAll('a[href]').forEach(function (a) {
      let u;
      try { u = new URL(a.getAttribute('href'), location.origin + doc.url); } catch (e) { return; }
      if (!/^https?:$/.test(u.protocol) || LOCAL_HOST.test(u.host) || MEDIA.test(u.pathname)) return;

      const internal = u.host === location.host || u.host === siteHost;
      if (internal) {
        const other = docByPath.get(u.pathname);
        if (other) { addEdge(doc, other, 'ref', 1); return; }
        if (u.host === location.host && u.host !== siteHost) return;
        if (u.pathname === '/' || u.pathname.startsWith('/assets/')) return;
      }

      const id = u.host.replace(/^www\./, '') + u.pathname.replace(/\/$/, '') + u.search;
      let link = links.get(id);
      if (!link) {
        const text = a.textContent.trim().replace(/\s+/g, ' ');
        link = {
          id: id, type: 'link', kind: kindOf(u.host), href: u.href, count: 0, sources: [], tf: new Map(),
          label: text.length > 42 ? text.slice(0, 40) + '…' : text || u.host,
        };
        links.set(id, link);
      }
      link.count += 1;
      if (link.sources.indexOf(doc) < 0) link.sources.push(doc);
      addEdge(doc, link, 'cite', 1);

      // The link's own words count triple; the surrounding block supplies context.
      const block = a.closest('p, li, td, figcaption, blockquote, h1, h2, h3, h4, h5, h6');
      const own = tokens(a.textContent + ' ' + u.host + ' ' + decodeURIComponent(u.pathname));
      const bag = own.concat(own, own, block ? tokens(block.textContent) : []);
      bag.forEach(function (t) { link.tf.set(t, (link.tf.get(t) || 0) + 1); });
    });
  });

  // ---- Similarity between links (TF-IDF cosine) ---------------------------
  const linkList = Array.from(links.values());
  const df = new Map();
  linkList.forEach(function (l) {
    l.tf.forEach(function (_, t) { df.set(t, (df.get(t) || 0) + 1); });
  });
  linkList.forEach(function (l) {
    let norm = 0;
    l.vec = new Map();
    l.tf.forEach(function (n, t) {
      const d = df.get(t);
      if (d < 2 || d > linkList.length / 2) return;
      const w = (1 + Math.log(n)) * Math.log(linkList.length / d);
      l.vec.set(t, w);
      norm += w * w;
    });
    l.norm = Math.sqrt(norm) || 1;
  });
  function cosine(a, b) {
    let dot = 0;
    a.vec.forEach(function (w, t) { const v = b.vec.get(t); if (v) dot += w * v; });
    return dot / (a.norm * b.norm);
  }
  const NEIGHBORS = 3, MIN_SIM = 0.15;
  linkList.forEach(function (a) {
    linkList
      .filter(function (b) { return b !== a; })
      .map(function (b) { return { b: b, sim: cosine(a, b) }; })
      .filter(function (s) { return s.sim >= MIN_SIM; })
      .sort(function (x, y) { return y.sim - x.sim; })
      .slice(0, NEIGHBORS)
      .forEach(function (s) { addEdge(a, s.b, 'sim', s.sim); });
  });

  // ---- Draw ---------------------------------------------------------------
  const usedDocs = docs.filter(function (d) {
    return edges.some(function (e) { return e.source === d || e.target === d; });
  });
  const nodes = usedDocs.concat(linkList);
  const neighbors = new Map(nodes.map(function (n) { return [n, new Set([n])]; }));
  edges.forEach(function (e) { neighbors.get(e.source).add(e.target); neighbors.get(e.target).add(e.source); });

  const width = root.clientWidth, height = root.clientHeight;
  const svg = d3.select(root).append('svg').attr('viewBox', [0, 0, width, height]);
  const view = svg.append('g');

  const edge = view.append('g').selectAll('line').data(edges).join('line')
    .attr('class', function (e) { return 'edge ' + e.type; });

  const radius = function (n) { return n.type === 'doc' ? 8 : 3.5 + Math.min(n.count, 4); };
  const node = view.append('g').selectAll('g').data(nodes).join('g')
    .attr('class', function (n) { return 'node ' + n.type; });
  node.append('circle').attr('r', radius).attr('fill', function (n) { return KINDS[n.kind].color; });
  const label = node.append('text').attr('dy', '0.32em')
    .text(function (n) { return n.label; });

  // ---- Labels -------------------------------------------------------------
  // Labels are placed greedily, most important first. Each takes the first of
  // four spots around its node that is clear of the circles and of the labels
  // already placed, and stays hidden if none is. Text grows more slowly than
  // the graph when zooming, so zooming in makes room for more labels.
  const PLACES = [
    { anchor: 'start', dx: 1, dy: 0 }, { anchor: 'end', dx: -1, dy: 0 },
    { anchor: 'middle', dx: 0, dy: 1 }, { anchor: 'middle', dx: 0, dy: -1 },
  ];
  const LABEL_ZOOM = 1.6; // link labels only show past this zoom, or on hover
  const byRank = nodes.slice().sort(function (a, b) {
    return (b.type === 'doc') - (a.type === 'doc') || (b.count || 0) - (a.count || 0);
  });
  let zoom = 1, hovered = null;

  function measure() {
    label.each(function (n) { const box = this.getBBox(); n.tw = box.width; n.th = box.height; });
  }
  function hits(a, b) { return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1; }

  function layoutLabels() {
    const s = 1 / Math.sqrt(zoom), pad = 2 * s;
    const near = hovered && neighbors.get(hovered);
    const rank = function (n) { return n === hovered ? 0 : near.has(n) ? 1 : 2; };
    const order = near ? byRank.slice().sort(function (a, b) { return rank(a) - rank(b); }) : byRank;
    // Dimmed circles are all but invisible, so labels may run over them.
    const circles = nodes.filter(function (n) { return !near || near.has(n); }).map(function (n) {
      const r = radius(n);
      return { x0: n.x - r, x1: n.x + r, y0: n.y - r, y1: n.y + r };
    });
    const placed = [];
    const clear = function (box, taken) { return !taken.some(function (t) { return hits(box, t); }); };

    order.forEach(function (n) {
      n.place = null;
      if (n.type !== 'doc' && zoom <= LABEL_ZOOM && !(near && near.has(n))) return;
      const w = n.tw * s, h = n.th * s, gap = radius(n) + 3;
      const spots = PLACES.map(function (p) {
        const cx = n.x + p.dx * (gap + w / 2), cy = n.y + p.dy * (gap + h / 2);
        return { anchor: p.anchor, x: p.dx * gap, y: p.dy * (gap + h / 2),
          x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
      });
      let spot = spots.find(function (b) { return clear(b, circles) && clear(b, placed); });
      // Post titles and the hovered label always show, over circles if they must.
      if (!spot && (n.type === 'doc' || n === hovered)) {
        spot = spots.find(function (b) { return clear(b, placed); }) || spots[0];
      }
      if (!spot) return;
      placed.push({ x0: spot.x0 - pad, x1: spot.x1 + pad, y0: spot.y0 - pad, y1: spot.y1 + pad });
      n.place = spot;
    });

    label.classed('show', function (n) { return n.place; })
      .filter(function (n) { return n.place; })
      .attr('text-anchor', function (n) { return n.place.anchor; })
      .attr('transform', function (n) { return 'translate(' + n.place.x + ',' + n.place.y + ') scale(' + s + ')'; });
  }

  measure();
  if (document.fonts) document.fonts.ready.then(function () { measure(); layoutLabels(); });

  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(edges)
      .distance(function (e) { return e.type === 'sim' ? 40 : e.type === 'ref' ? 180 : 80; })
      .strength(function (e) { return e.type === 'sim' ? Math.min(1, e.weight * 1.5) : e.type === 'ref' ? 0.1 : 0.35; }))
    .force('charge', d3.forceManyBody().strength(function (n) { return n.type === 'doc' ? -520 : -130; }))
    .force('collide', d3.forceCollide().radius(function (n) { return radius(n) + 4; }))
    .force('x', d3.forceX(width / 2).strength(0.025))
    .force('y', d3.forceY(height / 2).strength(0.045))
    .on('tick', function () {
      edge.attr('x1', function (e) { return e.source.x; }).attr('y1', function (e) { return e.source.y; })
        .attr('x2', function (e) { return e.target.x; }).attr('y2', function (e) { return e.target.y; });
      node.attr('transform', function (n) { return 'translate(' + n.x + ',' + n.y + ')'; });
      layoutLabels();
    });

  svg.call(d3.zoom().scaleExtent([0.4, 6]).on('zoom', function (ev) {
    view.attr('transform', ev.transform);
    if (ev.transform.k !== zoom) { zoom = ev.transform.k; layoutLabels(); }
  }));

  window.addEventListener('resize', function () {
    svg.attr('viewBox', [0, 0, root.clientWidth, root.clientHeight]);
  });

  node.call(d3.drag()
    .on('start', function (ev, n) { if (!ev.active) sim.alphaTarget(0.3).restart(); n.fx = n.x; n.fy = n.y; })
    .on('drag', function (ev, n) { n.fx = ev.x; n.fy = ev.y; })
    .on('end', function (ev, n) { if (!ev.active) sim.alphaTarget(0); n.fx = null; n.fy = null; }));

  function describe(n) {
    info.textContent = '';
    const strong = document.createElement('strong');
    strong.textContent = n.label;
    info.append(strong);
    if (n.type === 'doc') {
      info.append(' — ' + (neighbors.get(n).size - 1) + ' connections');
    } else {
      info.append(' — ' + n.href, document.createElement('br'),
        'Linked from: ' + n.sources.map(function (d) { return d.title; }).join(', '));
    }
  }

  node
    .on('mouseenter', function (ev, n) {
      const near = neighbors.get(n);
      node.classed('dim', function (m) { return !near.has(m); });
      edge.classed('dim', function (e) { return e.source !== n && e.target !== n; })
        .classed('lit', function (e) { return e.source === n || e.target === n; });
      hovered = n;
      layoutLabels();
      describe(n);
    })
    .on('mouseleave', function () {
      node.classed('dim', false);
      edge.classed('dim', false).classed('lit', false);
      hovered = null;
      layoutLabels();
    })
    .on('click', function (ev, n) {
      if (n.type === 'doc') location.href = n.href;
      else window.open(n.href, '_blank', 'noopener');
    });

  const legend = document.getElementById('links-legend');
  Object.keys(KINDS).forEach(function (k) {
    const item = document.createElement('span');
    const dot = document.createElement('i');
    dot.style.background = KINDS[k].color;
    item.append(dot, KINDS[k].label);
    legend.append(item);
  });
  info.textContent = linkList.length + ' links across ' + usedDocs.length + ' posts and pages.';
})();
