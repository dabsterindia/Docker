# 🐳 Day 8 — Docker Compose: Full-Stack App Projects

> **Goal for today:** Build real full-stack applications using Docker Compose. Start with the classic Flask + Redis counter, then level up through 4 progressively richer projects — each teaching a new pattern used in real production systems.

---

## 🗺️ What You'll Build Today

| Project | Stack | What You Learn |
|---------|-------|---------------|
| **1. Visit Counter** | Flask + Redis | Compose basics, service communication |
| **2. Todo App** | Node.js + MongoDB + Mongo Express | CRUD with a NoSQL database + admin UI |
| **3. Real-time Chat** | Node.js + Redis Pub/Sub + Socket.io | Event-driven messaging between services |
| **4. REST API** | FastAPI + PostgreSQL + pgAdmin | SQL database, API docs, DB admin UI |
| **5. Blog Platform** | PHP + MySQL + Nginx + phpMyAdmin | Classic LAMP-style stack, reverse proxy |

---

## 📦 Project 1 — Flask + Redis Visit Counter

The classic beginner project. A Flask web app that counts page visits using Redis as a fast in-memory counter.

### What It Demonstrates
- Basic two-service Compose setup
- Service DNS resolution (`redis` hostname)
- How to go from manual Docker commands → Compose

### Project Structure

```
visit-counter/
├── app.py
├── requirements.txt
├── Dockerfile
├── .dockerignore
└── docker-compose.yml
```

### `app.py`

```python
from flask import Flask
import redis
import os

app = Flask(__name__)

# 'redis' resolves to the Redis container via Docker DNS
cache = redis.Redis(
    host=os.getenv('REDIS_HOST', 'redis'),
    port=int(os.getenv('REDIS_PORT', 6379))
)

@app.route('/')
def hello():
    count = cache.incr('hits')
    return f'''
    <html>
    <body style="font-family:Arial; text-align:center; margin-top:100px">
        <h1>🐳 Flask + Redis Counter</h1>
        <h2>This page has been visited <span style="color:#e74c3c">{count}</span> times.</h2>
        <p style="color:gray">Powered by Docker Compose</p>
        <button onclick="location.reload()" style="padding:10px 20px;font-size:16px;cursor:pointer">
            Refresh to increment ↺
        </button>
    </body>
    </html>
    '''

@app.route('/reset')
def reset():
    cache.set('hits', 0)
    return '<h2>✅ Counter reset! <a href="/">Go back</a></h2>'

@app.route('/health')
def health():
    return {'status': 'ok', 'service': 'visit-counter'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

### `requirements.txt`

```
flask==2.3.0
redis==4.5.0
```

### `Dockerfile`

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 5000

CMD ["python", "app.py"]
```

### `.dockerignore`

```
__pycache__/
*.pyc
.env
*.log
```

---

### Part A — The Manual Way (Do This First!)

Before using Compose, do it manually so you appreciate what Compose saves you from:

```bash
# Step 1: Create a network
docker network create myapp-network

# Step 2: Run Redis on that network
docker run -d \
  --name redis \
  --network myapp-network \
  redis:alpine

# Step 3: Build and run the Flask app
docker build -t flask-app .
docker run -d \
  -p 5000:5000 \
  --name web \
  --network myapp-network \
  flask-app

# Step 4: Test it
curl http://localhost:5000
# Refresh a few times to see the counter go up

# Step 5: Clean up (before using Compose)
docker rm -f web redis
docker network rm myapp-network
```

That's **6 commands** just to start two services. Now imagine 5 services with 10 flags each.

---

### Part B — The Compose Way

```yaml
# docker-compose.yml
version: '3.8'

services:

  web:
    build: .
    ports:
      - "5000:5000"
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      - redis
    networks:
      - myapp-network
    restart: unless-stopped

  redis:
    image: redis:alpine
    volumes:
      - redis-data:/data     # persist counter across restarts!
    networks:
      - myapp-network
    restart: unless-stopped

volumes:
  redis-data:

networks:
  myapp-network:
```

```bash
# 1 command replaces the 6 above:
docker compose up -d --build

# Test
curl http://localhost:5000
curl http://localhost:5000/reset   # reset the counter

# View logs
docker compose logs -f

# Stop everything
docker compose down
```

> 💡 **Notice:** The Redis volume `redis-data` means the counter survives even if you do `docker compose down` and `docker compose up` again. Without the volume, the count resets to zero every restart.

---

## 📝 Project 2 — Todo App (Node.js + MongoDB + Mongo Express)

A classic CRUD application. Create, read, and delete todo items stored in MongoDB with a visual database admin panel.

### What It Demonstrates
- NoSQL database (MongoDB) integration
- Admin UI sidecar pattern (Mongo Express)
- REST API design within Docker Compose

### Project Structure

```
todo-app/
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
version: '3.8'

services:

  # ─── MongoDB Database ─────────────────────────────────────────
  mongo:
    image: mongo:6.0
    container_name: todo-mongo
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: tododb
    volumes:
      - mongo-data:/data/db
    networks:
      - todo-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

  # ─── Mongo Express (Admin UI) ─────────────────────────────────
  mongo-express:
    image: mongo-express:latest
    container_name: todo-mongo-ui
    ports:
      - "8081:8081"
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: ${MONGO_USER}
      ME_CONFIG_MONGODB_ADMINPASSWORD: ${MONGO_PASSWORD}
      ME_CONFIG_MONGODB_URL: mongodb://${MONGO_USER}:${MONGO_PASSWORD}@mongo:27017/
      ME_CONFIG_BASICAUTH: false
    depends_on:
      mongo:
        condition: service_healthy
    networks:
      - todo-network
    restart: unless-stopped

  # ─── Node.js Web App ──────────────────────────────────────────
  web:
    build: ./app
    container_name: todo-web
    ports:
      - "3000:3000"
    environment:
      MONGO_URI: mongodb://${MONGO_USER}:${MONGO_PASSWORD}@mongo:27017/tododb?authSource=admin
    depends_on:
      mongo:
        condition: service_healthy
    networks:
      - todo-network
    restart: unless-stopped

volumes:
  mongo-data:

networks:
  todo-network:
```

### `.env`

```bash
MONGO_USER=admin
MONGO_PASSWORD=secret123
```

### `app/package.json`

```json
{
  "name": "todo-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0"
  }
}
```

### `app/index.js`

```javascript
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── MongoDB Connection ────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ─── Todo Schema ──────────────────────────────────────────────
const Todo = mongoose.model('Todo', new mongoose.Schema({
  text: { type: String, required: true },
  done: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}));

// ─── Homepage with Todo List ──────────────────────────────────
app.get('/', async (req, res) => {
  const todos = await Todo.find().sort({ createdAt: -1 });
  const items = todos.map(t => `
    <li style="padding:8px;margin:4px 0;background:${t.done ? '#d5f5d5' : '#fff'};border-radius:4px;display:flex;justify-content:space-between;align-items:center">
      <span style="text-decoration:${t.done ? 'line-through' : 'none'}">${t.text}</span>
      <span>
        <a href="/toggle/${t._id}" style="margin-right:8px">${t.done ? '↩ Undo' : '✅ Done'}</a>
        <a href="/delete/${t._id}" style="color:red">🗑 Delete</a>
      </span>
    </li>
  `).join('');

  res.send(`
    <!DOCTYPE html><html>
    <head><title>📝 Todo App</title>
    <style>body{font-family:Arial;max-width:600px;margin:40px auto;padding:20px}
    input{width:70%;padding:10px;font-size:16px}
    button{padding:10px 16px;background:#3498db;color:white;border:none;font-size:16px;cursor:pointer;border-radius:4px}
    a{text-decoration:none;color:#3498db}</style>
    </head><body>
      <h1>📝 Todo App</h1>
      <p>Node.js + MongoDB + Docker Compose | <a href="http://localhost:8081" target="_blank">🔍 View in Mongo Express</a></p>
      <form action="/add" method="POST">
        <input name="text" placeholder="What needs to be done?" required />
        <button type="submit">Add</button>
      </form>
      <ul style="list-style:none;padding:0;margin-top:20px">${items || '<li>No todos yet — add one above!</li>'}</ul>
      <p style="color:gray;margin-top:20px">Total: ${todos.length} | Done: ${todos.filter(t => t.done).length}</p>
    </body></html>
  `);
});

app.post('/add', async (req, res) => {
  await Todo.create({ text: req.body.text });
  res.redirect('/');
});

app.get('/toggle/:id', async (req, res) => {
  const todo = await Todo.findById(req.params.id);
  await Todo.findByIdAndUpdate(req.params.id, { done: !todo.done });
  res.redirect('/');
});

app.get('/delete/:id', async (req, res) => {
  await Todo.findByIdAndDelete(req.params.id);
  res.redirect('/');
});

app.listen(3000, () => console.log('🌐 Todo app running on port 3000'));
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

### Running It

```bash
cd todo-app
docker compose up -d --build

# App:        http://localhost:3000
# Mongo UI:   http://localhost:8081
```

---

## 💬 Project 3 — Real-Time Chat App (Node.js + Redis Pub/Sub + Socket.io)

A real-time multi-room chat app. Messages are broadcast via Redis Pub/Sub — the industry pattern for scaling chat and live notifications.

### What It Demonstrates
- Redis Pub/Sub (publish/subscribe messaging)
- WebSockets with Socket.io
- Real-time event-driven architecture in Docker

### Project Structure

```
chat-app/
├── app/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── .dockerignore
└── docker-compose.yml
```

### `docker-compose.yml`

```yaml
version: '3.8'

services:

  redis:
    image: redis:7-alpine
    container_name: chat-redis
    networks:
      - chat-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  web:
    build: ./app
    container_name: chat-web
    ports:
      - "4000:4000"
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - chat-network
    restart: unless-stopped

networks:
  chat-network:
```

### `app/package.json`

```json
{
  "name": "chat-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1",
    "redis": "^4.6.7"
  }
}
```

### `app/server.js`

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ─── Redis Pub/Sub Clients ─────────────────────────────────────
// Two clients needed: one to publish, one to subscribe
const publisher = createClient({ socket: { host: process.env.REDIS_HOST, port: +process.env.REDIS_PORT } });
const subscriber = createClient({ socket: { host: process.env.REDIS_HOST, port: +process.env.REDIS_PORT } });

Promise.all([publisher.connect(), subscriber.connect()])
  .then(async () => {
    console.log('✅ Redis Pub/Sub connected');
    // Subscribe to the 'chat' channel
    await subscriber.subscribe('chat', (message) => {
      // Broadcast every Redis message to all connected browsers
      io.emit('message', JSON.parse(message));
    });
  });

// ─── Serve HTML Chat UI ───────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html><html>
    <head>
      <title>💬 Docker Chat</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial; margin: 0; display: flex; flex-direction: column; height: 100vh; background: #f0f2f5; }
        #header { background: #2c3e50; color: white; padding: 15px 20px; }
        #messages { flex: 1; overflow-y: auto; padding: 20px; }
        .msg { background: white; padding: 10px 14px; border-radius: 8px; margin: 6px 0; max-width: 70%; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .msg .name { font-weight: bold; color: #2980b9; margin-bottom: 3px; font-size: 13px; }
        .msg .time { color: #aaa; font-size: 11px; float: right; }
        #form { display: flex; padding: 15px; background: white; border-top: 1px solid #ddd; gap: 10px; }
        #username, #text { padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 15px; }
        #username { width: 140px; }
        #text { flex: 1; }
        button { padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 15px; }
      </style>
    </head>
    <body>
      <div id="header"><h2 style="margin:0">💬 Real-Time Chat — Powered by Redis Pub/Sub + Docker</h2></div>
      <div id="messages"></div>
      <div id="form">
        <input id="username" placeholder="Your name" value="User${Math.floor(Math.random()*100)}" />
        <input id="text" placeholder="Type a message..." autocomplete="off" />
        <button onclick="send()">Send ➤</button>
      </div>
      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io();
        socket.on('message', ({ name, text, time }) => {
          const div = document.createElement('div');
          div.className = 'msg';
          div.innerHTML = \`<div class="name">\${name} <span class="time">\${time}</span></div>\${text}\`;
          document.getElementById('messages').appendChild(div);
          div.scrollIntoView();
        });
        function send() {
          const text = document.getElementById('text').value.trim();
          const name = document.getElementById('username').value.trim() || 'Anonymous';
          if (!text) return;
          socket.emit('send', { name, text });
          document.getElementById('text').value = '';
        }
        document.getElementById('text').addEventListener('keypress', e => {
          if (e.key === 'Enter') send();
        });
      </script>
    </body></html>
  `);
});

// ─── Receive Message from Browser → Publish to Redis ──────────
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  socket.on('send', ({ name, text }) => {
    publisher.publish('chat', JSON.stringify({
      name,
      text,
      time: new Date().toLocaleTimeString()
    }));
  });
  socket.on('disconnect', () => console.log('👋 User disconnected:', socket.id));
});

server.listen(4000, () => console.log('💬 Chat app running on port 4000'));
```

### `app/Dockerfile`

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY server.js .
EXPOSE 4000
CMD ["node", "server.js"]
```

### Running It

```bash
cd chat-app
docker compose up -d --build

# Chat app: http://localhost:4000
# Open in two browser tabs — type in one, see it in both! ⚡
```

> 💡 **How Redis Pub/Sub works here:** When a user sends a message, the Node.js server *publishes* it to a Redis channel. The subscriber client receives it and *broadcasts* to all connected browsers via Socket.io. This is the same pattern used by Slack, Discord, and most real-time apps.

---

## 🔬 Project 4 — REST API (FastAPI + PostgreSQL + pgAdmin)

A production-style REST API with automatic docs, a proper relational database, and a visual DB admin panel.

### What It Demonstrates
- FastAPI with auto-generated Swagger UI
- PostgreSQL (industry-standard relational DB)
- pgAdmin (visual database admin)
- Database migrations via SQLAlchemy ORM

### Project Structure

```
rest-api/
├── app/
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── .env
├── .dockerignore
└── docker-compose.yml
```

### `docker-compose.yml`

```yaml
version: '3.8'

services:

  # ─── PostgreSQL ───────────────────────────────────────────────
  postgres:
    image: postgres:15-alpine
    container_name: api-postgres
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: apidb
    volumes:
      - pg-data:/var/lib/postgresql/data
    networks:
      - api-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d apidb"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  # ─── pgAdmin (DB Admin UI) ────────────────────────────────────
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: api-pgadmin
    ports:
      - "5050:80"
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: ${DB_PASSWORD}
    depends_on:
      - postgres
    networks:
      - api-network
    restart: unless-stopped

  # ─── FastAPI App ──────────────────────────────────────────────
  api:
    build: ./app
    container_name: api-fastapi
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/apidb
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - api-network
    restart: unless-stopped
    volumes:
      - ./app:/app   # bind mount for live reload in development

volumes:
  pg-data:

networks:
  api-network:
```

### `.env`

```bash
DB_USER=apiuser
DB_PASSWORD=apipassword123
```

### `app/requirements.txt`

```
fastapi==0.103.1
uvicorn==0.23.2
sqlalchemy==2.0.20
psycopg2-binary==2.9.7
pydantic==2.3.0
```

### `app/main.py`

```python
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
import os

DATABASE_URL = os.getenv("DATABASE_URL")

# ─── Database Setup ────────────────────────────────────────────
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ─── Database Model (Table) ────────────────────────────────────
class TaskDB(Base):
    __tablename__ = "tasks"
    id         = Column(Integer, primary_key=True, index=True)
    title      = Column(String(200), nullable=False)
    description = Column(String(500), default="")
    completed  = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)   # auto-creates table on startup

# ─── Pydantic Schemas (Request/Response models) ────────────────
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None

class TaskResponse(BaseModel):
    id: int
    title: str
    description: str
    completed: bool
    created_at: datetime
    class Config:
        from_attributes = True

# ─── Dependency: DB Session ────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─── FastAPI App ───────────────────────────────────────────────
app = FastAPI(
    title="📋 Task Manager API",
    description="A REST API built with FastAPI + PostgreSQL + Docker Compose",
    version="1.0.0"
)

@app.get("/", tags=["Info"])
def root():
    return {
        "message": "📋 Task Manager API",
        "docs": "/docs",
        "redoc": "/redoc",
        "database": "PostgreSQL (via Docker)"
    }

@app.get("/tasks", response_model=List[TaskResponse], tags=["Tasks"])
def get_tasks(db: Session = Depends(get_db)):
    return db.query(TaskDB).order_by(TaskDB.created_at.desc()).all()

@app.post("/tasks", response_model=TaskResponse, status_code=201, tags=["Tasks"])
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    db_task = TaskDB(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.get("/tasks/{task_id}", response_model=TaskResponse, tags=["Tasks"])
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.patch("/tasks/{task_id}", response_model=TaskResponse, tags=["Tasks"])
def update_task(task_id: int, task: TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, value in task.dict(exclude_unset=True).items():
        setattr(db_task, field, value)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.delete("/tasks/{task_id}", tags=["Tasks"])
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": f"Task {task_id} deleted"}

@app.get("/health", tags=["Info"])
def health():
    return {"status": "ok", "service": "task-api", "db": "postgresql"}
```

### `app/Dockerfile`

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### Running It

```bash
cd rest-api
docker compose up -d --build

# API:           http://localhost:8000
# Swagger Docs:  http://localhost:8000/docs   ← interactive API explorer!
# ReDoc:         http://localhost:8000/redoc
# pgAdmin:       http://localhost:5050
#                Login: admin@admin.com / apipassword123
```

```bash
# Test the API with curl
# Create a task
curl -X POST http://localhost:8000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Docker Compose", "description": "Complete Day 8"}'

# Get all tasks
curl http://localhost:8000/tasks

# Mark as complete (use the id from the create response)
curl -X PATCH http://localhost:8000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# Delete a task
curl -X DELETE http://localhost:8000/tasks/1
```

---

## 📰 Project 5 — Blog Platform (PHP + MySQL + Nginx + phpMyAdmin)

A classic LAMP-style blog — the architecture that powers WordPress and millions of websites. This shows how Nginx acts as a reverse proxy in front of PHP.

### What It Demonstrates
- Nginx as a reverse proxy in front of PHP-FPM
- Classic PHP + MySQL stack in containers
- phpMyAdmin for database management
- How to configure Nginx via a mounted config file

### Project Structure

```
blog-platform/
├── app/
│   ├── index.php
│   └── post.php
├── nginx/
│   └── default.conf
├── .env
└── docker-compose.yml
```

### `docker-compose.yml`

```yaml
version: '3.8'

services:

  # ─── Nginx (Reverse Proxy / Web Server) ───────────────────────
  nginx:
    image: nginx:alpine
    container_name: blog-nginx
    ports:
      - "8080:80"
    volumes:
      - ./app:/var/www/html                     # serve PHP files
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf  # custom config
    depends_on:
      - php
    networks:
      - blog-network
    restart: unless-stopped

  # ─── PHP-FPM (PHP Processor) ──────────────────────────────────
  php:
    image: php:8.2-fpm-alpine
    container_name: blog-php
    volumes:
      - ./app:/var/www/html                     # same files as nginx
    networks:
      - blog-network
    restart: unless-stopped
    # Install PDO MySQL extension for PHP
    command: >
      sh -c "docker-php-ext-install pdo pdo_mysql && php-fpm"

  # ─── MySQL Database ───────────────────────────────────────────
  mysql:
    image: mysql:8.0
    container_name: blog-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: blogdb
      MYSQL_USER: bloguser
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
    networks:
      - blog-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-p${DB_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  # ─── phpMyAdmin ───────────────────────────────────────────────
  phpmyadmin:
    image: phpmyadmin:latest
    container_name: blog-pma
    ports:
      - "8181:80"
    environment:
      PMA_HOST: mysql
      PMA_USER: root
      PMA_PASSWORD: ${DB_PASSWORD}
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - blog-network
    restart: unless-stopped

volumes:
  mysql-data:

networks:
  blog-network:
```

### `nginx/default.conf`

```nginx
server {
    listen 80;
    server_name localhost;
    root /var/www/html;
    index index.php index.html;

    # Pass PHP requests to PHP-FPM container
    location ~ \.php$ {
        fastcgi_pass php:9000;         # 'php' resolves via Docker DNS!
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

### `.env`

```bash
DB_PASSWORD=blogpassword123
```

### `app/index.php`

```php
<?php
$dsn = "mysql:host=mysql;dbname=blogdb;charset=utf8mb4";
$pdo = new PDO($dsn, 'root', getenv('MYSQL_ROOT_PASSWORD') ?: 'blogpassword123');

// Create posts table if it doesn't exist
$pdo->exec("CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(100) DEFAULT 'Anonymous',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

// Handle new post submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $stmt = $pdo->prepare("INSERT INTO posts (title, content, author) VALUES (?, ?, ?)");
    $stmt->execute([$_POST['title'], $_POST['content'], $_POST['author'] ?? 'Anonymous']);
    header("Location: /");
    exit;
}

// Fetch all posts
$posts = $pdo->query("SELECT * FROM posts ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html>
<head>
    <title>🐳 Docker Blog</title>
    <style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 20px; background: #f9f9f9; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .post { background: white; padding: 20px; margin: 15px 0; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
        .post h2 { margin: 0 0 8px; color: #2c3e50; }
        .meta { color: #888; font-size: 13px; margin-bottom: 10px; }
        form { background: white; padding: 20px; border-radius: 6px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
        input, textarea { width: 100%; padding: 10px; margin: 6px 0 14px; border: 1px solid #ddd; border-radius: 4px; font-size: 15px; font-family: inherit; }
        textarea { height: 120px; resize: vertical; }
        button { background: #3498db; color: white; padding: 10px 24px; border: none; border-radius: 4px; font-size: 15px; cursor: pointer; }
        .badge { background: #e8f4fd; color: #2980b9; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
    </style>
</head>
<body>
    <h1>📰 Docker Blog <span class="badge">PHP + MySQL + Nginx</span></h1>
    <p>Running inside Docker Compose | <a href="http://localhost:8181" target="_blank">🗄️ phpMyAdmin</a></p>

    <form method="POST">
        <h3 style="margin-top:0">✏️ Write a New Post</h3>
        <input name="author" placeholder="Your name" required />
        <input name="title" placeholder="Post title" required />
        <textarea name="content" placeholder="Write your post here..." required></textarea>
        <button type="submit">Publish Post →</button>
    </form>

    <?php if (empty($posts)): ?>
        <p style="color:#888">No posts yet — write the first one above!</p>
    <?php else: ?>
        <?php foreach ($posts as $post): ?>
        <div class="post">
            <h2><?= htmlspecialchars($post['title']) ?></h2>
            <div class="meta">By <b><?= htmlspecialchars($post['author']) ?></b> • <?= $post['created_at'] ?></div>
            <p><?= nl2br(htmlspecialchars($post['content'])) ?></p>
        </div>
        <?php endforeach; ?>
    <?php endif; ?>
</body>
</html>
```

### Running It

```bash
cd blog-platform
docker compose up -d

# Blog:       http://localhost:8080
# phpMyAdmin: http://localhost:8181
```

---

## 📊 All Projects — Quick Reference

| Project | Run Command | URLs |
|---------|-------------|------|
| **1. Visit Counter** | `docker compose up -d --build` | App: `:5000` |
| **2. Todo App** | `docker compose up -d --build` | App: `:3000` • Mongo UI: `:8081` |
| **3. Chat App** | `docker compose up -d --build` | Chat: `:4000` |
| **4. REST API** | `docker compose up -d --build` | API: `:8000` • Docs: `:8000/docs` • pgAdmin: `:5050` |
| **5. Blog Platform** | `docker compose up -d` | Blog: `:8080` • phpMyAdmin: `:8181` |

---

## 🧠 Patterns You Learned Today

Each project taught a specific architecture pattern used in real systems:

```
Project 1 — Visit Counter
  Pattern: In-memory counter/cache with Redis
  Used in: Hit counters, rate limiters, leaderboards

Project 2 — Todo App
  Pattern: CRUD app with NoSQL + Admin UI sidecar
  Used in: Any app that needs a quick DB browser alongside it

Project 3 — Chat App
  Pattern: Pub/Sub for real-time broadcast
  Used in: Chat, live notifications, stock tickers, dashboards

Project 4 — REST API
  Pattern: API + SQL DB + auto-generated docs
  Used in: Microservices, mobile backends, data APIs

Project 5 — Blog Platform
  Pattern: Nginx reverse proxy in front of app server
  Used in: PHP apps, Python/Ruby apps — any time you need a
           web server to handle static files and pass dynamic
           requests to the app container
```

---

## ✅ Practice Exercise — The Full Comparison

1. **Project 1 only:** Start the visit counter manually (Part A), then with Compose (Part B). Time both approaches.
2. **Project 4:** Open `http://localhost:8000/docs` — use the Swagger UI to create, update, and delete tasks without writing a single curl command.
3. **Project 3:** Open two browser tabs at `http://localhost:4000` and chat between them. Then run `docker compose exec redis redis-cli SUBSCRIBE chat` and watch raw Redis messages appear as you chat.
4. **All projects:** Run `docker compose ps` across projects — notice the consistent, clean output regardless of the stack.

---

## 📚 References & Further Reading

| Resource | Link |
|---------|------|
| Awesome Compose Examples | https://github.com/docker/awesome-compose |
| FastAPI Official Docs | https://fastapi.tiangolo.com |
| Socket.io + Redis Adapter | https://socket.io/docs/v4/redis-adapter/ |
| MongoDB Docker Hub | https://hub.docker.com/_/mongo |
| PostgreSQL Docker Hub | https://hub.docker.com/_/postgres |

---
*You just built 5 full-stack apps — each in under 5 minutes. That's the power of Docker Compose. 🚀*

---
## ⏭️ What's Next — Day 9 Preview

On Day 9, you'll explore **Docker in CI/CD Pipelines**:
- Automatically build and push images on every `git push`
- Write a GitHub Actions workflow that builds, tests, and pushes to Docker Hub or GHCR
- Run your test suite inside a container as part of the pipeline
- Environment-specific tagging: `dev`, `staging`, `prod`

---

