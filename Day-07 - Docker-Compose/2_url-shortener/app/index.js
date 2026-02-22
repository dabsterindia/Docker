const express = require('express');
const mysql = require('mysql2/promise');
const { createClient } = require('redis');
const { nanoid } = require('nanoid');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Database Connection ───────────────────────────────────────
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// ─── Redis Connection ──────────────────────────────────────────
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
  }
});
redisClient.connect().then(() => console.log('✅ Redis connected'));

// ─── Setup DB Table on Startup ────────────────────────────────
async function setupDB() {
  const conn = await mysql.createConnection(dbConfig);
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS urls (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(10) UNIQUE NOT NULL,
      original_url TEXT NOT NULL,
      visits INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await conn.end();
  console.log('✅ Database table ready');
}
setupDB();

// ─── Homepage ─────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>🔗 URL Shortener</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 60px auto; padding: 20px; }
        input[type=text] { width: 100%; padding: 10px; font-size: 16px; margin: 10px 0; }
        button { padding: 10px 20px; background: #0066cc; color: white; border: none;
                 font-size: 16px; cursor: pointer; border-radius: 4px; }
        .result { margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>🔗 URL Shortener</h1>
      <p>Built with Node.js + MySQL + Redis + Docker Compose</p>
      <form action="/shorten" method="POST">
        <input type="text" name="url" placeholder="https://your-long-url.com/..." required />
        <button type="submit">Shorten URL</button>
      </form>
      <p><a href="/stats">📊 View All URLs</a></p>
    </body>
    </html>
  `);
});

// ─── Shorten URL ──────────────────────────────────────────────
app.post('/shorten', async (req, res) => {
  const { url } = req.body;
  const code = nanoid(6);
  const conn = await mysql.createConnection(dbConfig);
  await conn.execute('INSERT INTO urls (code, original_url) VALUES (?, ?)', [code, url]);
  await conn.end();
  const shortUrl = `${process.env.BASE_URL}/${code}`;
  res.send(`
    <h2>✅ URL Shortened!</h2>
    <div style="font-family:Arial;max-width:600px;margin:40px auto;padding:20px">
      <p><b>Original:</b> ${url}</p>
      <p><b>Short URL:</b> <a href="${shortUrl}">${shortUrl}</a></p>
      <p style="color:#666;font-size:13px">⚡ Short URL cached in Redis for fast redirects</p>
      <a href="/">← Shorten another</a> | <a href="/stats">📊 View all URLs</a>
    </div>
  `);
});

// ─── Redirect Short URL ───────────────────────────────────────
app.get('/:code', async (req, res) => {
  const { code } = req.params;
  if (code === 'stats' || code === 'health') return;

  // Check Redis cache first (fast path)
  const cached = await redisClient.get(`url:${code}`);
  if (cached) {
    console.log(`⚡ Cache HIT for ${code}`);
    return res.redirect(cached);
  }

  // Fallback to MySQL
  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute(
    'SELECT original_url FROM urls WHERE code = ?', [code]
  );
  if (rows.length === 0) {
    await conn.end();
    return res.status(404).send('❌ Short URL not found');
  }
  const originalUrl = rows[0].original_url;

  // Increment visit count and cache in Redis (TTL: 1 hour)
  await conn.execute('UPDATE urls SET visits = visits + 1 WHERE code = ?', [code]);
  await conn.end();
  await redisClient.setEx(`url:${code}`, 3600, originalUrl);
  console.log(`🗄️  Cache MISS for ${code} — fetched from DB`);

  res.redirect(originalUrl);
});

// ─── Stats Page ───────────────────────────────────────────────
app.get('/stats', async (req, res) => {
  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute(
    'SELECT code, original_url, visits, created_at FROM urls ORDER BY created_at DESC'
  );
  await conn.end();

  const rows_html = rows.map(r => `
    <tr>
      <td><a href="/${r.code}">${process.env.BASE_URL}/${r.code}</a></td>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        ${r.original_url}
      </td>
      <td>${r.visits}</td>
      <td>${new Date(r.created_at).toLocaleString()}</td>
    </tr>
  `).join('');

  res.send(`
    <html><head><title>URL Stats</title>
    <style>
      body{font-family:Arial;max-width:900px;margin:40px auto;padding:20px}
      table{width:100%;border-collapse:collapse}
      th,td{padding:10px;border:1px solid #ddd;text-align:left}
      th{background:#f5f5f5}
    </style></head>
    <body>
      <h2>📊 All Shortened URLs</h2>
      <table>
        <tr><th>Short URL</th><th>Original URL</th><th>Visits</th><th>Created</th></tr>
        ${rows_html || '<tr><td colspan="4">No URLs yet</td></tr>'}
      </table>
      <p><a href="/">← Back to Shortener</a></p>
    </body></html>
  `);
});

// ─── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'url-shortener', timestamp: new Date() });
});

app.listen(3000, () => console.log('🌐 URL Shortener running on port 3000'));