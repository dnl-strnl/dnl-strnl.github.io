// Paper map for /papers/. Reads papers-index.json (the papers in papers.yml plus
// what _scripts/fetch-papers.rb found on OpenAlex) and lays them out so that
// papers which cite each other, share references, or use the same vocabulary
// end up together. The groups that form around papers given an `area` are the focus areas.
(function () {
  const root = document.getElementById('papers-graph');
  const info = document.getElementById('papers-info');
  const areasEl = document.getElementById('papers-areas');
  const search = document.getElementById('papers-search');
  // /papers/map/ is the map alone, full-screen: no search, chips or list, and fewer paper labels.
  const poster = 'poster' in root.dataset;

  const COLORS = ['#6aa2ff', '#ff4d94', '#4be36a', '#e6db5a', '#ff9e3d', '#d36bff', '#3fd0d0', '#d98a5c',
    '#b9a3ff', '#ff8a80', '#a3e635', '#9be8ff', '#f48fb1', '#ffd1a1', '#7ee0a8', '#c0ca33',
    '#ff5252', '#00b8a9', '#b08968', '#7c9cff',
    '#e57373', '#64b5f6', '#81c784', '#ffb74d', '#ba68c8', '#4dd0e1', '#dce775', '#a1887f', '#f06292', '#90a4ae'];
  const LOOSE = '#8d8085'; // papers outside every area
  const STOP = new Set(('the and for with that this from are was were has have had not but you your its their they ' +
    'them our can will would could should into over under than then also more most such which when what where while ' +
    'how who why does did been being both each any all one two out about just like only very because between after ' +
    'before these those there here some other paper propose proposed present presents show shows shown result results ' +
    'method methods approach approaches using used use based novel new via towards may many several well however thus ' +
    'able across without within among often work works existing recent recently previous state art demonstrate ' +
    'achieve achieves achieved performance significantly problem problems number large high simple general abstract ' +
    'code available publicly released github com https http www experiments extensive datasets dataset tasks task').split(' '));

  function words(text) {
    return (String(text || '').toLowerCase().replace(/https?:\/\/\S+/g, ' ').match(/[a-z][a-z0-9]+/g) || []);
  }
  function tokens(text) {
    return words(text).filter(function (t) { return t.length > 2 && !STOP.has(t); });
  }
  function count(map, key, by) { map.set(key, (map.get(key) || 0) + (by || 1)); }

  fetch(root.dataset.index)
    .then(function (res) { return res.json(); })
    .then(draw)
    .catch(function () { info.textContent = 'The paper map failed to load.'; });

  function draw(index) {
    const papers = index.papers.filter(Boolean);
    const works = index.works || {};
    if (papers.length < 2) { root.hidden = true; if (search) search.hidden = true; return; }

    // ---- Citations inside the library ---------------------------------------
    // A reference counts as a citation of a library paper if it is the same OpenAlex
    // work, or carries the same title (preprint and published version are often two works).
    const norm = function (title) { return words(title).join(' '); };
    const byWork = new Map(), byTitle = new Map();
    papers.forEach(function (p) {
      p.refs = p.refs || [];
      p.refSet = new Set(p.refs);
      p.authors = Array.isArray(p.authors) ? p.authors : p.authors ? [p.authors] : [];
      if (p.openalex) byWork.set(p.openalex, p);
      byTitle.set(norm(p.title), p);
    });
    papers.forEach(function (p) {
      p.cites = new Set();
      p.citedBy = new Set();
    });
    papers.forEach(function (p) {
      p.refs.forEach(function (ref) {
        const other = byWork.get(ref) || byTitle.get(norm(works[ref]));
        if (other && other !== p) { p.cites.add(other); other.citedBy.add(p); }
      });
    });

    // ---- Similarity (TF-IDF cosine over title, abstract and note) -----------
    const df = new Map();
    papers.forEach(function (p) {
      const title = tokens(p.title);
      p.tf = new Map();
      title.concat(title, title, tokens(p.label), tokens(p.abstract), tokens(p.note))
        .forEach(function (t) { count(p.tf, t); });
      p.tf.forEach(function (_, t) { count(df, t); });
    });
    papers.forEach(function (p) {
      let sum = 0;
      p.vec = new Map();
      p.tf.forEach(function (n, t) {
        const d = df.get(t);
        if (d < 2 || d > papers.length / 2) return;
        const w = (1 + Math.log(n)) * Math.log(papers.length / d);
        p.vec.set(t, w);
        sum += w * w;
      });
      p.norm = Math.sqrt(sum) || 1;
    });
    function cosine(a, b) {
      let dot = 0;
      a.vec.forEach(function (w, t) { const v = b.vec.get(t); if (v) dot += w * v; });
      return dot / (a.norm * b.norm);
    }
    // Share of two reference lists that is common to both.
    function coupling(a, b) {
      if (!a.refs.length || !b.refs.length) return 0;
      let shared = 0;
      a.refs.forEach(function (ref) { if (b.refSet.has(ref)) shared += 1; });
      return shared / Math.sqrt(a.refs.length * b.refs.length);
    }

    // ---- Edges --------------------------------------------------------------
    const NEIGHBORS = 3, MIN_NEAR = 0.12, CITE = 0.5, MIN_TIE = 0.08;
    const edges = [], seenEdge = new Set();
    const tie = papers.map(function () { return new Map(); }); // every weighted pair; the areas are found in this
    const nearest = papers.map(function () { return []; });
    function addEdge(source, target, type, weight) {
      const key = source.id < target.id ? source.id + '|' + target.id : target.id + '|' + source.id;
      if (seenEdge.has(key)) return;
      seenEdge.add(key);
      edges.push({ source: source, target: target, type: type, weight: weight });
    }
    papers.forEach(function (a, i) {
      a.index = i;
      for (let j = i + 1; j < papers.length; j++) {
        const b = papers[j];
        const cites = a.cites.has(b) || b.cites.has(a);
        const near = 2 * coupling(a, b) + cosine(a, b);
        const w = near + (cites ? CITE : 0);
        if (w >= MIN_TIE) { tie[i].set(j, w); tie[j].set(i, w); }
        if (cites) addEdge(a.cites.has(b) ? a : b, a.cites.has(b) ? b : a, 'cite', w);
        else if (near >= MIN_NEAR) { nearest[i].push({ other: b, near: near }); nearest[j].push({ other: a, near: near }); }
      }
    });
    papers.forEach(function (a, i) {
      nearest[i].sort(function (x, y) { return y.near - x.near; }).slice(0, NEIGHBORS)
        .forEach(function (s) { addEdge(a, s.other, 'near', s.near); });
    });
    const neighbors = new Map(papers.map(function (p) { return [p, new Set([p])]; }));
    edges.forEach(function (e) { neighbors.get(e.source).add(e.target); neighbors.get(e.target).add(e.source); });

    // ---- Focus areas --------------------------------------------------------
    // Greedy modularity: every paper starts alone, and the two groups whose union
    // raises modularity the most are merged until no merge raises it.
    // Above 1 favors more, smaller areas. It rises with the size of the library, which would
    // otherwise settle into the same handful of areas however many papers were in each.
    const RESOLUTION = Math.max(1, 0.63 * Math.log(papers.length) - 0.67);
    const MIN_AREA = 14;
    const groups = (function () {
      const links = tie.map(function (m) { return new Map(m); });
      const degree = links.map(function (m) { let s = 0; m.forEach(function (w) { s += w; }); return s; });
      const members = papers.map(function (p) { return [p]; });
      const alive = new Set(papers.map(function (_, i) { return i; }));
      // Papers given the same `area` name by hand start out as one group, and two groups with
      // different names are never merged.
      const named = papers.map(function (p) { return p.area || null; });
      let total = 0;
      degree.forEach(function (d) { total += d; });
      function merge(i, j) {
        links[j].forEach(function (w, k) {
          links[k].delete(j);
          if (k === i) return;
          links[i].set(k, (links[i].get(k) || 0) + w);
          links[k].set(i, links[i].get(k));
        });
        degree[i] += degree[j];
        named[i] = named[i] || named[j];
        members[i] = members[i].concat(members[j]);
        alive.delete(j);
      }
      const first = new Map();
      named.forEach(function (name, i) {
        if (!name) return;
        if (first.has(name)) merge(first.get(name), i); else first.set(name, i);
      });
      for (;;) {
        let best = 0, pair = null;
        alive.forEach(function (i) {
          links[i].forEach(function (w, j) {
            if (j < i || (named[i] && named[j] && named[i] !== named[j])) return;
            const gain = w - RESOLUTION * degree[i] * degree[j] / total;
            if (gain > best) { best = gain; pair = [i, j]; }
          });
        });
        if (!pair) break;
        merge(pair[0], pair[1]);
      }
      return Array.from(alive, function (i) { return members[i]; });
    })();

    // An area takes the name given by hand (the `area` field) to most of its papers.
    function nameOf(group) {
      const given = group.map(function (p) { return p.area; }).filter(Boolean);
      return d3.greatest(d3.rollups(given, function (v) { return v.length; }, String), function (d) { return d[1]; })[0];
    }
    // Only groups with a name given by hand become areas; the rest dissolve like small ones.
    const areas = groups
      .filter(function (g) { return g.length >= MIN_AREA && g.some(function (p) { return p.area; }); })
      .sort(function (a, b) { return b.length - a.length; })
      .map(function (g, i) { return { papers: g, color: COLORS[i] || LOOSE, name: nameOf(g) }; });
    papers.forEach(function (p) { p.area = null; p.color = LOOSE; });
    areas.forEach(function (area) {
      area.papers.forEach(function (p) { p.area = area; });
    });
    // A group that is not an area dissolves: each of its papers joins the area it is most
    // tied to (per paper of that area, so the big areas don't swallow everything). Papers tied
    // to no area stay grey, at the periphery.
    const joins = papers.filter(function (p) { return !p.area; }).map(function (p) {
      const pull = new Map();
      tie[p.index].forEach(function (w, j) { if (papers[j].area) count(pull, papers[j].area, w); });
      let best = null, most = 0;
      pull.forEach(function (w, a) {
        const strength = w / Math.sqrt(a.papers.length);
        if (strength > most) { most = strength; best = a; }
      });
      return [p, best];
    });
    joins.forEach(function (join) { if (join[1]) { join[0].area = join[1]; join[1].papers.push(join[0]); } });
    areas.sort(function (a, b) { return b.papers.length - a.papers.length; });
    areas.forEach(function (area, i) {
      area.color = COLORS[i] || LOOSE;
      area.papers.forEach(function (p) { p.color = area.color; });
    });

    // ---- Search text --------------------------------------------------------
    papers.forEach(function (p) {
      p.label = p.label || (p.title.length > 34 ? p.title.slice(0, 32) + '…' : p.title);
      p.own = [p.title, p.label, p.authors.join(' '), p.year, p.abstract, p.note].join(' ').toLowerCase();
      p.cited = p.refs.map(function (ref) { return (works[ref] || '').toLowerCase(); }).filter(Boolean);
      p.reading = p.status === 'reading';
    });
    const reading = papers.filter(function (p) { return p.reading; });
    papers.forEach(function (p) {
      p.now = reading.some(function (r) { return neighbors.get(r).has(p); });
    });

    // ---- Draw ---------------------------------------------------------------
    const width = root.clientWidth, height = root.clientHeight;
    const svg = d3.select(root).append('svg').attr('viewBox', [0, 0, width, height]);
    const view = svg.append('g');

    const edge = view.append('g').selectAll('line').data(edges).join('line')
      .attr('class', function (e) { return 'edge ' + e.type + (e.source.area === e.target.area ? '' : ' cross'); });

    // A paper grows with the number of papers here that cite it.
    const radius = function (n) { return 4 + 2.2 * Math.sqrt(n.citedBy.size); };
    const node = view.append('g').selectAll('g').data(papers).join('g')
      .attr('class', function (n) { return 'node ' + n.status; });
    node.append('circle').attr('r', radius).attr('fill', function (n) { return n.color; });
    node.filter(function (n) { return n.reading; }).append('circle').attr('class', 'ring')
      .attr('r', function (n) { return radius(n) + 3.5; });
    node.filter(function (n) { return n.status === 'queue'; }).append('circle').attr('class', 'ring')
      .attr('r', radius).style('stroke', function (n) { return n.color; });
    const label = node.append('text').attr('dy', '0.32em').text(function (n) { return n.label; });
    // Each area's name sits over the middle of its papers until you zoom in past it.
    const areaLabel = view.append('g').selectAll('text').data(areas).join('text')
      .attr('class', 'area').attr('text-anchor', 'middle').attr('dy', '0.32em')
      .attr('fill', function (a) { return a.color; })
      .style('stroke', getComputedStyle(document.body).backgroundColor)
      .text(function (a) { return a.name.split(' · ')[0]; });
    const AREA_GAP = { x: 14, y: 6 }; // clear space kept between area names, in screen pixels

    // ---- Labels -------------------------------------------------------------
    // Placed greedily, most cited first: each takes the first of four spots around
    // its node that is clear of the circles and of the labels already placed, and
    // stays hidden if none is. Zooming in names more of them.
    const PLACES = [
      { anchor: 'start', dx: 1, dy: 0 }, { anchor: 'end', dx: -1, dy: 0 },
      { anchor: 'middle', dx: 0, dy: 1 }, { anchor: 'middle', dx: 0, dy: -1 },
    ];
    const LABELS = poster ? 16 : 45; // papers named at zoom 1 when nothing narrows the map; hovering or narrowing names the rest
    const byRank = papers.slice().sort(function (a, b) { return b.citedBy.size - a.citedBy.size; });
    byRank.forEach(function (n, i) { n.rank = i; });
    let zoom = 1, fit = 1, hovered = null, picked = null, now = false, query = [];
    const chosen = new Set(); // the areas whose chips are on; together they narrow to papers in any of them
    function choose(a) { if (chosen.has(a)) chosen.delete(a); else chosen.add(a); }

    function measure() {
      label.each(function (n) { const box = this.getBBox(); n.tw = box.width; n.th = box.height; });
      areaLabel.each(function (a) { const box = this.getBBox(); a.tw = box.width; a.th = box.height; });
    }
    function hits(a, b) { return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1; }

    // The papers the search, the chips and the picked paper leave standing; null when nothing narrows the map.
    function standing() {
      let set = null;
      const narrow = function (keep) {
        set = new Set(papers.filter(function (p) { return (!set || set.has(p)) && keep(p); }));
      };
      if (query.length) narrow(function (p) { return p.hit; });
      if (chosen.size) narrow(function (p) { return chosen.has(p.area); });
      if (now) narrow(function (p) { return p.now; });
      if (picked) narrow(function (p) { return neighbors.get(picked).has(p); });
      return set;
    }
    function lit() { return hovered ? neighbors.get(hovered) : standing(); }

    function layoutLabels() {
      const s = 1 / Math.sqrt(zoom), pad = 2 * s;
      const shown = lit(), focus = hovered || picked;
      const rank = function (n) { return n === focus ? 0 : shown.has(n) ? 1 : 2; };
      const order = shown ? byRank.slice().sort(function (a, b) { return rank(a) - rank(b); }) : byRank;
      // Dimmed circles are all but invisible, so labels may run over them.
      const circles = papers.filter(function (n) { return !shown || shown.has(n); }).map(function (n) {
        const r = radius(n);
        return { x0: n.x - r, x1: n.x + r, y0: n.y - r, y1: n.y + r };
      });
      const placed = [];
      const clear = function (box, taken) { return !taken.some(function (t) { return hits(box, t); }); };

      // Area names keep the same size on screen at any zoom. Each starts just above its papers;
      // names that would overlap are then nudged apart, mostly up and down since they are wide,
      // and paper labels keep out of their way.
      const named = !hovered && !picked && !query.length && zoom < 2.5 * fit;
      const live = areas.filter(function (a) {
        a.x = d3.mean(a.papers, function (n) { return n.x; });
        a.y = d3.quantile(a.papers.map(function (n) { return n.y; }), 0.08) - 16 / zoom; // stragglers above don't lift it
        a.lx = a.x * zoom;
        a.ly = a.y * zoom;
        return a.shown = named && (!chosen.size || chosen.has(a));
      });
      for (let pass = 0; pass < 80; pass++) {
        if (pass < 50) live.forEach(function (a) { a.lx += (a.x * zoom - a.lx) * 0.04; a.ly += (a.y * zoom - a.ly) * 0.04; });
        live.forEach(function (a, i) {
          for (let j = i + 1; j < live.length; j++) {
            const b = live[j];
            const ox = (a.tw + b.tw) / 2 + AREA_GAP.x - Math.abs(a.lx - b.lx);
            const oy = (a.th + b.th) / 2 + AREA_GAP.y - Math.abs(a.ly - b.ly);
            if (ox <= 0 || oy <= 0) continue;
            if (oy < ox * 3) { const d = (a.ly <= b.ly ? -1 : 1) * oy / 2; a.ly += d; b.ly -= d; }
            else { const d = (a.lx <= b.lx ? -1 : 1) * ox / 2; a.lx += d; b.lx -= d; }
          }
        });
      }
      live.forEach(function (a) {
        const cx = a.lx / zoom, cy = a.ly / zoom;
        placed.push({ x0: cx - a.tw / 2 / zoom, x1: cx + a.tw / 2 / zoom, y0: cy - a.th / 2 / zoom, y1: cy + a.th / 2 / zoom });
      });
      areaLabel.classed('show', function (a) { return a.shown; })
        .attr('transform', function (a) { return 'translate(' + a.lx / zoom + ',' + a.ly / zoom + ') scale(' + 1 / zoom + ')'; });

      order.forEach(function (n) {
        n.place = null;
        if (shown ? !shown.has(n) : n.rank >= LABELS * Math.max(0.6, zoom * zoom)) return;
        const w = n.tw * s, h = n.th * s, gap = radius(n) + 3;
        const spots = PLACES.map(function (p) {
          const cx = n.x + p.dx * (gap + w / 2), cy = n.y + p.dy * (gap + h / 2);
          return { anchor: p.anchor, x: p.dx * gap, y: p.dy * (gap + h / 2),
            x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
        });
        let spot = spots.find(function (b) { return clear(b, circles) && clear(b, placed); });
        // The hovered or picked paper always shows its label, over circles if it must.
        if (!spot && n === focus) spot = spots.find(function (b) { return clear(b, placed); }) || spots[0];
        if (!spot) return;
        placed.push({ x0: spot.x0 - pad, x1: spot.x1 + pad, y0: spot.y0 - pad, y1: spot.y1 + pad });
        n.place = spot;
      });

      label.classed('show', function (n) { return n.place; })
        .filter(function (n) { return n.place; })
        .attr('text-anchor', function (n) { return n.place.anchor; })
        .attr('transform', function (n) { return 'translate(' + n.place.x + ',' + n.place.y + ') scale(' + s + ')'; });
    }

    function position() {
      edge.attr('x1', function (e) { return e.source.x; }).attr('y1', function (e) { return e.source.y; })
        .attr('x2', function (e) { return e.target.x; }).attr('y2', function (e) { return e.target.y; });
      node.attr('transform', function (n) { return 'translate(' + n.x + ',' + n.y + ')'; });
      layoutLabels();
    }

    // Papers in the same area pull toward each other, so areas read as regions and not just as colors.
    const sim = d3.forceSimulation(papers)
      .force('link', d3.forceLink(edges)
        .distance(function (e) { return e.source.area === e.target.area ? 46 : 110; })
        .strength(function (e) { return (e.source.area === e.target.area ? 0.5 : 0.04) * Math.min(1, 0.4 + e.weight); }))
      .force('charge', d3.forceManyBody().strength(-190))
      .force('gather', function (alpha) {
        areas.forEach(function (a) {
          const cx = d3.mean(a.papers, function (n) { return n.x; }), cy = d3.mean(a.papers, function (n) { return n.y; });
          a.papers.forEach(function (n) { n.vx += (cx - n.x) * 0.09 * alpha; n.vy += (cy - n.y) * 0.09 * alpha; });
        });
      })
      .force('collide', d3.forceCollide().radius(function (n) { return radius(n) + 7; }))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.08))
      .stop();
    sim.tick(400); // settle before the first paint: the map appears laid out, and the same way every time

    const zoomer = d3.zoom().scaleExtent([0.3, 6]).on('zoom', function (ev) {
      view.attr('transform', ev.transform);
      if (ev.transform.k !== zoom) { zoom = ev.transform.k; layoutLabels(); }
    });
    svg.call(zoomer).on('dblclick.zoom', null);

    // Frame the settled layout, leaving room for the labels at its edges. A few unconnected
    // papers drift far out; they are left off-frame so that they don't shrink everything else.
    (function () {
      const span = function (at) {
        const v = papers.map(at).sort(d3.ascending);
        return papers.length < 60 ? [v[0], v[v.length - 1]] : [d3.quantileSorted(v, 0.01), d3.quantileSorted(v, 0.99)];
      };
      const xs = span(function (n) { return n.x; }), ys = span(function (n) { return n.y; });
      const top = poster ? 80 : 20; // room for the masthead, or for the topmost area name
      const k = Math.min(1.6, (width - 260) / (xs[1] - xs[0] || 1), (height - 70 - top) / (ys[1] - ys[0] || 1));
      zoom = fit = k;
      svg.call(zoomer.transform, d3.zoomIdentity
        .translate(width / 2 - k * (xs[0] + xs[1]) / 2, top + (height - top) / 2 - k * (ys[0] + ys[1]) / 2).scale(k));
    })();

    measure();
    position();
    sim.on('tick', position);
    if (document.fonts) document.fonts.ready.then(function () { measure(); layoutLabels(); });

    window.addEventListener('resize', function () {
      svg.attr('viewBox', [0, 0, root.clientWidth, root.clientHeight]);
    });

    node.call(d3.drag()
      .on('start', function (ev, n) { if (!ev.active) sim.alphaTarget(0.3).restart(); n.fx = n.x; n.fy = n.y; })
      .on('drag', function (ev, n) { n.fx = ev.x; n.fy = ev.y; })
      .on('end', function (ev, n) { if (!ev.active) sim.alphaTarget(0); n.fx = null; n.fy = null; }));

    // ---- The list under the map ---------------------------------------------
    papers.forEach(function (p) {
      p.item = document.getElementById('paper-' + p.id);
      if (!p.item) return;
      const dot = document.createElement('span');
      dot.className = 'paper__dot';
      dot.style.background = p.color;
      dot.title = 'Show on the map';
      dot.addEventListener('click', function () { pick(p); root.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
      p.item.prepend(dot);
    });
    const sections = Array.from(document.querySelectorAll('.papers__section'));
    const list = document.getElementById('papers-list') || { querySelector: function () { return {}; } };
    let opened = false; // the list was opened by narrowing, not by the reader

    // ---- Info line ----------------------------------------------------------
    function names(set) {
      return Array.from(set, function (p) { return p.label; }).join(', ');
    }
    function describe(n) {
      info.textContent = '';
      const strong = document.createElement('strong');
      strong.textContent = n.title;
      const authors = n.authors.length > 3 ? n.authors[0] + ' et al.' : n.authors.join(', ');
      info.append(strong, ' · ' + [authors, n.year].filter(Boolean).join(' · '));
      const lines = [];
      if (n.cites.size) lines.push('Cites ' + names(n.cites) + '.');
      if (n.citedBy.size) lines.push('Cited by ' + names(n.citedBy) + '.');
      if (n.note) lines.push(n.note);
      lines.forEach(function (line) { info.append(document.createElement('br'), line); });
    }
    function summarize(set) {
      if (picked) { describe(picked); return; }
      if (!set) {
        const cites = edges.filter(function (e) { return e.type === 'cite'; }).length;
        info.textContent = papers.length + ' papers, ' + cites.toLocaleString() + ' citations among them, ' + areas.length + ' focus areas. ' +
          (poster ? 'Hover a paper to see what it connects to.' : 'Hover a paper to see what it connects to; click it to narrow the list.');
        return;
      }
      let text = set.size + ' of ' + papers.length + ' papers';
      if (query.length) {
        const own = papers.filter(function (p) { return set.has(p) && p.hit === 'own'; }).length;
        text += ': ' + own + ' match in their own title, abstract or note, ' + (set.size - own) + ' through something they cite';
      }
      info.textContent = text + '.';
    }

    // ---- Narrowing ----------------------------------------------------------
    function paint() {
      const shown = lit();
      const focus = hovered || picked;
      node.classed('dim', function (n) { return shown && !shown.has(n); })
        .classed('picked', function (n) { return n === picked; });
      edge.classed('dim', function (e) {
        return focus ? e.source !== focus && e.target !== focus : shown && !(shown.has(e.source) && shown.has(e.target));
      }).classed('lit', function (e) { return focus && (e.source === focus || e.target === focus); });
      layoutLabels();
    }
    function apply() {
      const set = standing();
      papers.forEach(function (p) { if (p.item) p.item.hidden = !!set && !set.has(p); });
      sections.forEach(function (s) { s.hidden = !s.querySelector('.paper:not([hidden])'); });
      if (set && !list.open) { list.open = opened = true; }
      else if (!set && opened) { list.open = opened = false; }
      list.querySelector('summary small').textContent = set ? set.size + ' of ' + papers.length : papers.length;
      if (areasEl) areasEl.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.chip.on()); });
      paint();
      summarize(set);
    }
    function pick(n) {
      picked = picked === n ? null : n;
      apply();
    }

    node
      .on('mouseenter', function (ev, n) { hovered = n; paint(); describe(n); })
      .on('mouseleave', function () { hovered = null; paint(); summarize(standing()); })
      .on('click', function (ev, n) { ev.stopPropagation(); pick(n); })
      .on('dblclick', function (ev, n) { if (n.item) window.open(n.item.querySelector('.paper__title').href, '_blank', 'noopener'); });
    svg.on('click', function () { if (picked) pick(picked); });

    if (search) search.addEventListener('input', function () {
      query = search.value.toLowerCase().split(/\s+/).filter(Boolean);
      // Each word of the search must start a word of the text ("model" finds "models", not "remodel").
      // A paper matches on its own text, or through a reference whose title has every word.
      const starts = query.map(function (t) { return new RegExp('(^|[^a-z0-9])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); });
      const has = function (text) { return starts.every(function (re) { return re.test(text); }); };
      papers.forEach(function (p) {
        p.hit = !query.length ? null : has(p.own) ? 'own' : p.cited.some(has) ? 'cited' : null;
      });
      apply();
    });

    function chip(name, size, color, ring, on, toggle) {
      if (!areasEl) return;
      const button = document.createElement('button');
      const dot = document.createElement('i');
      const n = document.createElement('small');
      button.type = 'button';
      if (ring) dot.className = 'ring'; else dot.style.background = color;
      n.textContent = size;
      button.append(dot, name, n);
      button.chip = { on: on };
      button.addEventListener('click', function () { toggle(); apply(); });
      areasEl.append(button);
    }
    if (reading.length) {
      chip('Reading now', reading.length, null, true, function () { return now; }, function () { now = !now; });
    }
    areas.forEach(function (a) {
      chip(a.name, a.papers.length, a.color, false,
        function () { return chosen.has(a); }, function () { choose(a); });
    });
    areaLabel.on('click', function (ev, a) { ev.stopPropagation(); choose(a); apply(); });

    // /papers/#paper-<id> (a thread's link to a paper) arrives with that paper picked.
    function fromHash() {
      const target = papers.find(function (p) { return '#paper-' + p.id === location.hash; });
      if (target && target !== picked) pick(target);
    }
    window.addEventListener('hashchange', fromHash);
    apply();
    fromHash();
  }
})();
