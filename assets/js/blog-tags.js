// Tag chips for /blog/. Each post carries its tags in data-tags; the chips are
// built from those, most used first. Posts stay newest-first, and picking chips
// leaves only the posts with at least one of the picked tags.
(function () {
  const tagsEl = document.getElementById('blog-tags');
  if (!tagsEl) return;
  const posts = Array.from(document.querySelectorAll('.blog-post')).map(function (el) {
    return { el: el, tags: el.dataset.tags.split(' ').filter(Boolean) };
  });
  const counts = new Map();
  posts.forEach(function (p) {
    p.tags.forEach(function (t) { counts.set(t, (counts.get(t) || 0) + 1); });
  });
  const picked = new Set();

  // /blog/#tags=a,b keeps the picked tags, so a filtered list can be linked to.
  function fromHash() {
    picked.clear();
    const m = location.hash.match(/^#tags=(.*)$/);
    if (m) decodeURIComponent(m[1]).split(',').forEach(function (t) { if (counts.has(t)) picked.add(t); });
    apply();
  }
  function apply() {
    posts.forEach(function (p) {
      p.el.hidden = picked.size > 0 && !p.tags.some(function (t) { return picked.has(t); });
    });
    tagsEl.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('on', picked.has(b.dataset.tag));
      b.setAttribute('aria-pressed', picked.has(b.dataset.tag));
    });
  }

  Array.from(counts.keys())
    .sort(function (a, b) { return counts.get(b) - counts.get(a) || a.localeCompare(b); })
    .forEach(function (tag) {
      const button = document.createElement('button');
      const n = document.createElement('small');
      button.type = 'button';
      button.dataset.tag = tag;
      n.textContent = counts.get(tag);
      button.append(tag, n);
      button.addEventListener('click', function () {
        if (!picked.delete(tag)) picked.add(tag);
        history.replaceState(null, '', picked.size ? '#tags=' + Array.from(picked).join(',') : location.pathname);
        apply();
      });
      tagsEl.append(button);
    });

  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
