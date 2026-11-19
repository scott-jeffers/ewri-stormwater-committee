/* "What members are up to" wall — renders data/wall.json (rebuilt daily by tools/update_wall.py) */
(function () {
  var roots = document.querySelectorAll('[data-wall]');
  if (!roots.length) return;

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var TYPES = {
    publication: { label: 'Publication', icon: 'file' },
    software: { label: 'Open source', icon: 'code' },
    video: { label: 'Video', icon: 'play' }
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(iso) {
    var p = iso.split('-');
    return MONTHS[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10) + ', ' + p[0];
  }
  function initials(n) {
    return n.split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
  }
  function safeUrl(u) { return /^https?:\/\//i.test(u) ? u : '#'; }

  function card(it, base, photos) {
    var t = TYPES[it.type] || TYPES.publication;
    var icon = '<svg class="icon" aria-hidden="true"><use href="' + base + 'assets/icons.svg#i-' + t.icon + '"></use></svg>';
    var people = it.members.map(function (m) {
      var ph = photos[m];
      var av = ph ? '<img src="' + base + esc(ph) + '" alt="" loading="lazy" width="28" height="28">' : '<span>' + esc(initials(m)) + '</span>';
      return '<span class="post-person"><span class="post-avatar">' + av + '</span>' + esc(m) + '</span>';
    }).join('');
    var thumb = it.thumb ? '<span class="post-thumb"><img src="' + esc(it.thumb) + '" alt="" loading="lazy"><span class="post-play">' +
      '<svg class="icon" aria-hidden="true"><use href="' + base + 'assets/icons.svg#i-play"></use></svg></span></span>' : '';
    return '<a class="post post-' + esc(it.type) + '" href="' + esc(safeUrl(it.url)) + '" target="_blank" rel="noopener">' +
      thumb +
      '<span class="post-top"><span class="post-type">' + icon + t.label + '</span><time datetime="' + esc(it.date) + '">' + fmtDate(it.date) + '</time></span>' +
      '<h3>' + esc(it.title) + '</h3>' +
      (it.summary ? '<p class="post-summary">' + esc(it.summary) + '</p>' : '') +
      (it.where ? '<p class="post-where">' + esc(it.where) + '</p>' : '') +
      '<span class="post-people">' + people + '</span>' +
      '</a>';
  }

  // Lay cards out in columns that read left-to-right (newest first across the top row).
  function colCount() { return window.innerWidth >= 1040 ? 3 : window.innerWidth >= 700 ? 2 : 1; }
  function layout(grid, html) {
    var n = colCount(), cols = [];
    for (var c = 0; c < n; c++) cols.push([]);
    html.forEach(function (h, i) { cols[i % n].push(h); });
    grid.style.setProperty('--wall-cols', n);
    grid.innerHTML = cols.map(function (c) { return '<div class="wall-col">' + c.join('') + '</div>'; }).join('');
    grid._html = html;
  }
  var lastCols = colCount();
  window.addEventListener('resize', function () {
    if (colCount() === lastCols) return;
    lastCols = colCount();
    roots.forEach(function (r) { var g = r.querySelector('.wall-grid'); if (g && g._html) layout(g, g._html); });
  });

  // Home preview: newest items, but no member twice until everyone has had a turn.
  function diverse(items, n) {
    var picked = [], used = {}, rest = [];
    items.forEach(function (it) {
      var key = it.members[0];
      if (picked.length < n && !used[key]) { used[key] = 1; picked.push(it); } else { rest.push(it); }
    });
    while (picked.length < n && rest.length) picked.push(rest.shift());
    return picked.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }

  roots.forEach(function (root) {
    var base = root.getAttribute('data-base') || '';
    var mode = root.getAttribute('data-wall');
    var grid = root.querySelector('.wall-grid');
    var meta = root.querySelector('.wall-updated');

    fetch(base + 'data/wall.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var items = (data.items || []).filter(function (i) { return i && i.title && i.members && i.members.length; });
        var photos = data.photos || {};
        if (meta && data.updated) {
          var d = data.updated.slice(0, 10);
          meta.textContent = 'Updated automatically every day · last refreshed ' + fmtDate(d);
        }
        if (mode === 'home') {
          var limit = parseInt(root.getAttribute('data-limit') || '6', 10);
          layout(grid, diverse(items, limit).map(function (it) { return card(it, base, photos); }));
          return;
        }

        // Full page: filters by type and member
        var state = { type: 'all', member: 'all' };
        var chips = root.querySelectorAll('[data-filter-type]');
        var select = root.querySelector('[data-filter-member]');
        var count = root.querySelector('.wall-count');
        var members = {};
        items.forEach(function (i) { i.members.forEach(function (m) { members[m] = (members[m] || 0) + 1; }); });
        Object.keys(members).sort(function (a, b) {
          return a.split(' ').slice(-1)[0].localeCompare(b.split(' ').slice(-1)[0]);
        }).forEach(function (m) {
          var o = document.createElement('option'); o.value = m; o.textContent = m + ' (' + members[m] + ')'; select.appendChild(o);
        });
        function render() {
          var list = items.filter(function (i) {
            return (state.type === 'all' || i.type === state.type) && (state.member === 'all' || i.members.indexOf(state.member) > -1);
          });
          if (list.length) layout(grid, list.map(function (it) { return card(it, base, photos); }));
          else { grid._html = null; grid.style.setProperty('--wall-cols', 1); grid.innerHTML = '<p class="wall-empty">Nothing here yet.</p>'; }
          if (count) count.textContent = list.length + (list.length === 1 ? ' item' : ' items');
        }
        chips.forEach(function (c) {
          c.addEventListener('click', function () {
            state.type = c.getAttribute('data-filter-type');
            chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
            render();
          });
        });
        select.addEventListener('change', function () { state.member = select.value; render(); });
        render();
      })
      .catch(function () {
        grid.innerHTML = '<p class="wall-empty">Member activity couldn’t be loaded right now.</p>';
      });
  });
})();
