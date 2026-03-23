const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = 3000;
const API_BASE = 'https://api.imdbapi.dev';
const EMBED_BASE = 'https://vidsrc-embed.ru';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); }
      });
    }).on('error', reject);
  });
}

// Serve static HTML page
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monsterflix - Search Movies & TV Shows</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: linear-gradient(135deg, #0d0d0d 0%, #1a0a0a 50%, #0d1117 100%);
      min-height: 100vh;
      color: #e6edf3;
    }
    .header {
      padding: 2rem 1.5rem;
      text-align: center;
      border-bottom: 1px solid rgba(255, 80, 80, 0.2);
    }
    .logo {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 3.5rem;
      letter-spacing: 0.2em;
      background: linear-gradient(90deg, #ff5050, #ff8080, #ff5050);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .search-container {
      max-width: 600px;
      margin: 2rem auto;
      padding: 0 1rem;
    }
    .search-box {
      display: flex;
      gap: 0.5rem;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 0.5rem;
      transition: border-color 0.2s;
    }
    .search-box:focus-within {
      border-color: rgba(255, 80, 80, 0.5);
    }
    .search-box input {
      flex: 1;
      background: transparent;
      border: none;
      padding: 1rem 1.25rem;
      font-size: 1rem;
      color: #e6edf3;
      outline: none;
    }
    .search-box input::placeholder {
      color: rgba(230, 237, 243, 0.4);
    }
    .search-box button {
      background: linear-gradient(135deg, #ff5050, #cc4040);
      border: none;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .search-box button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 20px rgba(255, 80, 80, 0.4);
    }
    .search-box button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .results {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 220px));
      gap: 1.5rem;
    }
    .card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      overflow: hidden;
      transition: transform 0.2s, border-color 0.2s;
    }
    .card:hover {
      transform: translateY(-4px);
      border-color: rgba(255, 80, 80, 0.3);
    }
    .card-link {
      cursor: pointer;
    }
    .card-poster {
      width: 100%;
      aspect-ratio: 2/3;
      object-fit: cover;
      display: block;
    }
    .card-body {
      padding: 1rem;
    }
    .card-title {
      font-weight: 600;
      font-size: 1rem;
      margin-bottom: 0.35rem;
      line-height: 1.3;
    }
    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: rgba(230, 237, 243, 0.7);
    }
    .card-type {
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .card-year { opacity: 0.9; }
    .card-genres {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.5rem;
    }
    .genre-tag {
      background: rgba(255, 80, 80, 0.2);
      color: #ff8080;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
    }
    .card-rating {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.5rem;
    }
    .rating-star { color: #fbbf24; }
    .rating-value { font-weight: 600; }
    .rating-count { font-size: 0.75rem; opacity: 0.7; }
    .empty-state, .error-state {
      text-align: center;
      padding: 4rem 2rem;
      color: rgba(230, 237, 243, 0.6);
    }
    .loading {
      text-align: center;
      padding: 2rem;
      color: rgba(230, 237, 243, 0.7);
    }
    .loading::after {
      content: '';
      animation: dots 1.5s steps(4, end) infinite;
    }
    @keyframes dots {
      0%, 20% { content: '.'; }
      40% { content: '..'; }
      60%, 100% { content: '...'; }
    }
  </style>
</head>
<body>
  <header class="header">
    <h1 class="logo">MONSTERFLIX</h1>
    <p style="margin-top: 0.5rem; opacity: 0.7;">Search movies & TV shows</p>
  </header>

  <div class="search-container">
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="Search for movies, series..." autocomplete="off">
      <button type="button" id="searchBtn">Search</button>
    </div>
  </div>

  <main class="results">
    <div id="resultsContainer">
      <div class="empty-state" id="emptyState">Enter a search term to find titles</div>
      <div class="loading" id="loadingState" style="display:none;">Searching</div>
      <div class="error-state" id="errorState" style="display:none;"></div>
      <div class="results-grid" id="resultsGrid"></div>
    </div>
  </main>

  <script>
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const resultsGrid = document.getElementById('resultsGrid');

    function show(el) { el.style.display = ''; }
    function hide(el) { el.style.display = 'none'; }

    function setState(state) {
      hide(emptyState);
      hide(loadingState);
      hide(errorState);
      resultsGrid.innerHTML = '';
      if (state === 'empty') show(emptyState);
      else if (state === 'loading') show(loadingState);
      else if (state === 'error') show(errorState);
    }

    function renderCard(t) {
      const id = t.id || '';
      const img = t.primaryImage ? t.primaryImage.url : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150" fill="%23333"><rect width="100" height="150"/><text x="50" y="75" text-anchor="middle" fill="%23666" font-size="12">No image</text></svg>';
      const rating = t.rating ? t.rating.aggregateRating : null;
      const voteCount = t.rating ? t.rating.voteCount : 0;
      const genres = (t.genres || []).slice(0, 3);
      const year = t.startYear || '';
      const yearEnd = t.endYear ? '-' + t.endYear : '';
      const type = (t.type || 'Title').replace(/([A-Z])/g, ' $1').trim();

      return '<article class="card card-link" data-id="' + id + '">' +
        '<img class="card-poster" src="' + img + '" alt="' + (t.primaryTitle || 'Poster') + '">' +
        '<div class="card-body">' +
          '<h3 class="card-title">' + (t.primaryTitle || 'Unknown') + '</h3>' +
          '<div class="card-meta">' +
            '<span class="card-type">' + type + '</span>' +
            (year ? '<span class="card-year">' + year + yearEnd + '</span>' : '') +
          '</div>' +
          (genres.length ? '<div class="card-genres">' + genres.map(g => '<span class="genre-tag">' + g + '</span>').join('') + '</div>' : '') +
          (rating ? '<div class="card-rating"><span class="rating-star">★</span><span class="rating-value">' + rating.toFixed(1) + '</span><span class="rating-count">(' + voteCount.toLocaleString() + ')</span></div>' : '') +
        '</div></article>';
    }

    async function search() {
      const q = searchInput.value.trim();
      if (!q) {
        setState('empty');
        return;
      }
      setState('loading');
      try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(q));
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Search failed');
        setState('results');
        if (!data.titles || data.titles.length === 0) {
          emptyState.textContent = 'No titles found for "' + q + '"';
          show(emptyState);
        } else {
          resultsGrid.innerHTML = data.titles.map(renderCard).join('');
        }
      } catch (err) {
        errorState.textContent = err.message || 'Something went wrong';
        setState('error');
      }
    }

    resultsGrid.addEventListener('click', function(e) {
      const card = e.target.closest('.card-link');
      if (card) {
        const id = card.getAttribute('data-id');
        if (id) window.location.href = '/title/' + id;
      }
    });

    searchBtn.addEventListener('click', search);
    searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
  </script>
</body>
</html>`;

// Proxy search to IMDb API
app.get('/api/search', async (req, res) => {
  const q = req.query.q;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ message: 'Query parameter "q" is required' });
  }
  try {
    const data = await httpsGet(`${API_BASE}/search/titles?query=${encodeURIComponent(q)}&limit=50`);
    res.json(data);
  } catch {
    res.status(502).json({ message: 'Failed to reach search API' });
  }
});

// Proxy title details
app.get('/api/title/:id', async (req, res) => {
  const id = req.params.id;
  if (!id || !/^tt\d+$/.test(id)) {
    return res.status(400).json({ message: 'Invalid title ID' });
  }
  try {
    const data = await httpsGet(`${API_BASE}/titles/${id}`);
    res.json(data);
  } catch {
    res.status(502).json({ message: 'Failed to fetch title' });
  }
});

// Proxy seasons
app.get('/api/title/:id/seasons', async (req, res) => {
  const id = req.params.id;
  if (!id || !/^tt\d+$/.test(id)) {
    return res.status(400).json({ message: 'Invalid title ID' });
  }
  try {
    const data = await httpsGet(`${API_BASE}/titles/${id}/seasons`);
    res.json(data);
  } catch {
    res.status(502).json({ message: 'Failed to fetch seasons' });
  }
});

// Proxy episodes
app.get('/api/title/:id/episodes', async (req, res) => {
  const id = req.params.id;
  const season = req.query.season;
  if (!id || !/^tt\d+$/.test(id)) {
    return res.status(400).json({ message: 'Invalid title ID' });
  }
  try {
    const url = season ? `${API_BASE}/titles/${id}/episodes?season=${encodeURIComponent(season)}` : `${API_BASE}/titles/${id}/episodes`;
    const data = await httpsGet(url);
    res.json(data);
  } catch {
    res.status(502).json({ message: 'Failed to fetch episodes' });
  }
});

app.get('/', (req, res) => {
  res.type('html').send(HTML);
});

// Detail page HTML template
const DETAIL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monsterflix - Loading...</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; background: linear-gradient(135deg, #0d0d0d 0%, #1a0a0a 50%, #0d1117 100%); min-height: 100vh; color: #e6edf3; }
    .header { padding: 1rem 1.5rem; display: flex; align-items: center; gap: 1rem; border-bottom: 1px solid rgba(255, 80, 80, 0.2); }
    .logo { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; letter-spacing: 0.15em; background: linear-gradient(90deg, #ff5050, #ff8080); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-decoration: none; }
    .back { color: rgba(230,237,243,0.8); text-decoration: none; font-size: 0.9rem; }
    .back:hover { color: #ff8080; }
    .detail { max-width: 1400px; margin: 0 auto; padding: 2rem 1rem; }
    .detail-loading, .detail-error { text-align: center; padding: 4rem 2rem; }
    .hero { display: grid; grid-template-columns: 280px 1fr; gap: 2rem; margin-bottom: 2rem; }
    @media (max-width: 800px) { .hero { grid-template-columns: 140px 1fr; gap: 1rem; } .poster { max-width: 140px; } }
    .poster { border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.5); max-width: 280px; }
    .poster img { width: 100%; max-width: 100%; height: auto; display: block; object-fit: cover; }
    .hero-info h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .hero-meta { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; color: rgba(230,237,243,0.8); font-size: 0.9rem; }
    .hero-genres { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .genre-tag { background: rgba(255,80,80,0.2); color: #ff8080; padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.8rem; }
    .rating { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
    .rating-star { color: #fbbf24; font-size: 1.2rem; }
    .plot { margin-bottom: 1.5rem; line-height: 1.6; color: rgba(230,237,243,0.9); }
    .credits { margin-top: 1rem; }
    .credits h4 { font-size: 0.85rem; opacity: 0.7; margin-bottom: 0.25rem; }
    .credits p { font-size: 0.9rem; }
    .embed-wrap { position: relative; padding-bottom: 42%; height: 0; overflow: hidden; border-radius: 12px; background: #000; margin: 0 auto 2rem; max-width: 720px; }
    .embed-wrap iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
    .tv-selector { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; align-items: flex-start; }
    .tv-selector label { font-size: 0.9rem; display: block; margin-bottom: 0.5rem; }
    .episodes-col { flex: 1; min-width: 200px; }
    .tv-selector select { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #e6edf3; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.9rem; cursor: pointer; }
    .episodes-list { display: grid; gap: 0.5rem; max-height: 300px; overflow-y: auto; }
    .ep-btn { display: block; width: 100%; text-align: left; padding: 0.75rem 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #e6edf3; cursor: pointer; font-size: 0.9rem; transition: background 0.2s; }
    .ep-btn:hover, .ep-btn.active { background: rgba(255,80,80,0.2); border-color: rgba(255,80,80,0.4); }
    .ep-btn .ep-num { opacity: 0.7; margin-right: 0.5rem; }
    .ep-btn .ep-title { font-weight: 500; }
  </style>
</head>
<body>
  <header class="header">
    <a href="/" class="logo">MONSTERFLIX</a>
    <a href="/" class="back">← Back to Search</a>
  </header>
  <main class="detail">
    <div id="loading" class="detail-loading">Loading...</div>
    <div id="error" class="detail-error" style="display:none;"></div>
    <div id="content" style="display:none;"></div>
  </main>
  <script>
    const tid = window.location.pathname.split('/').pop();
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const content = document.getElementById('content');

    function show(el) { el.style.display = ''; }
    function hide(el) { el.style.display = 'none'; }

    async function load() {
      try {
        const titleRes = await fetch('/api/title/' + tid);
        const title = await titleRes.json();
        if (!titleRes.ok) throw new Error(title.message || 'Failed to load');
        const isTV = ['tvSeries','tvMiniSeries','tvSpecial'].includes(title.type || '');
        let seasons = [], episodes = [];

        if (isTV) {
          const sRes = await fetch('/api/title/' + tid + '/seasons');
          const sData = await sRes.json();
          seasons = (sData.seasons || []).sort((a,b) => +a.season - +b.season);
          if (seasons.length) {
            const eRes = await fetch('/api/title/' + tid + '/episodes?season=' + seasons[0].season);
            const eData = await eRes.json();
            episodes = eData.episodes || [];
          }
        }

        render(title, isTV, seasons, episodes);
      } catch (e) {
        hide(loading); show(error);
        error.textContent = e.message || 'Something went wrong';
      }
    }

    function formatRuntime(s) {
      if (!s) return '';
      const m = Math.floor(s / 60);
      return m + ' min';
    }

    function render(t, isTV, seasons, episodes) {
      document.title = (t.primaryTitle || 'Title') + ' - Monsterflix';
      hide(loading); show(content);

      const posterUrl = t.primaryImage ? t.primaryImage.url : '';
      const posterHtml = posterUrl ? '<img src="' + posterUrl + '" alt="">' : '<div style="width:100%;aspect-ratio:2/3;background:#222;display:flex;align-items:center;justify-content:center;color:#666;">No image</div>';
      const year = t.startYear ? (t.endYear ? t.startYear + ' - ' + t.endYear : t.startYear) : '';
      const genres = (t.genres || []).map(g => '<span class="genre-tag">' + g + '</span>').join('');
      const rating = t.rating ? ('<div class="rating"><span class="rating-star">★</span><span>' + t.rating.aggregateRating.toFixed(1) + '</span> <span style="opacity:0.7">(' + (t.rating.voteCount || 0).toLocaleString() + ' votes)</span></div>') : '';
      const plot = t.plot ? '<div class="plot">' + t.plot + '</div>' : '';
      const directors = (t.directors || []).map(d => d.displayName).filter(Boolean).join(', ');
      const stars = (t.stars || []).map(s => s.displayName).filter(Boolean).join(', ');
      const credits = (directors || stars) ? '<div class="credits">' + (directors ? '<h4>Directors</h4><p>' + directors + '</p>' : '') + (stars ? '<h4>Stars</h4><p>' + stars + '</p>' : '') + '</div>' : '';

        let embedUrl = '';
      let embedHtml = '';
      let selectorHtml = '';

      if (isTV) {
        const s = seasons.length ? seasons[0].season : '1';
        const ep = episodes.length ? episodes.sort((a,b) => (a.episodeNumber||0) - (b.episodeNumber||0))[0] : null;
        const epNum = ep && (ep.episodeNumber != null) ? ep.episodeNumber : 1;
        embedUrl = EMBED_BASE + '/embed/tv?imdb=' + tid + '&season=' + s + '&episode=' + epNum;
        if (seasons.length) {
          selectorHtml = '<div class="tv-selector">' +
            '<div><label>Season:</label><select id="seasonSelect">' + seasons.map(sn => '<option value="' + sn.season + '">Season ' + sn.season + ' (' + (sn.episodeCount || '') + ' eps)</option>').join('') + '</select></div>' +
            '<div class="episodes-col"><label>Episode:</label><div class="episodes-list" id="episodesList"></div></div></div>';
        }
      } else {
        embedUrl = EMBED_BASE + '/embed/movie/' + tid;
      }

      embedHtml = '<div class="embed-wrap"><iframe src="' + embedUrl + '" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>';

      content.innerHTML = selectorHtml +
        embedHtml +
        '<div class="hero">' +
        '<div class="poster">' + posterHtml + '</div>' +
        '<div class="hero-info">' +
          '<h1>' + (t.primaryTitle || 'Unknown') + '</h1>' +
          '<div class="hero-meta">' +
            (year ? '<span>' + year + '</span>' : '') +
            (t.runtimeSeconds ? '<span>' + formatRuntime(t.runtimeSeconds) + '</span>' : '') +
            '<span>' + (t.type || '').replace(/([A-Z])/g, ' $1').trim() + '</span>' +
          '</div>' +
          '<div class="hero-genres">' + genres + '</div>' +
          rating + plot + credits +
        '</div></div>';

      if (isTV && seasons.length) {
        const seasonSelect = document.getElementById('seasonSelect');
        const episodesList = document.getElementById('episodesList');
        if (!seasonSelect || !episodesList) return;
        const iframe = content.querySelector('iframe');

        function setEpisode(season, ep) {
          if (iframe) iframe.src = EMBED_BASE + '/embed/tv?imdb=' + tid + '&season=' + season + '&episode=' + ep;
        }

        function renderEpisodes(eps, currentSeason) {
          const sorted = eps.slice().sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
          episodesList.innerHTML = sorted.map(ep => {
            const num = ep.episodeNumber != null ? ep.episodeNumber : 1;
            const tit = ep.title || 'Episode ' + num;
            const s = ep.season || currentSeason || seasonSelect.value;
            return '<button type="button" class="ep-btn" data-s="' + s + '" data-e="' + num + '"><span class="ep-num">E' + num + '</span><span class="ep-title">' + tit + '</span></button>';
          }).join('');
          episodesList.querySelectorAll('.ep-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              episodesList.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              setEpisode(btn.dataset.s, btn.dataset.e);
            });
          });
          const first = episodesList.querySelector('.ep-btn');
          if (first) first.classList.add('active');
        }

        renderEpisodes(episodes, seasons[0].season);

        seasonSelect.addEventListener('change', async () => {
          const s = seasonSelect.value;
          const r = await fetch('/api/title/' + tid + '/episodes?season=' + s);
          const d = await r.json();
          const newEps = d.episodes || [];
          renderEpisodes(newEps, s);
          if (newEps.length) {
            const firstEp = newEps.sort((a,b) => (a.episodeNumber||0) - (b.episodeNumber||0))[0];
            setEpisode(s, firstEp.episodeNumber != null ? firstEp.episodeNumber : 1);
          }
        });
      }
    }

    const EMBED_BASE = 'https://vidsrc-embed.ru';
    load();
  </script>
</body>
</html>`;

app.get('/title/:id', (req, res) => {
  const id = req.params.id;
  if (!id || !/^tt\d+$/.test(id)) {
    return res.redirect('/');
  }
  res.type('html').send(DETAIL_HTML);
});

const server = app.listen(PORT, () => {
  console.log(`Monsterflix running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop.');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Close the other app or use a different port.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
