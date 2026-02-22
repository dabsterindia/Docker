# 🐳 Day 7 — Docker Compose: Managing Multi-Container Applications

> **Goal for today:** Understand what Docker Compose is, learn the `docker-compose.yml` syntax, and build a real multi-container project — a full-stack web application with a database, cache, and admin UI.

---

## 🧠 The Problem: Managing Containers Manually Doesn't Scale

By Day 6, you know how to run individual containers. But real applications are never just one container. Consider a typical web application:

```
Typical Production App Stack
─────────────────────────────
  🌐 Web App (Node.js / Python)
  🗄️  Database (MySQL / PostgreSQL)
  ⚡ Cache (Redis)
  📊 Admin UI (phpMyAdmin / pgAdmin)
  🔀 Reverse Proxy (Nginx)
```

**Without Compose**, you'd need to manually run 5+ commands, in the right order, with the right flags every single time:

```bash
# The manual nightmare 😩
docker network create app-network
docker volume create db-data
docker run -d --name redis --network app-network redis:alpine
docker run -d --name mysql-db --network app-network -e MYSQL_ROOT_PASSWORD=secret -v db-data:/var/lib/mysql mysql:8.0
docker run -d --name web-app --network app-network -p 3000:3000 -e DB_HOST=mysql-db -e REDIS_HOST=redis web-app
# ... and that's only 3 services. Imagine 10.
```

**With Compose**, the entire stack becomes:

```bash
# The Compose way ✅
docker compose up -d
```

One command. Every time. Reproducible. Shareable.

---

## 📄 What is Docker Compose?

**Docker Compose** is a tool for defining and running **multi-container Docker applications** using a single YAML configuration file called `docker-compose.yml`.

```
docker-compose.yml
──────────────────
  Define:              Then:                Result:
  • Services     ──▶   docker compose up ──▶  All containers running
  • Networks           (one command)          on the right network
  • Volumes                                   with the right config
  • Environment vars                          in the right order
```

### Key Benefits

| Without Compose | With Compose |
|----------------|-------------|
| Run 10 commands to start the app | `docker compose up` |
| Remember all flags and env vars | Everything in one YAML file |
| Manual container dependency ordering | `depends_on` handles it |
| Recreate networks and volumes manually | Compose manages them |
| Hard to share setup with teammates | Commit `docker-compose.yml` to Git |
| No standard way to stop everything | `docker compose down` |

---

## 🏗️ Docker Compose File Structure

A `docker-compose.yml` file has four main top-level sections:

```yaml
version: "3.9"            # Compose file format version

services:                  # Your containers (the main section)
  web:                     # Service name (becomes DNS hostname)
    image: nginx           # Image to use
    ...

  db:                      # Another service
    image: mysql:8.0
    ...

volumes:                   # Named volumes to create
  db-data:

networks:                  # Custom networks to create
  app-network:
```

---

## 📋 Core Compose Instructions — Complete Guide

### `image` vs `build`

```yaml
services:
  # Option 1: Use an existing image from Docker Hub
  db:
    image: mysql:8.0

  # Option 2: Build from a local Dockerfile
  web:
    build: .                  # Dockerfile in current directory

  # Option 3: Build with context and specific Dockerfile
  api:
    build:
      context: ./api          # directory containing Dockerfile
      dockerfile: Dockerfile.prod
```

---

### `ports` — Expose Ports to Your Host

```yaml
services:
  web:
    image: nginx
    ports:
      - "8080:80"       # host:container
      - "443:443"
      # Only map ports for services that need to be publicly accessible
      # Databases should NOT have ports mapped — keep them internal!
```

---

### `environment` — Set Environment Variables

```yaml
services:
  db:
    image: mysql:8.0
    environment:
      # Option 1: Inline key=value
      MYSQL_ROOT_PASSWORD: secret
      MYSQL_DATABASE: appdb

  web:
    image: node:18
    environment:
      # Option 2: Reference from a .env file (recommended!)
      DB_PASSWORD: ${DB_PASSWORD}
      NODE_ENV: production
```

**Using a `.env` file (Best Practice):**

```bash
# .env file (never commit this to Git!)
DB_PASSWORD=supersecret123
SECRET_KEY=myappsecretkey
```

```yaml
# docker-compose.yml references the .env file automatically
services:
  web:
    environment:
      DB_PASSWORD: ${DB_PASSWORD}    # reads from .env
```

---

### `volumes` — Attach Storage

```yaml
services:
  db:
    image: mysql:8.0
    volumes:
      # Named volume (defined at bottom of file)
      - db-data:/var/lib/mysql

  web:
    image: node:18
    volumes:
      # Bind mount for live development
      - ./src:/app/src
      # Named volume for node_modules (avoids host/container conflicts)
      - node-modules:/app/node_modules

volumes:
  db-data:          # Docker manages this
  node-modules:     # Docker manages this
```

---

### `networks` — Isolate Services

```yaml
services:
  web:
    networks:
      - frontend
      - backend       # web can talk to both frontend and backend

  db:
    networks:
      - backend       # db is only on backend — not reachable from frontend

networks:
  frontend:
  backend:
```

---

### `depends_on` — Control Startup Order

```yaml
services:
  db:
    image: mysql:8.0

  redis:
    image: redis:alpine

  web:
    build: .
    depends_on:
      - db       # start db before web
      - redis    # start redis before web
```

> ⚠️ **Important:** `depends_on` only waits for the container to *start*, not for the service inside to be *ready*. MySQL takes ~20 seconds to initialize. For production-readiness, add health checks (shown below).

---

### `healthcheck` — Wait Until Truly Ready

```yaml
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: secret
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-psecret"]
      interval: 10s       # check every 10 seconds
      timeout: 5s         # give up after 5 seconds
      retries: 5          # mark unhealthy after 5 failures
      start_period: 30s   # wait 30s before first check (startup grace period)

  web:
    build: .
    depends_on:
      db:
        condition: service_healthy   # wait until db passes health check!
```

---

### `restart` — Handle Failures

```yaml
services:
  web:
    image: nginx
    restart: unless-stopped   # restart unless manually stopped

# Options:
# no            → never restart (default)
# always        → always restart
# on-failure    → only restart if exit code is non-zero
# unless-stopped → restart unless you explicitly stop it
```

---

## 🔧 Essential Docker Compose Commands

```bash
# Start all services (detached mode)
docker compose up -d

# Start and rebuild images (use when code changes)
docker compose up -d --build

# Stop all services (containers stopped, not removed)
docker compose stop

# Stop AND remove containers, networks (keeps volumes)
docker compose down

# Stop AND remove everything including volumes ⚠️
docker compose down -v

# View running services
docker compose ps

# View logs from all services
docker compose logs

# Follow logs in real-time
docker compose logs -f

# View logs for a specific service
docker compose logs -f web

# Execute a command in a running service
docker compose exec web bash
docker compose exec db mysql -u root -psecret

# Rebuild a specific service image
docker compose build web

# Restart a specific service
docker compose restart web

# Scale a service to multiple instances
docker compose up -d --scale web=3

# List all images used by compose
docker compose images

# Pull latest images
docker compose pull
```

---

## 📁 Example 1 — Simple Web App + Database

A clean starter example: Node.js app + MySQL + persistent volume.

### Project Structure

```
simple-app/
├── app/
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
├── .env
├── .dockerignore
└── docker-compose.yml
```

### `docker-compose.yml`

```yaml
version: "3.9"

services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: appdb
    volumes:
      - db-data:/var/lib/mysql
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-p${DB_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  web:
    build: ./app
    ports:
      - "3000:3000"
    environment:
      DB_HOST: db
      DB_USER: root
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: appdb
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-network
    restart: unless-stopped

volumes:
  db-data:

networks:
  app-network:
```

### `.env`

```bash
DB_PASSWORD=supersecret123
```

### `app/index.js`

```javascript
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

app.get('/', async (req, res) => {
  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute('SELECT NOW() AS time');
  await conn.end();
  res.send(`<h2>✅ App is running! DB time: ${rows[0].time}</h2>`);
});

app.listen(3000, () => console.log('App running on port 3000'));
```

```bash
docker compose up -d
# Visit http://localhost:3000
```

---

## 🚀 Example 2 — Full Stack Project: URL Shortener

A complete mini project using **Node.js + Redis + MySQL + phpMyAdmin**.

### What It Does

- Users submit a long URL → get a short code back
- Short codes are stored in MySQL (permanent)
- Recent lookups are cached in Redis (fast)
- phpMyAdmin lets you browse the database visually

### Project Structure

```
url-shortener/
├── app/
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
├── .env
├── .dockerignore
└── docker-compose.yml
```

### `docker-compose.yml`

```yaml
version: "3.9"

services:

  # ─── MySQL Database ───────────────────────────────────────────
  db:
    image: mysql:8.0
    container_name: urlshortener-db
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: urldb
    volumes:
      - db-data:/var/lib/mysql
    networks:
      - backend
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-p${DB_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: unless-stopped

  # ─── Redis Cache ──────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: urlshortener-redis
    volumes:
      - redis-data:/data
    networks:
      - backend
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    restart: unless-stopped

  # ─── Node.js Web App ──────────────────────────────────────────
  web:
    build: ./app
    container_name: urlshortener-web
    ports:
      - "3000:3000"
    environment:
      DB_HOST: db
      DB_USER: root
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: urldb
      REDIS_HOST: redis
      REDIS_PORT: 6379
      BASE_URL: http://localhost:3000
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - backend
    restart: unless-stopped

  # ─── phpMyAdmin (Database Admin UI) ───────────────────────────
  phpmyadmin:
    image: phpmyadmin:latest
    container_name: urlshortener-pma
    ports:
      - "8080:80"
    environment:
      PMA_HOST: db
      PMA_USER: root
      PMA_PASSWORD: ${DB_PASSWORD}
    depends_on:
      - db
    networks:
      - backend
    restart: unless-stopped

volumes:
  db-data:
  redis-data:

networks:
  backend:
```

### `app/package.json`

```json
{
  "name": "url-shortener",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.0",
    "redis": "^4.6.7",
    "nanoid": "^3.3.6"
  }
}
```

### `app/index.js`

```javascript
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
```

### `app/Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY index.js .

EXPOSE 3000

CMD ["node", "index.js"]
```

### `.env`

```bash
DB_PASSWORD=supersecret123
```

### `.dockerignore`

```
node_modules/
*.log
.env
.git/
```

---

### Running the Project

```bash
# Clone / navigate to the project folder
cd url-shortener

# Start the entire stack
docker compose up -d --build

# Watch the startup sequence
docker compose logs -f

# Services start in order:
# 1. db (MySQL) — starts first
# 2. redis      — starts in parallel with db
# 3. web        — waits for db and redis to be healthy
# 4. phpmyadmin — starts after db
```

### Testing the Application

```bash
# Check all services are running and healthy
docker compose ps

# Expected output:
# NAME                    STATUS          PORTS
# urlshortener-db         Up (healthy)    3306/tcp
# urlshortener-redis      Up (healthy)    6379/tcp
# urlshortener-web        Up              0.0.0.0:3000->3000/tcp
# urlshortener-pma        Up              0.0.0.0:8080->80/tcp
```

| URL | What You'll See |
|-----|----------------|
| `http://localhost:3000` | URL Shortener homepage |
| `http://localhost:3000/stats` | Table of all shortened URLs |
| `http://localhost:8080` | phpMyAdmin database UI |

```bash
# Test via curl
curl -X POST http://localhost:3000/shorten \
  -d "url=https://docs.docker.com/compose/" \
  -H "Content-Type: application/x-www-form-urlencoded"

# Check Redis is caching (visit a short URL twice, watch the logs)
docker compose logs -f web
# First visit:  🗄️  Cache MISS for abc123 — fetched from DB
# Second visit: ⚡ Cache HIT for abc123
```

---

### Explore and Experiment

```bash
# Open a MySQL shell
docker compose exec db mysql -u root -psupersecret123 urldb
SELECT * FROM urls;

# Open a Redis shell
docker compose exec redis redis-cli
KEYS *           # list cached keys
GET url:abc123   # get a cached URL

# Rebuild only the web service (after code changes)
docker compose up -d --build web

# Scale the web service to 3 instances (load balancing demo)
docker compose up -d --scale web=3
docker compose ps

# View resource usage
docker stats
```

---

### Clean Up

```bash
# Stop everything (keeps volumes)
docker compose down

# Stop and delete volumes too (fresh start)
docker compose down -v

# Remove all images built by Compose
docker compose down --rmi all
```

---

## 📊 Compose Architecture Diagram

```
Internet
    │
    │ :3000 (only public port)
    ▼
┌───────────────────────────────────────────────────┐
│  Docker Network: backend                           │
│                                                   │
│  ┌──────────────┐    ┌──────────────┐             │
│  │   web        │───▶│     db       │             │
│  │ Node.js :3000│    │ MySQL :3306  │             │
│  │              │    │              │             │
│  └──────┬───────┘    └──────┬───────┘             │
│         │                   │                     │
│         │  ┌────────────┐   │  ┌───────────────┐  │
│         └─▶│   redis    │   └─▶│  db-data vol  │  │
│  :6379     │ Redis :6379│      │ (persistent)  │  │
│            └────────────┘      └───────────────┘  │
│                                                   │
│  ┌──────────────┐                                 │
│  │  phpmyadmin  │  :8080 (admin UI)               │
│  └──────────────┘                                 │
└───────────────────────────────────────────────────┘
```

---

## 🔑 Key Concepts to Remember

```
┌─────────────────────────────────────────────────────────────┐
│  SERVICE  = a container definition in docker-compose.yml    │
│  NETWORK  = private virtual LAN for your services           │
│  VOLUME   = persistent storage that outlives containers     │
│  .env     = secrets and config — never commit to Git!       │
│                                                             │
│  depends_on  = startup ORDER                                │
│  healthcheck = startup READINESS (use this for databases)   │
│  restart     = automatic recovery from crashes              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Best Practices Summary

```
✅  DO                                    ❌  AVOID
──────────────────────────────────────    ──────────────────────────────────────
Use .env for secrets                      Hardcoding passwords in compose file
Use healthchecks for databases            Using depends_on alone for readiness
Name your containers and volumes          Relying on random generated names
Use custom networks                       Relying on the default bridge network
Pin image versions (mysql:8.0)            Using :latest in production
Use restart: unless-stopped               Leaving restart policy unset
Keep .env in .gitignore                   Committing .env files to Git
Use bind mounts for development           Rebuilding for every code change
One concern per service                   Cramming multiple apps in one service
```

---

## 🔧 Quick Reference Cheat Sheet

```bash
# Lifecycle
docker compose up -d              # start all services
docker compose up -d --build      # start + rebuild images
docker compose down               # stop + remove containers
docker compose down -v            # stop + remove containers + volumes
docker compose restart            # restart all services
docker compose restart web        # restart one service

# Monitoring
docker compose ps                 # list service status
docker compose logs               # all logs
docker compose logs -f web        # follow one service's logs
docker compose top                # running processes per service
docker stats                      # live resource usage

# Interaction
docker compose exec web bash      # shell into a service
docker compose exec db mysql -u root -p  # MySQL prompt
docker compose build web          # rebuild one service
docker compose pull               # pull latest images

# Scaling
docker compose up -d --scale web=3    # run 3 web instances
```

---

## 📚 References & Further Reading

| Resource | Link |
|---------|------|
| Docker Compose Official Docs | https://docs.docker.com/compose/ |
| Compose File Reference | https://docs.docker.com/compose/compose-file/ |
| Compose Getting Started | https://docs.docker.com/compose/gettingstarted/ |
| Environment Variables in Compose | https://docs.docker.com/compose/environment-variables/ |
| Awesome Compose (Example Projects) | https://github.com/docker/awesome-compose |

---