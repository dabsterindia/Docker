# 🐳 Day 6 — Docker Volumes & Networking

> **Goal for today:** Understand how to persist data beyond a container's lifecycle using Volumes, and how to make containers securely communicate with each other using custom Networks.

---

## 🧠 The Problem: Containers Are Temporary

By default, **everything inside a container is lost when it's deleted**. Try this experiment:

```bash
# Start an nginx container and create a file inside it
docker run -d --name temp-container nginx
docker exec temp-container bash -c "echo 'Important data' > /app/data.txt"
docker exec temp-container cat /app/data.txt
# Output: Important data ✅

# Now delete the container
docker rm -f temp-container

# Start a fresh container — the file is gone
docker run -d --name temp-container nginx
docker exec temp-container cat /app/data.txt
# Output: cat: /app/data.txt: No such file or directory ❌
```

This is a fundamental design choice — containers are **stateless and ephemeral** by nature. This is great for app code (easy to update, scale, replace), but a disaster for databases and user-generated data.

**Docker Volumes solve this.** They store data *outside* the container so it survives container deletion, crashes, and upgrades.

---

## 💾 Types of Docker Storage Mounts

Docker provides three ways to mount storage into a container:

```
┌─────────────────────────────────────────────────────────────────┐
│                        HOST MACHINE                              │
│                                                                  │
│  ┌──────────────┐   ┌─────────────────┐   ┌─────────────────┐  │
│  │Docker-managed│   │  Your filesystem │   │  RAM (memory)   │  │
│  │  Volume      │   │  (Bind Mount)    │   │  (tmpfs)        │  │
│  │              │   │                  │   │                 │  │
│  │/var/lib/     │   │/home/user/app    │   │  (no disk)      │  │
│  │docker/volumes│   │                  │   │                 │  │
│  └──────┬───────┘   └────────┬─────────┘   └───────┬─────────┘  │
│         │                    │                      │            │
└─────────┼────────────────────┼──────────────────────┼────────────┘
          │                    │                      │
          ▼                    ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        CONTAINER                                 │
│   /app/data           /app/src           /tmp/cache              │
└─────────────────────────────────────────────────────────────────┘
```

| Type | Managed By | Stored At | Best For |
|------|-----------|-----------|----------|
| **Volume** | Docker | `/var/lib/docker/volumes/` | Databases, production data |
| **Bind Mount** | You | Anywhere on your host | Local development |
| **tmpfs** | OS (RAM) | Memory only | Sensitive temp data, caches |

---

## 📂 Type 1: Named Volumes (Best for Production)

Docker manages the storage location completely. You just give it a name.

### Volume Commands

```bash
# Create a named volume
docker volume create my-data

# List all volumes
docker volume ls
# Output:
# DRIVER    VOLUME NAME
# local     my-data
# local     mysql-data

# Inspect a volume — see where data actually lives on disk
docker volume inspect my-data
# Output:
# [
#   {
#     "Name": "my-data",
#     "Driver": "local",
#     "Mountpoint": "/var/lib/docker/volumes/my-data/_data",
#     "Scope": "local"
#   }
# ]

# Run a container with the volume mounted
docker run -d \
  -v my-data:/app/data \
  --name my-app \
  nginx

# Remove a specific volume (must not be in use)
docker volume rm my-data

# Remove ALL unused volumes (careful!)
docker volume prune
```

### Where Are Volumes Stored?

```
Linux:
/var/lib/docker/volumes/<volume-name>/_data

macOS / Windows:
Docker runs in a Linux VM — volumes live inside that VM.
You still access them with docker volume commands.
Use: docker volume inspect <name> to find the exact path.
```

---

## 🗄️ Example 1: Persistent MySQL Database (Named Volume)

### The Problem Without a Volume

```bash
# Start MySQL, create a database, then delete the container
docker run -d --name temp-mysql -e MYSQL_ROOT_PASSWORD=secret mysql:8.0
# ... create tables, insert data ...
docker rm -f temp-mysql
# All your data is gone! 😱
```

### The Solution — Named Volume

```bash
docker run -d \
  --name mysql-db \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=appdb \
  -v mysql-data:/var/lib/mysql \
  mysql:8.0
```

**Line-by-line breakdown:**

```
docker run -d              → Run in background (detached mode)
  --name mysql-db          → Friendly container name for easy management
  -e MYSQL_ROOT_PASSWORD=secret  → Required env var: sets root password
  -e MYSQL_DATABASE=appdb  → Auto-creates a database named 'appdb' on startup
  -v mysql-data:/var/lib/mysql   → 🔑 KEY: Mount named volume to MySQL's data directory
  mysql:8.0                → Use official MySQL 8.0 image
```

**The `-v` flag explained:**
```
-v mysql-data:/var/lib/mysql
    │              │
    │              └── Path INSIDE the container (where MySQL writes data)
    └── Name of the Docker-managed volume on your HOST
```

### Proof That Data Persists

```bash
# Step 1: Connect to MySQL and create a test table
docker exec -it mysql-db mysql -u root -psecret appdb

# Inside MySQL prompt:
CREATE TABLE users (id INT, name VARCHAR(50));
INSERT INTO users VALUES (1, 'Alice'), (2, 'Bob');
SELECT * FROM users;
# Output: Alice, Bob ✅
exit

# Step 2: Delete the container entirely
docker rm -f mysql-db

# Step 3: Check — volume still exists!
docker volume ls
# DRIVER    VOLUME NAME
# local     mysql-data  ← still here! ✅

# Step 4: Start a brand new MySQL container with the same volume
docker run -d \
  --name mysql-db-new \
  -e MYSQL_ROOT_PASSWORD=secret \
  -v mysql-data:/var/lib/mysql \
  mysql:8.0

# Step 5: Connect and verify data is intact
docker exec -it mysql-db-new mysql -u root -psecret appdb
SELECT * FROM users;
# Output: Alice, Bob ← data survived! 🎉
```

### How Volume Attachment Works

```
Host Machine
──────────────────────────────────────────────────────────
  /var/lib/docker/volumes/mysql-data/_data/
  ├── ibdata1
  ├── ib_logfile0
  ├── mysql/
  ├── performance_schema/
  └── appdb/         ← your database files live here
          │
          │  Docker mounts this directory into the container
          ▼
Container: /var/lib/mysql/
  MySQL thinks: "This is my local data folder"
  But actually: "This lives safely outside me on the host"
```

**Real-life use cases for named volumes:**
- ✅ Production databases (MySQL, PostgreSQL, MongoDB)
- ✅ Message queues (Redis, RabbitMQ)
- ✅ Search engines (Elasticsearch)
- ✅ Any stateful service where data loss is unacceptable

---

## 📁 Type 2: Bind Mounts (Best for Development)

Bind mounts map a **specific directory on your host machine** directly into the container. Changes on either side are instantly visible to the other — no rebuild needed.

### Example 2: Live-Reload Web Development with Nginx

```bash
# Create a local HTML directory
mkdir html
echo "<h1>Hello from Docker! 🐳</h1>" > html/index.html

# Run Nginx with a bind mount
docker run -d \
  -p 8080:80 \
  -v $(pwd)/html:/usr/share/nginx/html \
  --name dev-server \
  nginx
```

**Line-by-line breakdown:**

```
docker run -d              → Run in background
  -p 8080:80               → Map host port 8080 → container port 80
  -v $(pwd)/html:/usr/share/nginx/html   → 🔑 KEY: Bind mount
       │                      │
       └── Your local folder  └── Nginx's web root inside container
  nginx                    → Use official Nginx image
```

**`$(pwd)`** is a shell command that expands to your current directory path. On Windows use `%cd%` in CMD or `${PWD}` in PowerShell.

```bash
# Open http://localhost:8080 — you'll see your HTML

# Now edit the file WITHOUT restarting anything
echo "<h1>Updated live! ⚡</h1>" > html/index.html

# Refresh your browser → changes appear instantly!
# No docker build. No docker restart. Zero delay.
```

### Volumes vs Bind Mounts — When to Use Each

| Feature | Named Volume | Bind Mount |
|---------|-------------|------------|
| **Managed by** | Docker | You |
| **Location** | Docker-controlled | Anywhere on your host |
| **Performance** | Optimised | Depends on OS |
| **Portability** | Works anywhere | Tied to your host path |
| **Best for** | Databases, production data | Development, live editing |
| **Visible in IDE** | ❌ Not directly | ✅ Yes, edit normally |

---

## 🔵 Type 3: tmpfs Mounts (In-Memory, Temporary)

Stores data in RAM — never written to disk. Data disappears when the container stops. Use for sensitive temporary data like secrets or session tokens.

```bash
docker run -d \
  --name secure-app \
  --tmpfs /run/secrets:rw,size=64m \
  nginx

# Data in /run/secrets exists only in memory
# Faster than disk I/O and automatically wiped on container stop
```

---

## 🚫 Avoid: Anonymous Volumes

If you use `-v /path/in/container` without naming the volume, Docker creates a random-named anonymous volume:

```bash
# ❌ Creates an anonymous volume — hard to track
docker run -d -v /var/lib/mysql mysql:8.0

# Docker creates:
# /var/lib/docker/volumes/f3a9c0b3a9f8c1e2d3.../_data
# Impossible to reference by name
# Easy to accidentally delete with `docker volume prune`

# ✅ Always name your volumes in production
docker run -d -v mysql-data:/var/lib/mysql mysql:8.0
```

---

## 🌐 Docker Networking

Networking controls how containers communicate with each other and with the outside world.

### Why Custom Networks Matter

By default, all containers on the default `bridge` network can see each other — that's a security risk. Custom networks give you:

- **Isolation** — only containers on the same network can talk
- **DNS resolution** — containers find each other by name, not IP
- **Security** — databases stay off the internet, only your app can reach them

---

## 🔌 Network Types

### Bridge Network (Default)
The default network type. Containers get their own IP addresses and can communicate through Docker's virtual bridge.

```bash
# Default bridge network — Docker creates this automatically
# Containers can communicate but only by IP (not name) on the DEFAULT bridge
# Custom bridge networks support DNS name resolution

# Create a custom bridge network (recommended)
docker network create my-network
```

### Host Network
Container shares the host machine's network stack directly. No network isolation — the container uses your machine's ports directly.

```bash
docker run -d --network host nginx
# Nginx now listens on YOUR machine's port 80, not inside a container
# Use case: High-performance apps where network overhead matters
# ⚠️ Not recommended for most use cases — no isolation
```

### None Network
Completely disables networking. The container has no network access at all.

```bash
docker run -d --network none my-isolated-app
# Use case: Batch processing jobs, security-critical workloads
```

---

## 🛠️ Network Commands

```bash
# Create a custom network
docker network create app-network

# List all networks
docker network ls
# Output:
# NETWORK ID     NAME          DRIVER    SCOPE
# abc123def456   bridge        bridge    local   ← default
# def456abc789   host          host      local
# ghi789jkl012   none          null      local
# mno012pqr345   app-network   bridge    local   ← your custom one

# Connect a running container to a network
docker network connect app-network my-container

# Disconnect a container from a network
docker network disconnect app-network my-container

# Inspect a network — see which containers are connected
docker network inspect app-network

# Remove a network (no containers must be using it)
docker network rm app-network

# Remove all unused networks
docker network prune
```

---

## 🔗 How Docker DNS Works

This is one of Docker's most powerful features — containers on the **same custom network** automatically resolve each other's names as hostnames:

```
Custom Network: app-network
─────────────────────────────────────────────────
  Container: mysql-db          Container: web-app
  IP: 172.18.0.2               IP: 172.18.0.3
  Hostname: mysql-db           Hostname: web-app

  web-app can reach MySQL at:  mysql-db:3306
  mysql-db can reach web-app at: web-app:3000

  ✅ No hardcoded IPs needed
  ✅ Works even if containers are restarted (IPs may change)
  ✅ Docker's internal DNS handles resolution automatically
```

> ⚠️ **Important:** This DNS-based resolution only works on **custom named networks**, not the default `bridge` network.

---

## 🧪 Practice Exercise — Web App + Database via Custom Network

Build a complete stack: a Node.js web app that connects to a MySQL database, with proper networking and persistent storage.

### Architecture

```
Internet
    │
    │ port 3000 (only public port)
    ▼
┌──────────────────────────────────────┐
│  Custom Network: app-network          │
│                                       │
│  ┌─────────────┐    ┌──────────────┐ │
│  │  web-app    │───▶│  mysql-db    │ │
│  │  :3000      │    │  :3306       │ │
│  │  (public)   │    │  (internal)  │ │
│  └─────────────┘    └──────┬───────┘ │
│                            │         │
└────────────────────────────┼─────────┘
                             │
                    ┌────────▼────────┐
                    │  mysql-data     │
                    │  (named volume) │
                    └─────────────────┘
```

### Step 1 — Create the Network and Volume

```bash
# Create isolated network
docker network create app-network

# Create persistent volume for database
docker volume create mysql-data

# Verify both exist
docker network ls | grep app-network
docker volume ls | grep mysql-data
```

### Step 2 — Start the MySQL Database Container

```bash
docker run -d \
  --name mysql-db \
  --network app-network \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=appdb \
  -v mysql-data:/var/lib/mysql \
  mysql:8.0

# Wait ~20 seconds for MySQL to fully initialize
docker logs mysql-db --follow
# Wait until you see: ready for connections
# Press Ctrl+C to stop following logs
```

### Step 3 — Create the Web App Files

Create a project folder:
```bash
mkdir web-app && cd web-app
```

**`package.json`:**
```json
{
  "name": "web-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.0"
  }
}
```

**`index.js`:**
```javascript
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();

// Database connection config — uses environment variables
// Container name 'mysql-db' works as hostname thanks to Docker DNS!
const dbConfig = {
  host: process.env.DB_HOST,       // 'mysql-db' — resolved by Docker DNS
  user: process.env.DB_USER,       // 'root'
  password: process.env.DB_PASSWORD, // 'secret'
  database: process.env.DB_NAME,   // 'appdb'
};

// Home route — queries the database
app.get('/', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT NOW() AS current_time');
    await connection.end();
    res.send(`
      <h2>🐳 Docker Networking Demo</h2>
      <p>✅ Web app is running!</p>
      <p>✅ Connected to MySQL via hostname: <b>${process.env.DB_HOST}</b></p>
      <p>🕐 Database server time: <b>${rows[0].current_time}</b></p>
    `);
  } catch (err) {
    res.status(500).send(`❌ Database error: ${err.message}`);
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'web-app' });
});

app.listen(3000, () => {
  console.log('🌐 Web app running on port 3000');
  console.log(`📡 Connecting to DB at: ${process.env.DB_HOST}`);
});
```

**`Dockerfile`:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files first (layer caching optimization!)
COPY package*.json ./
RUN npm install

# Copy app source code
COPY index.js .

EXPOSE 3000

CMD ["node", "index.js"]
```

### Step 4 — Build and Run the Web App

```bash
# Build the image
docker build -t web-app .

# Run with environment variables pointing to the MySQL container
docker run -d \
  --name web-app \
  --network app-network \
  -p 3000:3000 \
  -e DB_HOST=mysql-db \
  -e DB_USER=root \
  -e DB_PASSWORD=secret \
  -e DB_NAME=appdb \
  web-app
```

### Step 5 — Test the Connection

```bash
# Check both containers are running
docker ps

# Check web-app logs
docker logs web-app
# Expected: 🌐 Web app running on port 3000
#           📡 Connecting to DB at: mysql-db

# Open in browser
# http://localhost:3000
# Expected: Database server time: 2026-02-22 ...

# Test with curl
curl http://localhost:3000/health
# {"status":"ok","service":"web-app"}
```

### Step 6 — Verify Network Isolation and DNS

```bash
# Inspect the network — see both containers listed
docker network inspect app-network

# Verify DNS works: from inside web-app, ping mysql-db by name
docker exec web-app ping -c 3 mysql-db
# mysql-db resolves to an IP! DNS working ✅

# Verify isolation: an OUTSIDE container CANNOT reach mysql-db
docker run --rm busybox ping -c 1 mysql-db
# ping: bad address 'mysql-db' — unreachable from outside! ✅

# But web-app is reachable from outside via its exposed port
curl http://localhost:3000
```

### Step 7 — Prove Data Persistence

```bash
# Delete both containers
docker rm -f web-app mysql-db

# Volume still exists
docker volume ls | grep mysql-data  # ✅ still there

# Recreate MySQL with the same volume — data is intact
docker run -d \
  --name mysql-db \
  --network app-network \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=appdb \
  -v mysql-data:/var/lib/mysql \
  mysql:8.0

# Recreate web-app
docker run -d \
  --name web-app \
  --network app-network \
  -p 3000:3000 \
  -e DB_HOST=mysql-db \
  -e DB_USER=root \
  -e DB_PASSWORD=secret \
  -e DB_NAME=appdb \
  web-app

# App is back with all data intact! 🎉
```

### Step 8 — Clean Up

```bash
docker rm -f web-app mysql-db
docker network rm app-network
docker volume rm mysql-data
```

---

## 🔥 Bonus: Same Setup with Docker Compose

All the steps above can be replaced with a single file and one command — this is what you'll learn in full on Day 7:

```yaml
# docker-compose.yml
version: "3.9"

services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: secret
      MYSQL_DATABASE: appdb
    volumes:
      - mysql-data:/var/lib/mysql
    networks:
      - app-network

  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      DB_HOST: db
      DB_USER: root
      DB_PASSWORD: secret
      DB_NAME: appdb
    depends_on:
      - db
    networks:
      - app-network

volumes:
  mysql-data:

networks:
  app-network:
```

```bash
# All of the above in ONE command!
docker compose up -d

# Tear everything down (add -v to also delete volumes)
docker compose down
docker compose down -v  # ← also removes volumes
```

> 💡 Notice `DB_HOST: db` — the service name `db` becomes the DNS hostname automatically. This is exactly the same DNS magic as before, just defined in YAML instead of CLI flags.

---

## 📋 Production Best Practices Summary

```
VOLUMES                                 NETWORKING
──────────────────────────────────      ──────────────────────────────────
✅ Always name your volumes             ✅ Always create custom networks
✅ Use volumes for databases            ✅ Use container names, not IPs
✅ Use bind mounts for development      ✅ Only expose ports that need to
✅ Add .dockerignore                       be public (-p flag)
✅ Mount logs to host for access        ✅ Keep databases internal
❌ Never use anonymous volumes          ❌ Never use default bridge network
❌ Never store secrets in images           in production
❌ Don't forget to back up volumes      ❌ Never hardcode IP addresses
```

---

## 🧠 Mental Model — The Golden Rule

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   Containers are CATTLE — replace them freely               │
│   Volumes are PETS — protect them carefully                  │
│                                                              │
│   Containers talk via NAMES — never hardcode IPs            │
│   Networks are WALLS — databases stay behind them           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Quick Reference Cheat Sheet

```bash
# VOLUMES
docker volume create NAME              # create
docker volume ls                       # list
docker volume inspect NAME             # details + disk location
docker volume rm NAME                  # remove one
docker volume prune                    # remove all unused

# MOUNTS (in docker run)
-v volume-name:/container/path         # named volume
-v /host/path:/container/path          # bind mount
-v $(pwd)/src:/app/src                 # bind mount (current dir)
--tmpfs /container/path                # in-memory tmpfs

# NETWORKS
docker network create NAME             # create custom network
docker network ls                      # list all networks
docker network inspect NAME            # details + connected containers
docker network connect NAME CONTAINER  # connect existing container
docker network rm NAME                 # remove
docker network prune                   # remove all unused
```

---

## 📚 References & Further Reading

| Resource | Link |
|---------|------|
| Docker Volumes (Official Docs) | https://docs.docker.com/storage/volumes/ |
| Docker Networking (Official Docs) | https://docs.docker.com/network/ |
| Bind Mounts | https://docs.docker.com/storage/bind-mounts/ |
| Docker Network Tutorial | https://docs.docker.com/network/network-tutorial-standalone/ |

---

## ⏭️ What's Next — Day 7 Preview

On Day 7, you'll learn about **Docker Compose** — taking everything from Days 3–6 and combining it into a single, declarative `docker-compose.yml` file:
- Define your entire application stack in one place
- Launch web app + database + cache with `docker compose up`
- Manage service dependencies, health checks, and scaling
- The standard way teams run multi-container apps in development and production

---

*Data that persists, services that communicate — you're building real production architecture! 🚀*