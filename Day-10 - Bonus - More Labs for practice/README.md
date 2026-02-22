# 🐳 Bonus Lecture — 10 Docker Compose Practice Apps

> **What this is:** A hands-on practice collection of 10 progressively complex Docker Compose applications. Each app is self-contained, fully working, and teaches a specific real-world pattern. Clone, run, break things, and learn.

---

## 🗺️ Practice Map

| # | App | Stack | Key Pattern | Difficulty |
|---|-----|-------|-------------|------------|
| 1 | [Weather Dashboard](#-app-1--weather-dashboard) | Python + Redis | Caching API responses | ⭐ Beginner |
| 2 | [Notes App](#-app-2--notes-app) | Node.js + MongoDB | CRUD + NoSQL | ⭐ Beginner |
| 3 | [Job Queue Worker](#-app-3--job-queue-worker) | Python + Redis + Worker | Background job processing | ⭐⭐ Beginner+ |
| 4 | [Leaderboard API](#-app-4--leaderboard-api) | FastAPI + PostgreSQL + Redis | SQL + cache layer | ⭐⭐ Beginner+ |
| 5 | [File Upload Service](#-app-5--file-upload-service) | Node.js + MinIO | Object storage (S3-style) | ⭐⭐ Intermediate |
| 6 | [Auth Service](#-app-6--auth-service) | Node.js + PostgreSQL + Redis | JWT auth + session cache | ⭐⭐ Intermediate |
| 7 | [Email Newsletter](#-app-7--email-newsletter) | Node.js + MySQL + Mailhog | Email sending + dev inbox | ⭐⭐ Intermediate |
| 8 | [Inventory Tracker](#-app-8--inventory-tracker) | Flask + PostgreSQL + Grafana | Metrics + visualisation | ⭐⭐⭐ Advanced |
| 9 | [Microservices Gateway](#-app-9--microservices-gateway) | Node.js × 3 + Nginx | API Gateway pattern | ⭐⭐⭐ Advanced |
| 10 | [Full SaaS Starter](#-app-10--full-saas-starter) | Next.js + FastAPI + PostgreSQL + Redis + Nginx | Production-ready full stack | ⭐⭐⭐ Advanced |

---

## ⚡ How to Use This Collection

```bash
# Each app lives in its own folder. To run any app:
cd app-name
cp .env.example .env       # copy environment variables
docker compose up -d       # start the stack
docker compose logs -f     # watch the logs
docker compose down        # stop and clean up
docker compose down -v     # stop + delete volumes (fresh start)
```

**Prerequisites:** Docker Desktop installed and running. That's it.

---

## 🌤️ App 1 — Weather Dashboard

**Stack:** Python Flask + Redis + OpenWeatherMap API

**What you'll learn:** Caching expensive API calls in Redis. The first call fetches from the API (slow), subsequent calls within 10 minutes serve from Redis cache (instant). A pattern used everywhere — news feeds, product listings, search results.

### Project Structure
```
01-weather-dashboard/
├── app/
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
├── .env.example
└── docker-compose.yml
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    networks: [weather-net]
    restart: unless-stopped

  web:
    build: ./app
    ports:
      - "5001:5000"
    environment:
      REDIS_HOST: redis
      API_KEY: ${OPENWEATHER_API_KEY}
      CACHE_TTL: 600        # cache for 10 minutes
    depends_on: [redis]
    networks: [weather-net]
    restart: unless-stopped

networks:
  weather-net:
```

### `app/app.py`
```python
from flask import Flask, request, jsonify
import redis, requests, json, os

app = Flask(__name__)
cache = redis.Redis(host=os.getenv('REDIS_HOST', 'redis'), port=6379, decode_responses=True)
API_KEY = os.getenv('API_KEY', 'demo')
CACHE_TTL = int(os.getenv('CACHE_TTL', 600))

def get_weather(city):
    cache_key = f"weather:{city.lower()}"
    cached = cache.get(cache_key)
    if cached:
        data = json.loads(cached)
        data['source'] = '⚡ Redis Cache'
        return data
    # Fetch from API (use demo data if no key)
    if API_KEY == 'demo':
        data = {"city": city, "temp": "22°C", "condition": "Sunny", "humidity": "60%"}
    else:
        url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
        r = requests.get(url).json()
        data = {"city": city, "temp": f"{r['main']['temp']}°C",
                "condition": r['weather'][0]['description'], "humidity": f"{r['main']['humidity']}%"}
    cache.setex(cache_key, CACHE_TTL, json.dumps(data))
    data['source'] = '🌐 Live API'
    return data

@app.route('/')
def home():
    return '''<html><body style="font-family:Arial;max-width:500px;margin:50px auto;text-align:center">
    <h1>🌤️ Weather Dashboard</h1>
    <form action="/weather" method="GET">
      <input name="city" placeholder="Enter city..." style="padding:10px;font-size:16px;width:70%">
      <button type="submit" style="padding:10px 20px;background:#3498db;color:white;border:none;cursor:pointer">Search</button>
    </form></body></html>'''

@app.route('/weather')
def weather():
    city = request.args.get('city', 'London')
    data = get_weather(city)
    ttl = cache.ttl(f"weather:{city.lower()}")
    return f'''<html><body style="font-family:Arial;max-width:500px;margin:50px auto;text-align:center">
    <h1>🌤️ {data["city"]}</h1>
    <h2>{data["temp"]} — {data["condition"]}</h2>
    <p>💧 Humidity: {data["humidity"]}</p>
    <p style="color:{"green" if "Cache" in data["source"] else "blue"}">{data["source"]}</p>
    <p style="color:gray;font-size:13px">Cache expires in {ttl}s</p>
    <a href="/">← Search again</a></body></html>'''

@app.route('/cache/clear')
def clear_cache():
    keys = cache.keys("weather:*")
    for k in keys: cache.delete(k)
    return jsonify({"cleared": len(keys), "message": "Cache cleared"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
```

### `app/requirements.txt`
```
flask==2.3.0
redis==4.5.0
requests==2.31.0
```

### `app/Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
EXPOSE 5000
CMD ["python", "app.py"]
```

### `.env.example`
```bash
OPENWEATHER_API_KEY=demo   # replace with real key from openweathermap.org
```

### Run & Test
```bash
docker compose up -d --build
# Open: http://localhost:5001
# Search "London" twice — first: Live API, second: ⚡ Cache
# Clear cache: http://localhost:5001/cache/clear
```

---

## 📝 App 2 — Notes App

**Stack:** Node.js + MongoDB + Mongo Express

**What you'll learn:** Full CRUD with a document database. Create, read, search, and delete notes. Mongo Express gives you a live DB viewer so you can see documents being created in real time.

### Project Structure
```
02-notes-app/
├── app/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── .env.example
└── docker-compose.yml
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  mongo:
    image: mongo:6.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASS}
    volumes: [mongo-data:/data/db]
    networks: [notes-net]
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      retries: 5
      start_period: 20s

  mongo-express:
    image: mongo-express
    ports: ["8082:8081"]
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: ${MONGO_USER}
      ME_CONFIG_MONGODB_ADMINPASSWORD: ${MONGO_PASS}
      ME_CONFIG_MONGODB_URL: mongodb://${MONGO_USER}:${MONGO_PASS}@mongo:27017/
      ME_CONFIG_BASICAUTH: "false"
    depends_on:
      mongo:
        condition: service_healthy
    networks: [notes-net]

  web:
    build: ./app
    ports: ["3001:3000"]
    environment:
      MONGO_URI: mongodb://${MONGO_USER}:${MONGO_PASS}@mongo:27017/notesdb?authSource=admin
    depends_on:
      mongo:
        condition: service_healthy
    networks: [notes-net]

volumes:
  mongo-data:

networks:
  notes-net:
```

### `.env.example`
```bash
MONGO_USER=admin
MONGO_PASS=secret123
```

### Run & Test
```bash
docker compose up -d --build
# App:      http://localhost:3001
# Mongo UI: http://localhost:8082
# Try: create a note, then open Mongo Express and see the document!
```

---

## ⚙️ App 3 — Job Queue Worker

**Stack:** Python Flask (API) + Redis (Queue) + Python Worker

**What you'll learn:** The producer-consumer pattern. The web app adds jobs to a Redis queue. A separate worker container processes them asynchronously. This is how email sending, PDF generation, and video encoding work in real apps (Celery, Sidekiq, BullMQ all use this pattern).

### Project Structure
```
03-job-queue/
├── api/
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
├── worker/
│   ├── worker.py
│   ├── requirements.txt
│   └── Dockerfile
└── docker-compose.yml
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    networks: [queue-net]

  api:
    build: ./api
    ports: ["5002:5000"]
    environment:
      REDIS_HOST: redis
    depends_on: [redis]
    networks: [queue-net]

  worker:
    build: ./worker
    environment:
      REDIS_HOST: redis
    depends_on: [redis]
    networks: [queue-net]
    # Scale to multiple workers:  docker compose up --scale worker=3
    restart: unless-stopped

networks:
  queue-net:
```

### `api/app.py`
```python
from flask import Flask, request, jsonify
import redis, json, uuid, os
from datetime import datetime

app = Flask(__name__)
r = redis.Redis(host=os.getenv('REDIS_HOST', 'redis'), decode_responses=True)

@app.route('/')
def home():
    jobs_pending = r.llen('job_queue')
    jobs_done = r.llen('jobs_done')
    return jsonify({"pending": jobs_pending, "completed": jobs_done,
                    "endpoints": {"POST /jobs": "add job", "GET /jobs": "list completed"}})

@app.route('/jobs', methods=['POST'])
def add_job():
    data = request.json or {}
    job = {"id": str(uuid.uuid4())[:8], "task": data.get("task", "default"),
           "payload": data.get("payload", ""), "created_at": datetime.now().isoformat()}
    r.lpush('job_queue', json.dumps(job))
    return jsonify({"message": "Job queued", "job": job}), 201

@app.route('/jobs', methods=['GET'])
def list_jobs():
    jobs = [json.loads(j) for j in r.lrange('jobs_done', 0, 49)]
    return jsonify({"completed": jobs, "count": len(jobs)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
```

### `worker/worker.py`
```python
import redis, json, os, time
from datetime import datetime

r = redis.Redis(host=os.getenv('REDIS_HOST', 'redis'), decode_responses=True)
print("🔧 Worker started. Waiting for jobs...")

while True:
    # BRPOP: block until a job arrives (up to 5s timeout)
    result = r.brpop('job_queue', timeout=5)
    if result:
        _, raw = result
        job = json.loads(raw)
        print(f"⚙️  Processing job {job['id']}: {job['task']} — {job['payload']}")
        time.sleep(2)  # simulate work
        job['completed_at'] = datetime.now().isoformat()
        job['status'] = 'done'
        r.lpush('jobs_done', json.dumps(job))
        r.ltrim('jobs_done', 0, 99)  # keep last 100
        print(f"✅ Job {job['id']} done!")
```

### Run & Test
```bash
docker compose up -d --build

# Submit jobs
curl -X POST http://localhost:5002/jobs \
  -H "Content-Type: application/json" \
  -d '{"task": "send_email", "payload": "user@example.com"}'

# Watch the worker process it
docker compose logs -f worker

# See completed jobs
curl http://localhost:5002/jobs

# Scale to 3 workers!
docker compose up -d --scale worker=3
```

---

## 🏆 App 4 — Leaderboard API

**Stack:** FastAPI + PostgreSQL + Redis

**What you'll learn:** Combining a persistent SQL database with a Redis cache layer. Scores are stored permanently in PostgreSQL but the top-10 leaderboard is cached in Redis (sorted sets) for millisecond-fast reads. This is exactly how gaming leaderboards work.

### Project Structure
```
04-leaderboard/
├── app/
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── .env.example
└── docker-compose.yml
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: leaderboard
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes: [pg-data:/var/lib/postgresql/data]
    networks: [lb-net]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    networks: [lb-net]

  api:
    build: ./app
    ports: ["8001:8000"]
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASS}@postgres/leaderboard
      REDIS_HOST: redis
    depends_on:
      postgres:
        condition: service_healthy
    networks: [lb-net]

volumes:
  pg-data:

networks:
  lb-net:
```

### `app/main.py`
```python
from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, Column, Integer, String, Float, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic import BaseModel
import redis, os

app = FastAPI(title="🏆 Leaderboard API", description="FastAPI + PostgreSQL + Redis")

engine = create_engine(os.getenv("DATABASE_URL"))
Session = sessionmaker(bind=engine)
Base = declarative_base()
r = redis.Redis(host=os.getenv("REDIS_HOST", "redis"), decode_responses=True)

class Score(Base):
    __tablename__ = "scores"
    id       = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, index=True)
    score    = Column(Float, default=0)

Base.metadata.create_all(engine)

class ScoreIn(BaseModel):
    username: str
    score: float

@app.post("/scores", status_code=201)
def submit_score(data: ScoreIn):
    db = Session()
    player = db.query(Score).filter_by(username=data.username).first()
    if player:
        if data.score > player.score:
            player.score = data.score
    else:
        db.add(Score(username=data.username, score=data.score))
    db.commit()
    db.close()
    # Update Redis sorted set
    r.zadd("leaderboard", {data.username: data.score})
    return {"username": data.username, "score": data.score}

@app.get("/leaderboard")
def get_leaderboard():
    # Redis ZREVRANGE: gets top 10 instantly (O(log n))
    top = r.zrevrange("leaderboard", 0, 9, withscores=True)
    if top:
        return [{"rank": i+1, "username": u, "score": s} for i, (u, s) in enumerate(top)]
    # Fallback to PostgreSQL
    db = Session()
    rows = db.query(Score).order_by(Score.score.desc()).limit(10).all()
    db.close()
    return [{"rank": i+1, "username": r.username, "score": r.score} for i, r in enumerate(rows)]

@app.get("/scores/{username}")
def get_score(username: str):
    rank = r.zrevrank("leaderboard", username)
    score = r.zscore("leaderboard", username)
    if score is None:
        raise HTTPException(status_code=404, detail="Player not found")
    return {"username": username, "score": score, "rank": rank + 1 if rank is not None else None}
```

### `.env.example`
```bash
DB_USER=apiuser
DB_PASS=apipass123
```

### Run & Test
```bash
docker compose up -d --build

# Submit scores
curl -X POST http://localhost:8001/scores -H "Content-Type: application/json" -d '{"username":"Alice","score":9500}'
curl -X POST http://localhost:8001/scores -H "Content-Type: application/json" -d '{"username":"Bob","score":8200}'
curl -X POST http://localhost:8001/scores -H "Content-Type: application/json" -d '{"username":"Charlie","score":9800}'

# Get leaderboard (served from Redis!)
curl http://localhost:8001/leaderboard

# Swagger UI
open http://localhost:8001/docs
```

---

## 📁 App 5 — File Upload Service

**Stack:** Node.js + MinIO (S3-compatible object storage)

**What you'll learn:** Object storage — the way files (images, PDFs, videos) are stored in production. MinIO is a self-hosted S3-compatible service. The same code works with AWS S3 in production by just changing the endpoint URL.

### Project Structure
```
05-file-upload/
├── app/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── .env.example
└── docker-compose.yml
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"       # S3 API
      - "9001:9001"       # MinIO Console UI
    environment:
      MINIO_ROOT_USER: ${MINIO_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_PASS}
    volumes: [minio-data:/data]
    networks: [upload-net]
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      retries: 5

  web:
    build: ./app
    ports: ["3002:3000"]
    environment:
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_ACCESS_KEY: ${MINIO_USER}
      MINIO_SECRET_KEY: ${MINIO_PASS}
      MINIO_BUCKET: uploads
    depends_on:
      minio:
        condition: service_healthy
    networks: [upload-net]

volumes:
  minio-data:

networks:
  upload-net:
```

### `app/server.js`
```javascript
const express = require('express');
const multer  = require('multer');
const Minio   = require('minio');
const path    = require('path');

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const minio = new Minio.Client({
  endPoint:  process.env.MINIO_ENDPOINT,
  port:      parseInt(process.env.MINIO_PORT),
  useSSL:    false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const BUCKET = process.env.MINIO_BUCKET;

// Ensure bucket exists on startup
(async () => {
  try {
    const exists = await minio.bucketExists(BUCKET);
    if (!exists) { await minio.makeBucket(BUCKET); console.log(`✅ Bucket '${BUCKET}' created`); }
    else console.log(`✅ Bucket '${BUCKET}' ready`);
  } catch (e) { console.error('MinIO init error:', e.message); }
})();

app.get('/', (req, res) => res.send(`
  <html><body style="font-family:Arial;max-width:600px;margin:50px auto">
  <h1>📁 File Upload Service</h1>
  <p>Node.js + MinIO (S3-compatible) | <a href="http://localhost:9001" target="_blank">🗄️ MinIO Console</a></p>
  <form action="/upload" method="POST" enctype="multipart/form-data">
    <input type="file" name="file" required style="padding:10px;margin:10px 0;display:block">
    <button type="submit" style="padding:10px 20px;background:#27ae60;color:white;border:none;cursor:pointer">Upload</button>
  </form>
  <br><a href="/files">📋 View all uploaded files</a></body></html>
`));

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  const filename = `${Date.now()}-${req.file.originalname}`;
  await minio.putObject(BUCKET, filename, req.file.buffer, req.file.size, { 'Content-Type': req.file.mimetype });
  const url = await minio.presignedGetObject(BUCKET, filename, 3600);
  res.send(`<h2>✅ Uploaded!</h2><p>File: <b>${filename}</b></p>
    <p><a href="${url}" target="_blank">🔗 Download Link (1hr)</a></p>
    <a href="/">← Upload another</a> | <a href="/files">📋 All files</a>`);
});

app.get('/files', async (req, res) => {
  const objects = [];
  const stream  = minio.listObjects(BUCKET);
  stream.on('data', obj => objects.push(obj));
  stream.on('end', async () => {
    const rows = await Promise.all(objects.map(async obj => {
      const url = await minio.presignedGetObject(BUCKET, obj.name, 3600);
      return `<tr><td>${obj.name}</td><td>${(obj.size/1024).toFixed(1)} KB</td>
              <td>${new Date(obj.lastModified).toLocaleString()}</td>
              <td><a href="${url}" target="_blank">Download</a></td></tr>`;
    }));
    res.send(`<html><body style="font-family:Arial;max-width:800px;margin:40px auto">
      <h2>📋 Uploaded Files (${objects.length})</h2>
      <table border="1" style="width:100%;border-collapse:collapse">
      <tr style="background:#f5f5f5"><th>Name</th><th>Size</th><th>Uploaded</th><th>Link</th></tr>
      ${rows.join('') || '<tr><td colspan="4">No files yet</td></tr>'}
      </table><br><a href="/">← Upload a file</a></body></html>`);
  });
});

app.listen(3000, () => console.log('📁 File upload service on port 3000'));
```

### `.env.example`
```bash
MINIO_USER=minioadmin
MINIO_PASS=minioadmin123
```

### Run & Test
```bash
docker compose up -d --build
# App:           http://localhost:3002
# MinIO Console: http://localhost:9001  (login: minioadmin / minioadmin123)
# Upload a file → see it appear in the MinIO console browser!
```

---

## 🔐 App 6 — Auth Service

**Stack:** Node.js + PostgreSQL + Redis

**What you'll learn:** JWT authentication with a Redis session cache. When a user logs in, a JWT is issued. When they make requests, the JWT is validated. Redis caches active sessions so logout (token revocation) works instantly without database queries.

### Project Structure
```
06-auth-service/
├── app/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── .env.example
└── docker-compose.yml
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: authdb
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes: [pg-data:/var/lib/postgresql/data]
    networks: [auth-net]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    networks: [auth-net]

  api:
    build: ./app
    ports: ["3003:3000"]
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASS}@postgres/authdb
      REDIS_HOST: redis
      JWT_SECRET: ${JWT_SECRET}
      TOKEN_TTL: 3600
    depends_on:
      postgres:
        condition: service_healthy
    networks: [auth-net]

volumes:
  pg-data:

networks:
  auth-net:
```

### `.env.example`
```bash
DB_USER=authuser
DB_PASS=authpass123
JWT_SECRET=supersecretjwtkey_changethis_in_production
```

### Run & Test
```bash
docker compose up -d --build

# Register a user
curl -X POST http://localhost:3003/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}'

# Login and get JWT token
TOKEN=$(curl -s -X POST http://localhost:3003/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}' | jq -r .token)

# Access protected route
curl http://localhost:3003/profile -H "Authorization: Bearer $TOKEN"

# Logout (revokes token in Redis immediately)
curl -X POST http://localhost:3003/logout -H "Authorization: Bearer $TOKEN"

# Try accessing again → 401 Unauthorized
curl http://localhost:3003/profile -H "Authorization: Bearer $TOKEN"

# Swagger docs
open http://localhost:3003/docs
```

---

## 📧 App 7 — Email Newsletter

**Stack:** Node.js + MySQL + Mailhog

**What you'll learn:** Sending emails in development without a real SMTP server. Mailhog acts as a fake email server — it catches all outgoing emails and shows them in a browser UI. The same code works with SendGrid/SES in production.

### Project Structure
```
07-email-newsletter/
├── app/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── .env.example
└── docker-compose.yml
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASS}
      MYSQL_DATABASE: newsletter
    volumes: [mysql-data:/var/lib/mysql]
    networks: [mail-net]
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-p${DB_PASS}"]
      interval: 10s
      retries: 5
      start_period: 30s

  mailhog:
    image: mailhog/mailhog
    ports:
      - "8025:8025"     # Web UI to view emails
      - "1025:1025"     # SMTP port (containers send here)
    networks: [mail-net]

  web:
    build: ./app
    ports: ["3004:3000"]
    environment:
      DB_HOST: mysql
      DB_USER: root
      DB_PASS: ${DB_PASS}
      DB_NAME: newsletter
      SMTP_HOST: mailhog
      SMTP_PORT: 1025
    depends_on:
      mysql:
        condition: service_healthy
    networks: [mail-net]

volumes:
  mysql-data:

networks:
  mail-net:
```

### `.env.example`
```bash
DB_PASS=mysqlpass123
```

### Run & Test
```bash
docker compose up -d --build
# App:     http://localhost:3004   (subscribe form)
# Mailhog: http://localhost:8025   (view sent emails!)

# Subscribe a test user
curl -X POST http://localhost:3004/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Send newsletter to all subscribers
curl -X POST http://localhost:3004/send \
  -H "Content-Type: application/json" \
  -d '{"subject":"Welcome!","body":"<h1>Hello from Docker!</h1>"}'

# Open Mailhog UI to see the email delivered in your browser!
open http://localhost:8025
```

---

## 📊 App 8 — Inventory Tracker + Grafana Dashboard

**Stack:** Flask + PostgreSQL + Prometheus + Grafana

**What you'll learn:** Metrics and observability. The Flask app exposes a `/metrics` endpoint. Prometheus scrapes it every 15 seconds. Grafana visualises the data in real-time dashboards. This is the industry-standard monitoring stack (used at Uber, Airbnb, GitLab).

### Project Structure
```
08-inventory-tracker/
├── app/
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
├── prometheus/
│   └── prometheus.yml
├── .env.example
└── docker-compose.yml
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: inventory
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes: [pg-data:/var/lib/postgresql/data]
    networks: [monitor-net]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 5s
      retries: 5

  app:
    build: ./app
    ports: ["5003:5000"]
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASS}@postgres/inventory
    depends_on:
      postgres:
        condition: service_healthy
    networks: [monitor-net]

  prometheus:
    image: prom/prometheus
    ports: ["9090:9090"]
    volumes: [./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml]
    networks: [monitor-net]

  grafana:
    image: grafana/grafana
    ports: ["3005:3000"]
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASS}
      GF_AUTH_ANONYMOUS_ENABLED: "true"
    volumes: [grafana-data:/var/lib/grafana]
    depends_on: [prometheus]
    networks: [monitor-net]

volumes:
  pg-data:
  grafana-data:

networks:
  monitor-net:
```

### `prometheus/prometheus.yml`
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'inventory-app'
    static_configs:
      - targets: ['app:5000']     # scrapes http://app:5000/metrics
```

### `.env.example`
```bash
DB_USER=invuser
DB_PASS=invpass123
GRAFANA_PASS=admin123
```

### Run & Test
```bash
docker compose up -d --build
# App:        http://localhost:5003
# Metrics:    http://localhost:5003/metrics
# Prometheus: http://localhost:9090
# Grafana:    http://localhost:3005  (admin / admin123)

# In Grafana:
# 1. Add data source → Prometheus → URL: http://prometheus:9090
# 2. Create dashboard → Add panel → Query: http_requests_total
# 3. Watch the graph update as you use the app!
```

---

## 🔀 App 9 — Microservices API Gateway

**Stack:** Nginx (Gateway) + Users Service (Node.js) + Products Service (Node.js) + Orders Service (Node.js)

**What you'll learn:** The API Gateway pattern — one public entry point that routes requests to multiple internal microservices. Each service has its own responsibility and database. Nginx routes `/api/users/*` → Users Service, `/api/products/*` → Products Service, etc.

### Project Structure
```
09-microservices/
├── gateway/
│   └── nginx.conf
├── users-service/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── products-service/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── orders-service/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:

  # ── Nginx API Gateway (only public-facing port) ──────────────
  gateway:
    image: nginx:alpine
    ports: ["8090:80"]
    volumes: [./gateway/nginx.conf:/etc/nginx/conf.d/default.conf]
    depends_on: [users-service, products-service, orders-service]
    networks: [ms-net]

  # ── Users Microservice ────────────────────────────────────────
  users-service:
    build: ./users-service
    environment: [SERVICE_NAME=users, PORT=3000]
    networks: [ms-net]
    # No ports exposed! Only reachable via gateway

  # ── Products Microservice ─────────────────────────────────────
  products-service:
    build: ./products-service
    environment: [SERVICE_NAME=products, PORT=3000]
    networks: [ms-net]

  # ── Orders Microservice ───────────────────────────────────────
  orders-service:
    build: ./orders-service
    environment: [SERVICE_NAME=orders, PORT=3000]
    networks: [ms-net]

networks:
  ms-net:
```

### `gateway/nginx.conf`
```nginx
upstream users    { server users-service:3000; }
upstream products { server products-service:3000; }
upstream orders   { server orders-service:3000; }

server {
    listen 80;

    # Route by URL prefix to correct microservice
    location /api/users/    { proxy_pass http://users/;    proxy_set_header Host $host; }
    location /api/products/ { proxy_pass http://products/; proxy_set_header Host $host; }
    location /api/orders/   { proxy_pass http://orders/;   proxy_set_header Host $host; }

    # Gateway health check
    location /health {
        return 200 '{"gateway":"ok","services":["users","products","orders"]}';
        add_header Content-Type application/json;
    }
}
```

### `users-service/server.js` _(same pattern for all 3 services)_
```javascript
const express = require('express');
const app = express();
app.use(express.json());

const SERVICE = process.env.SERVICE_NAME;

// In-memory store (would be a real DB per service in production)
let store = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob',   email: 'bob@example.com'   },
];
let nextId = 3;

app.get('/', (req, res) => res.json({ service: SERVICE, items: store }));
app.post('/', (req, res) => {
  const item = { id: nextId++, ...req.body, service: SERVICE };
  store.push(item);
  res.status(201).json(item);
});
app.get('/health', (req, res) => res.json({ status: 'ok', service: SERVICE }));

app.listen(process.env.PORT || 3000, () =>
  console.log(`🔵 ${SERVICE} service running on port ${process.env.PORT}`)
);
```

### Run & Test
```bash
docker compose up -d --build

# Everything goes through the gateway on port 8090
curl http://localhost:8090/health

curl http://localhost:8090/api/users/
curl http://localhost:8090/api/products/
curl http://localhost:8090/api/orders/

# Microservices are NOT directly accessible (no ports exposed)
# This is intentional — only the gateway is public
curl http://localhost:3000   # ❌ connection refused — correct!
```

---

## 🚀 App 10 — Full SaaS Starter

**Stack:** Next.js (Frontend) + FastAPI (Backend) + PostgreSQL + Redis + Nginx (Reverse Proxy)

**What you'll learn:** A production-ready full-stack architecture. Nginx serves as a reverse proxy, routing `/api/*` to FastAPI and everything else to Next.js. This is the architecture pattern behind most modern SaaS products.

### Project Structure
```
10-saas-starter/
├── frontend/
│   ├── pages/
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── nginx/
│   └── default.conf
├── .env.example
└── docker-compose.yml
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:

  # ── Nginx: single entry point for everything ─────────────────
  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes: [./nginx/default.conf:/etc/nginx/conf.d/default.conf]
    depends_on: [frontend, backend]
    networks: [saas-net]
    restart: unless-stopped

  # ── Next.js Frontend ──────────────────────────────────────────
  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: /api    # relative — routed via nginx
    networks: [saas-net]
    restart: unless-stopped

  # ── FastAPI Backend ───────────────────────────────────────────
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASS}@postgres/saasdb
      REDIS_HOST: redis
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      postgres:
        condition: service_healthy
    networks: [saas-net]
    restart: unless-stopped

  # ── PostgreSQL ────────────────────────────────────────────────
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: saasdb
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes: [pg-data:/var/lib/postgresql/data]
    networks: [saas-net]
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 5s
      retries: 5

  # ── Redis (sessions + cache) ──────────────────────────────────
  redis:
    image: redis:7-alpine
    volumes: [redis-data:/data]
    networks: [saas-net]
    restart: unless-stopped

volumes:
  pg-data:
  redis-data:

networks:
  saas-net:
```

### `nginx/default.conf`
```nginx
upstream frontend { server frontend:3000; }
upstream backend  { server backend:8000; }

server {
    listen 80;

    # API requests → FastAPI backend
    location /api/ {
        proxy_pass http://backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Everything else → Next.js frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";   # WebSocket support
    }
}
```

### `.env.example`
```bash
DB_USER=saasuser
DB_PASS=saaspass123
SECRET_KEY=your_super_secret_key_change_in_production
```

### Run & Test
```bash
docker compose up -d --build

# Everything on a single port via Nginx
open http://localhost

# Frontend:   http://localhost/
# API:        http://localhost/api/
# API Docs:   http://localhost/api/docs
# Health:     http://localhost/api/health

# View all running services
docker compose ps
```

**Traffic flow:**
```
Browser → http://localhost
              │
              ▼
        Nginx :80
        ├── /api/*  → FastAPI :8000  → PostgreSQL + Redis
        └── /*      → Next.js :3000
```

---

## 📋 All-Apps Quick Reference

```bash
# Run any app
cd 01-weather-dashboard && docker compose up -d --build

# Check what's running
docker compose ps

# Watch live logs
docker compose logs -f

# Stop and clean up
docker compose down        # keeps volumes
docker compose down -v     # deletes volumes too

# Rebuild after code change
docker compose up -d --build web    # rebuild just one service

# Open a shell inside a container
docker compose exec web sh
docker compose exec postgres psql -U admin

# Check resource usage
docker stats
```

---

## 🧠 Patterns Summary

| Pattern | Apps | Real-World Usage |
|---------|------|-----------------|
| **API Response Caching** | 1, 4 | News feeds, product listings, search results |
| **Background Job Queue** | 3 | Email sending, PDF generation, video encoding |
| **SQL + Cache Layer** | 4, 6, 10 | Any high-traffic app with a relational DB |
| **Object Storage** | 5 | Profile photos, file attachments, media hosting |
| **JWT + Session Revocation** | 6 | Any app with login/logout |
| **Dev Email Catching** | 7 | All apps that send emails during development |
| **Metrics + Dashboards** | 8 | Production monitoring for any service |
| **API Gateway** | 9 | Microservice architectures |
| **Reverse Proxy + Unified Port** | 9, 10 | All production deployments |

---

## 🏋️ Challenge Exercises

Once you have each app running, try these extensions to deepen your understanding:

**App 1 — Weather:** Add a `/history` endpoint that shows the last 10 searches stored in a Redis list.

**App 3 — Job Queue:** Scale the worker to 3 instances (`docker compose up --scale worker=3`) and submit 20 jobs. Watch them distribute across workers in the logs.

**App 4 — Leaderboard:** Stop the Redis container (`docker compose stop redis`) — does the API still work? What happens to read performance?

**App 5 — File Upload:** Log in to the MinIO Console (`:9001`), browse your bucket, and manually delete a file. Does the file list page update?

**App 8 — Metrics:** Add 10 items to the inventory. Go to Grafana and build a panel that shows the total number of items over time. Set a 5-second refresh rate and watch it update live.

**App 9 — Microservices:** Try accessing `http://localhost:3000` directly. It should fail — the service has no exposed port. This is intentional. Understand why this is a security feature.

**App 10 — SaaS Starter:** Add a second backend service and update `nginx.conf` to route `/api/v2/*` to it. You now have versioned API routing.

---

## 📚 References

| Resource | Link |
|---------|------|
| Docker Compose Spec | https://docs.docker.com/compose/compose-file/ |
| Awesome Compose Examples | https://github.com/docker/awesome-compose |
| MinIO Documentation | https://min.io/docs |
| Prometheus + Grafana Setup | https://grafana.com/docs/grafana/latest/getting-started/get-started-grafana-prometheus |
| Mailhog | https://github.com/mailhog/MailHog |

---

*Ten apps. Ten patterns. One tool. You now have a working reference for the most common real-world Docker Compose architectures. 🐳*