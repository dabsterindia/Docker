# 🐳 Day 4 — Building Efficient Docker Images

> **Goal for today:** Understand how Docker layers and caching work, apply best practices to shrink image sizes, and master multi-stage builds — one of the most powerful Docker techniques.

---

## 🧱 Understanding Image Layers

Every instruction in a Dockerfile creates a **new read-only layer** stacked on top of the previous one. This is the foundation of how Docker images work — and understanding it is the key to building fast, small, efficient images.

```
┌─────────────────────────────────┐
│  CMD ["python", "app.py"]       │  ← Layer 5 (changes most often)
├─────────────────────────────────┤
│  COPY . .                       │  ← Layer 4
├─────────────────────────────────┤
│  RUN pip install -r reqs.txt    │  ← Layer 3
├─────────────────────────────────┤
│  COPY requirements.txt .        │  ← Layer 2
├─────────────────────────────────┤
│  FROM python:3.9-slim           │  ← Layer 1 (changes least often)
└─────────────────────────────────┘
         Final Image
```

### How Docker Layer Caching Works

Docker checks each layer before building it. If the **instruction AND its inputs** haven't changed since the last build, Docker reuses the cached layer and skips rebuilding it — saving potentially minutes on large projects.

```
First Build:                      Second Build (only app.py changed):
────────────────────────          ────────────────────────────────────
FROM python:3.9-slim    ✅ Build  FROM python:3.9-slim    ♻️  CACHED
COPY requirements.txt . ✅ Build  COPY requirements.txt . ♻️  CACHED
RUN pip install ...     ✅ Build  RUN pip install ...     ♻️  CACHED ⚡ skipped!
COPY app.py .           ✅ Build  COPY app.py .           ✅ Rebuilt
CMD ["python","app.py"] ✅ Build  CMD ["python","app.py"] ✅ Rebuilt

Total: ~45 seconds                Total: ~3 seconds 🚀
```

> 💡 **Key rule:** Once a layer is invalidated (changed), **all layers after it** must be rebuilt too. This is why order matters so much.

---

## ✅ Best Practices for Efficient Images

### 1. 📐 Order Matters — Put Stable Instructions First

Structure your Dockerfile from **least frequently changed → most frequently changed**. This maximises cache hits.

```dockerfile
# ❌ INEFFICIENT ORDER — app code change forces pip install to re-run
FROM python:3.9-slim
WORKDIR /app
COPY . .                        # copies everything including app.py
RUN pip install -r requirements.txt  # re-runs every time ANY file changes!
CMD ["python", "app.py"]

# ✅ EFFICIENT ORDER — pip install is cached separately from your code
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .         # only this triggers pip re-install if changed
RUN pip install -r requirements.txt  # cached unless requirements.txt changes
COPY . .                        # app code copied last — changes don't affect pip
CMD ["python", "app.py"]
```

The same principle applies to Node.js:

```dockerfile
# ✅ Node.js efficient pattern
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./           # copy package files first
RUN npm install                 # cached unless package.json changes
COPY . .                        # source code copied after npm install
CMD ["node", "server.js"]
```

---

### 2. 🚫 Use `.dockerignore` — Exclude What You Don't Need

A `.dockerignore` file works just like `.gitignore` — it tells Docker to skip certain files and directories when copying into the image. This has two major benefits:

- **Smaller images** — no bloat from `node_modules`, logs, or test files
- **Better cache behavior** — irrelevant file changes don't invalidate layers
- **Security** — prevents secrets like `.env` files from leaking into images

```
# .dockerignore

# Dependency directories (reinstalled inside container anyway)
node_modules/
venv/
__pycache__/
*.pyc

# Logs and debug files
*.log
logs/
npm-debug.log*

# Version control
.git/
.gitignore

# Secrets and environment files
.env
.env.*
*.pem
*.key

# Documentation and dev tools
*.md
docs/
.DS_Store

# Test files
test/
tests/
*.test.js
*.spec.js

# Build artifacts
dist/
build/
*.o
*.a
```

> 💡 **How to check what Docker is sending?** Run `docker build` and watch the first line:
> `Sending build context to Docker daemon  1.234GB` ← this should be small (KBs or MBs, not GBs!)

---

### 3. 🔗 Minimize Layers — Combine RUN Commands

Each `RUN` instruction = one new layer. Unnecessary layers add size and clutter.

```dockerfile
# ❌ INEFFICIENT — 4 separate layers created
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git
RUN apt-get clean

# ✅ EFFICIENT — 1 layer with cleanup included
RUN apt-get update \
    && apt-get install -y \
        curl \
        git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
```

> The `rm -rf /var/lib/apt/lists/*` cleans up the apt cache **in the same layer** it was created — if you clean up in a separate `RUN`, the bloat is already baked into the previous layer.

---

### 4. 📌 Use Specific Base Image Tags

```dockerfile
# ❌ AVOID — 'latest' changes over time, builds become unpredictable
FROM python:latest
FROM node:latest

# ✅ PREFERRED — pinned version = reproducible, predictable builds
FROM python:3.9-slim
FROM node:18-alpine

# 🔒 MOST REPRODUCIBLE — pin by digest (SHA256 hash)
FROM python:3.9-slim@sha256:abcdef1234...
```

| Tag Variant | Size | Use Case |
|-------------|------|----------|
| `python:3.9` | ~900MB | Development, when you need all tools |
| `python:3.9-slim` | ~125MB | Production, most common choice |
| `python:3.9-alpine` | ~50MB | Smallest size, but some packages may need extra work |
| `scratch` | 0MB | Absolute minimal — for compiled binaries only |

---

### 5. 👤 Run as a Non-Root User

By default, processes inside a container run as **root** — which is a security risk. Always create and switch to a non-root user for production images.

```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

# Create a non-root user and switch to it
RUN useradd --create-home appuser
USER appuser

CMD ["python", "app.py"]
```

---

### 6. 🏥 Add a HEALTHCHECK

Tell Docker how to verify your container is actually healthy and responding:

```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY . .
RUN pip install flask

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

CMD ["python", "app.py"]
```

```bash
# Check health status
docker ps
# STATUS column will show: healthy, unhealthy, or starting
```

---

## 🏗️ Multi-Stage Builds — The Game Changer

Multi-stage builds let you use **multiple `FROM` statements** in one Dockerfile. The key idea: use a large image to **build** your app, then copy only the compiled output into a tiny image to **run** it.

### Why This Matters

```
Traditional single-stage build:
────────────────────────────────────────────────
  Base compiler image (e.g. golang:1.19)  ~800MB
+ Your source code                         ~1MB
+ Build tools, compiler, dependencies     ~200MB
= Final image                             ~1GB  ← ships to production!

Multi-stage build:
────────────────────────────────────────────────
  Build stage:  golang:1.19 builds your app     (discarded after build)
  Runtime stage: alpine:latest + compiled binary ~10MB ← ships to production!
```

### The Concept

```
┌─────────────────────────────────────────────────────────────┐
│                    Stage 1: Builder                          │
│  FROM golang:1.19 AS builder                                 │
│  • Full compiler + tools available                           │
│  • Compiles source code → binary                             │
│  • This stage is TEMPORARY — never shipped                   │
└─────────────────────────────┬───────────────────────────────┘
                              │  COPY --from=builder /app/myapp .
                              ▼  (only the compiled output crosses over)
┌─────────────────────────────────────────────────────────────┐
│                    Stage 2: Runtime                          │
│  FROM alpine:latest                                          │
│  • Tiny base OS                                              │
│  • Only contains your compiled app binary                    │
│  • This is what gets shipped and deployed ✅                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Example: Multi-Stage Build with Go

### Step 1 — Create `main.go`
```go
package main

import "fmt"

func main() {
    fmt.Println("Hello from optimized Docker!")
    fmt.Println("This binary is running in a ~10MB container 🐳")
}
```

### Step 2 — Create `Dockerfile`
```dockerfile
# ─────────────────────────────────────────
# Stage 1: Build Stage
# ─────────────────────────────────────────
# Use the full Go image — it has all compilers and tools
FROM golang:1.19 AS builder

# Set working directory
WORKDIR /app

# Copy source code
COPY main.go .

# Compile the Go app into a standalone binary
# CGO_ENABLED=0 → static binary (no C dependencies)
# GOOS=linux    → compile for Linux
RUN CGO_ENABLED=0 GOOS=linux go build -o myapp main.go

# ─────────────────────────────────────────
# Stage 2: Runtime Stage
# ─────────────────────────────────────────
# Use a tiny Alpine Linux image — only ~5MB
FROM alpine:latest

# Add CA certificates (needed for HTTPS calls)
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy ONLY the compiled binary from the builder stage
# The golang:1.19 image and all its tools are LEFT BEHIND
COPY --from=builder /app/myapp .

# Run the binary
CMD ["./myapp"]
```

### Step 3 — Build and Compare

```bash
# Build the multi-stage image
docker build -t go-app-optimized .

# For comparison, build a single-stage version
cat > Dockerfile.single << 'EOF'
FROM golang:1.19
WORKDIR /app
COPY main.go .
RUN go build -o myapp main.go
CMD ["./myapp"]
EOF

docker build -f Dockerfile.single -t go-app-single .

# Compare sizes — the difference is dramatic!
docker images | grep go-app
```

**Expected output:**
```
REPOSITORY          TAG      IMAGE ID       SIZE
go-app-optimized    latest   abc123...      ~12MB   ✅ Tiny!
go-app-single       latest   def456...      ~810MB  ❌ Huge!
```

> That's a **98.5% reduction in image size** — imagine pulling a 12MB image vs an 810MB image in a CI/CD pipeline running hundreds of times a day.

---

## 🐍 Multi-Stage Build: Python Application

Multi-stage builds aren't just for compiled languages. Here's a Python example that separates the build environment from the runtime:

```dockerfile
# Stage 1: Build dependencies
FROM python:3.9 AS builder

WORKDIR /app
COPY requirements.txt .

# Install dependencies into a local directory (not system-wide)
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ─────────────────────────────────────────────────────
# Stage 2: Lean runtime image
FROM python:3.9-slim AS runtime

WORKDIR /app

# Copy installed packages from builder stage
COPY --from=builder /install /usr/local

# Copy only application source code
COPY app.py .

# Non-root user for security
RUN useradd --create-home appuser
USER appuser

CMD ["python", "app.py"]
```

---

## 🟢 Multi-Stage Build: Node.js Application

A common real-world pattern — build a React/Next.js app and serve the static output with a lightweight server:

```dockerfile
# Stage 1: Install and build
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build

# ─────────────────────────────────────────
# Stage 2: Serve with nginx
FROM nginx:alpine AS runtime

# Copy built static files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```
Builder stage (node:18-alpine + deps + source):  ~450MB
Runtime stage (nginx:alpine + static files):     ~25MB  ✅
```

---

## 🧪 Practice Exercise — Measure the Impact of `.dockerignore`

This exercise gives you concrete, measurable proof of why `.dockerignore` matters.

### Setup — Create a Node.js Project

```bash
# Create project directory
mkdir docker-size-demo && cd docker-size-demo

# Create a package.json
cat > package.json << 'EOF'
{
  "name": "size-demo",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0"
  }
}
EOF

# Install node_modules locally (this creates the bloat)
npm install

# Create the app
cat > server.js << 'EOF'
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Hello Docker!'));
app.listen(3000);
EOF

# Create some dummy files that should be excluded
echo "SECRET_KEY=supersecret123" > .env
echo "This is documentation" > README.md
mkdir -p logs && echo "error log" > logs/error.log
```

### Step 1 — Build WITHOUT `.dockerignore`

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t app-without-ignore .

# Check the build context size (first line of output):
# "Sending build context to Docker daemon  XX.XXMB"

docker images app-without-ignore
# Note the SIZE column
```

### Step 2 — Add `.dockerignore` and Rebuild

```bash
cat > .dockerignore << 'EOF'
node_modules/
*.log
logs/
.git/
.env
*.md
.DS_Store
EOF
```

```bash
docker build -t app-with-ignore .

# Notice the build context is now much smaller!
# "Sending build context to Docker daemon  X.XXXKB"

docker images app-with-ignore
# Note the SIZE column — significantly smaller!
```

### Step 3 — Compare Results

```bash
docker images | grep app-

# Expected output:
# REPOSITORY           TAG      SIZE
# app-with-ignore      latest   ~55MB   ✅
# app-without-ignore   latest   ~210MB  ❌

# Calculate the percentage reduction
echo "Size reduction: node_modules alone can be 100-200MB!"
```

### Step 4 — Verify `.env` is Protected

```bash
# Without .dockerignore — your secret is in the image!
docker run app-without-ignore cat /app/.env
# Output: SECRET_KEY=supersecret123  ← 🚨 exposed!

# With .dockerignore — secret is excluded
docker run app-with-ignore cat /app/.env
# Output: cat: can't open '/app/.env': No such file or directory ✅
```

### Bonus Challenge — Multi-Stage Size Comparison

```bash
# Single stage
cat > Dockerfile.single << 'EOF'
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "server.js"]
EOF

# Multi-stage
cat > Dockerfile.multi << 'EOF'
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY server.js .
CMD ["node", "server.js"]
EOF

docker build -f Dockerfile.single -t demo-single .
docker build -f Dockerfile.multi -t demo-multi .

# Compare all versions
docker images | grep demo
```

---

## 📊 Image Optimisation Summary Table

| Technique | Typical Size Saving | Difficulty |
|-----------|-------------------|------------|
| Use `slim` or `alpine` base image | 50–90% | ⭐ Easy |
| Add `.dockerignore` | 20–80% | ⭐ Easy |
| Combine `RUN` commands | 5–20% | ⭐ Easy |
| Order layers by change frequency | 0% size, faster builds | ⭐ Easy |
| Multi-stage builds | 70–98% | ⭐⭐ Medium |
| Use non-root USER | 0% size, better security | ⭐ Easy |
| Remove build caches in same RUN | 5–15% | ⭐⭐ Medium |
| Pin exact image digests | 0% size, more reliable | ⭐⭐ Medium |

---

## 🔧 Useful Commands for Image Analysis

```bash
# See all your images with sizes
docker images

# See every layer in an image and its size
docker history my-image

# Deep dive — full JSON metadata of an image
docker inspect my-image

# Analyse image layers interactively (install dive first)
# https://github.com/wagoodman/dive
dive my-image

# Remove all unused images to reclaim disk space
docker image prune -a

# Remove a specific image
docker rmi my-image

# Check total Docker disk usage
docker system df

# Nuclear option — remove everything (containers, images, volumes, networks)
docker system prune -a --volumes
```

---

## 📚 References & Further Reading

| Resource | Link |
|---------|------|
| Docker Multi-Stage Builds (Official) | https://docs.docker.com/build/building/multi-stage/ |
| Dockerfile Best Practices (Official) | https://docs.docker.com/develop/develop-images/dockerfile_best-practices/ |
| dive — Image Layer Explorer | https://github.com/wagoodman/dive |
| DockerSlim — Auto-optimize images | https://dockerslim.com |
| Alpine Linux Packages | https://pkgs.alpinelinux.org |

---


*Smaller images = faster deployments, lower costs, smaller attack surface. You're thinking like a pro now! 🚀*