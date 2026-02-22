# 🐳 Day 3 — Writing Your First Dockerfile

> **Goal for today:** Understand what a Dockerfile is, learn every core instruction, and build real containerized applications from scratch.

---

## 📄 What is a Dockerfile?

A **Dockerfile** is a plain text file containing a series of step-by-step instructions that Docker follows to **automatically build a Docker image**.

Think of it as a **recipe card** 🍳 for your container:
- The **recipe** = Dockerfile
- The **cooked meal** = Docker Image
- The **plate you eat from** = Running Container

```
Dockerfile  ──(docker build)──▶  Image  ──(docker run)──▶  Container
(Recipe)                        (Blueprint)                 (Live App)
```

### Why Use a Dockerfile?

| Without Dockerfile | With Dockerfile |
|-------------------|----------------|
| Manually set up environments every time | Automated, repeatable builds |
| "It works on my machine" problems | Consistent across all machines |
| Hard to share setup steps with your team | Share one file, anyone can build it |
| No record of what was installed | Every step is documented and version-controlled |

---

## 🏗️ How Docker Builds an Image — Layer by Layer

Every instruction in a Dockerfile creates a **new layer** in the image. Docker caches these layers, so if nothing changed in a layer, it reuses the cache — making rebuilds very fast.

```
Dockerfile Instructions          Resulting Image Layers
────────────────────────         ──────────────────────────────
FROM python:3.9-slim      →      Layer 1: Base Python OS
WORKDIR /app              →      Layer 2: Set working directory
COPY app.py .             →      Layer 3: Your application file
RUN pip install requests  →      Layer 4: Installed dependencies
CMD ["python", "app.py"]  →      Layer 5: Startup instruction (metadata)

                                 ▼ Final Image (all layers stacked)
```

> 💡 **Pro Tip:** Put instructions that change **least often** (like `FROM`, `RUN apt-get install`) at the **top**, and instructions that change **most often** (like `COPY . .`) at the **bottom**. This maximises Docker's layer caching and speeds up your builds.

---

## 📋 Dockerfile Instructions — Complete Guide

### `FROM` — Choose Your Base Image
Every Dockerfile **must start** with `FROM`. It sets the foundation your image is built upon.

```dockerfile
# Official language images
FROM python:3.9-slim       # Python (slim = smaller image)
FROM node:18-alpine        # Node.js (alpine = minimal Linux, very small)
FROM ubuntu:22.04          # Full Ubuntu OS

# Start from scratch (for advanced use cases)
FROM scratch
```

> **What is `alpine`?** Alpine Linux is a minimal Linux distribution (~5MB). Using `alpine` or `slim` variants dramatically reduces your image size — great for production.

---

### `WORKDIR` — Set the Working Directory
Sets the directory **inside the container** where all subsequent commands will run. If it doesn't exist, Docker creates it automatically.

```dockerfile
WORKDIR /app

# All following instructions now run inside /app
# It's also the directory you land in when you exec into the container
```

> Without `WORKDIR`, files would scatter across the root `/` directory — messy and hard to manage.

---

### `COPY` — Copy Files from Host to Image
Copies files or directories from your **local machine** into the image.

```dockerfile
# Copy a single file
COPY app.py .

# Copy a single file to a specific path
COPY app.py /app/app.py

# Copy everything in current directory into /app
COPY . .

# Copy only specific file types
COPY *.json .
```

**`COPY` vs `ADD`** — A common question for beginners:

| Command | Use For |
|---------|---------|
| `COPY` | Simple file/directory copying — **use this by default** |
| `ADD` | Has extra features: can unpack `.tar` archives and fetch remote URLs — use only when needed |

---

### `RUN` — Execute Commands During Build
Runs shell commands **while building the image**. Used to install packages, create directories, download files, etc.

```dockerfile
# Install system packages (Debian/Ubuntu)
RUN apt-get update && apt-get install -y curl git

# Install Python dependencies
RUN pip install flask requests

# Install Node dependencies
RUN npm install

# Create a directory
RUN mkdir -p /app/logs

# Chain multiple commands with && to keep it as one layer
RUN apt-get update \
    && apt-get install -y curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
```

> 💡 **Best Practice:** Chain related `RUN` commands with `&&` and `\` for readability. Each `RUN` creates a new layer — unnecessary layers bloat your image size.

---

### `CMD` — Default Command When Container Starts
Defines the **default command** that runs when a container is started. There can only be **one `CMD`** in a Dockerfile (the last one wins).

```dockerfile
# Exec form (preferred — does not invoke a shell)
CMD ["python", "app.py"]
CMD ["node", "server.js"]
CMD ["nginx", "-g", "daemon off;"]

# Shell form (runs inside /bin/sh -c)
CMD python app.py
```

> **`CMD` can be overridden** at runtime:
> ```bash
> docker run my-image python other_script.py  # overrides CMD
> ```

---

### `ENTRYPOINT` — Fixed Starting Command
Similar to `CMD`, but **cannot be overridden** by default. Used when your container should always run a specific executable.

```dockerfile
ENTRYPOINT ["python"]
CMD ["app.py"]           # this becomes the default argument to python
```

```bash
docker run my-image              # runs: python app.py
docker run my-image other.py     # runs: python other.py  (CMD overridden, ENTRYPOINT fixed)
```

**`CMD` vs `ENTRYPOINT` Summary:**

| | `CMD` | `ENTRYPOINT` |
|-|-------|-------------|
| Can be overridden at runtime? | ✅ Yes | ❌ No (unless --entrypoint flag) |
| Best for | Default arguments / flexible containers | Fixed executables / dedicated tools |

---

### `EXPOSE` — Document Container Ports
Informs Docker (and developers) that the container **listens on a specific port**. This is documentation — it does **not** actually publish the port.

```dockerfile
EXPOSE 3000    # Node.js app
EXPOSE 8080    # Web server
EXPOSE 5432    # PostgreSQL
```

> To actually make the port accessible from your host machine, you still need `-p` when running:
> ```bash
> docker run -p 3000:3000 my-app    # host:container
> ```

---

### `ENV` — Set Environment Variables
Defines environment variables inside the container. These persist when containers are started from the image.

```dockerfile
ENV NODE_ENV=production
ENV PORT=3000
ENV APP_NAME="My Docker App"

# Use them later in the Dockerfile or in your app
RUN echo "Building for $NODE_ENV"
```

```bash
# You can also override ENV variables at runtime
docker run -e NODE_ENV=development my-app
```

---

### `ARG` — Build-Time Variables
Similar to `ENV`, but only available **during the build process**, not in the running container.

```dockerfile
ARG APP_VERSION=1.0
RUN echo "Building version $APP_VERSION"

# Pass a different value at build time
# docker build --build-arg APP_VERSION=2.0 .
```

---

### `VOLUME` — Mount Points for Persistent Data
Declares a mount point for external storage. Data in volumes persists even after the container is deleted.

```dockerfile
VOLUME ["/app/data"]
VOLUME ["/var/log"]
```

---

## 📊 Quick Reference — All Dockerfile Instructions

```
┌─────────────┬────────────────────────────────────────────────────┐
│ Instruction │ Purpose                                             │
├─────────────┼────────────────────────────────────────────────────┤
│ FROM        │ Set base image (required, always first)             │
│ WORKDIR     │ Set working directory inside container              │
│ COPY        │ Copy files from host into image                     │
│ ADD         │ Like COPY but can unpack tarballs + fetch URLs      │
│ RUN         │ Execute commands during image build                 │
│ CMD         │ Default command when container starts (overridable) │
│ ENTRYPOINT  │ Fixed command that always runs                      │
│ EXPOSE      │ Document which ports the app uses                   │
│ ENV         │ Set environment variables (persists in container)   │
│ ARG         │ Build-time variables (not available at runtime)     │
│ VOLUME      │ Declare persistent storage mount points             │
│ LABEL       │ Add metadata (author, version, description)         │
│ USER        │ Set user to run subsequent commands as              │
│ HEALTHCHECK │ Tell Docker how to test if container is healthy     │
└─────────────┴────────────────────────────────────────────────────┘
```

---

## 🐍 Example 1: Simple Python Application

### Project Structure
```
my-python-app/
├── app.py
└── Dockerfile
```

### Step 1 — Create `app.py`
```python
print("Hello from Docker!")
print("This is my first containerized app.")
print("Python is running inside a container 🐳")
```

### Step 2 — Create `Dockerfile`
```dockerfile
# Step 1: Start from the official Python image (slim = smaller size)
FROM python:3.9-slim

# Step 2: Set the working directory inside the container
WORKDIR /app

# Step 3: Copy our Python script into the container's /app directory
COPY app.py .

# Step 4: Define the command to run when the container starts
CMD ["python", "app.py"]
```

### Step 3 — Build and Run
```bash
# Build the image and tag it as 'my-python-app'
# The '.' means "look for a Dockerfile in the current directory"
docker build -t my-python-app .

# Watch the build output — you'll see each layer being created:
# Step 1/4 : FROM python:3.9-slim
# Step 2/4 : WORKDIR /app
# Step 3/4 : COPY app.py .
# Step 4/4 : CMD ["python", "app.py"]

# Run the container
docker run my-python-app
```

**Expected output:**
```
Hello from Docker!
This is my first containerized app.
Python is running inside a container 🐳
```

### What's Happening Under the Hood?
```
1. Docker reads your Dockerfile top to bottom
2. FROM  → downloads python:3.9-slim from Docker Hub
3. WORKDIR → creates /app directory in the image
4. COPY  → copies app.py from your machine to /app/app.py in the image
5. CMD   → records "python app.py" as the startup command
6. Image is saved locally and ready to run
7. docker run → creates a container, executes "python app.py", prints output, exits
```

---

## 🟢 Example 2: Node.js Web Server

### Project Structure
```
my-nodejs-app/
├── server.js
└── Dockerfile
```

### Step 1 — Create `server.js`
```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello from Dockerized Node.js!\n');
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('Container is up and listening! 🐳');
});
```

### Step 2 — Create `Dockerfile`
```dockerfile
# Use the official Node.js image on Alpine Linux (very small)
FROM node:16-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy the server file into the container
COPY server.js .

# Document that this container uses port 3000
EXPOSE 3000

# Start the server when the container runs
CMD ["node", "server.js"]
```

### Step 3 — Build and Run
```bash
# Build the image
docker build -t my-nodejs-app .

# Run the container with port mapping
# -p 3000:3000 → map host port 3000 to container port 3000
# -d           → run in background (detached mode)
docker run -d -p 3000:3000 --name node-server my-nodejs-app

# Verify it's running
docker ps

# Check the logs
docker logs node-server
```

Open your browser and visit **http://localhost:3000** 🌐

You should see: `Hello from Dockerized Node.js!`

```bash
# Stop and clean up when done
docker stop node-server
docker rm node-server
```

---

## 🐍 Example 3: Python Web App with Dependencies

This example shows how to handle `requirements.txt` — a very common real-world pattern.

### Project Structure
```
my-flask-app/
├── app.py
├── requirements.txt
└── Dockerfile
```

### `requirements.txt`
```
flask==2.3.0
```

### `app.py`
```python
from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return '<h1>Hello from Flask inside Docker! 🐳</h1>'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

### `Dockerfile`
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Copy requirements FIRST (separate layer — Docker can cache this!)
COPY requirements.txt .

# Install dependencies (this layer is cached if requirements.txt didn't change)
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the rest of the app (this layer changes more often)
COPY app.py .

EXPOSE 5000

CMD ["python", "app.py"]
```

> 💡 **Why copy `requirements.txt` before `app.py`?** Because `requirements.txt` changes less often than your code. Docker caches the `pip install` layer and skips it on rebuilds if nothing changed — saving you minutes of build time.

```bash
docker build -t my-flask-app .
docker run -p 5000:5000 my-flask-app
# Visit http://localhost:5000
```

---

## 📝 .dockerignore — Keep Your Images Clean

Just like `.gitignore`, a `.dockerignore` file tells Docker which files to **exclude** from the image. This keeps images small and prevents secrets from leaking.

Create a `.dockerignore` file in your project root:
```
# Python
__pycache__/
*.pyc
*.pyo
.env
venv/

# Node.js
node_modules/
npm-debug.log

# General
.git/
.DS_Store
*.log
README.md
```

> Without `.dockerignore`, `COPY . .` copies **everything** including `node_modules` (which can be hundreds of MB) and sensitive files like `.env`.

---

## 🧪 Practice Exercise — System Info Script

Create a Dockerfile for a simple bash script that prints system information.

### Step 1 — Create `sysinfo.sh`
```bash
#!/bin/bash

echo "============================================"
echo "       🐳 Docker System Info Report         "
echo "============================================"
echo ""
echo "📅 Date & Time:      $(date)"
echo "🖥️  Hostname:         $(hostname)"
echo "🐧 OS:               $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"')"
echo "⚙️  Kernel:           $(uname -r)"
echo "🏗️  Architecture:     $(uname -m)"
echo "💾 Memory Usage:"
free -h
echo ""
echo "💿 Disk Usage:"
df -h /
echo ""
echo "🔄 Running Processes: $(ps aux | wc -l)"
echo ""
echo "============================================"
echo "      Container is working correctly! ✅    "
echo "============================================"
```

### Step 2 — Create `Dockerfile`
```dockerfile
# Use a lightweight Alpine Linux base image
FROM alpine:3.18

# Install bash and basic utilities (Alpine uses 'sh' by default, not bash)
RUN apk add --no-cache bash procps

# Set working directory
WORKDIR /scripts

# Copy our script into the container
COPY sysinfo.sh .

# Make the script executable
RUN chmod +x sysinfo.sh

# Run the script when container starts
CMD ["bash", "sysinfo.sh"]
```

### Step 3 — Build and Run
```bash
# Build
docker build -t sysinfo-app .

# Run
docker run sysinfo-app
```

**Expected output:**
```
============================================
       🐳 Docker System Info Report
============================================

📅 Date & Time:      Sun Feb 22 10:30:00 UTC 2026
🖥️  Hostname:        a1b2c3d4e5f6
🐧 OS:               Alpine Linux v3.18
⚙️  Kernel:           5.15.0-...
🏗️  Architecture:     x86_64
💾 Memory Usage:
              total        used        free
Mem:          7.7Gi        1.2Gi       6.5Gi
...
============================================
      Container is working correctly! ✅
============================================
```

### Bonus Challenges
```bash
# Challenge 1: Pass an environment variable to personalise the output
# Add to Dockerfile: ENV AUTHOR="Your Name"
# Add to script:    echo "👤 Author: $AUTHOR"
docker run -e AUTHOR="John Doe" sysinfo-app

# Challenge 2: Save the output to a file
docker run sysinfo-app bash -c "bash sysinfo.sh > /scripts/report.txt && cat /scripts/report.txt"

# Challenge 3: Check the image size — try to make it smaller!
docker images sysinfo-app
# Try replacing 'alpine:3.18' with 'busybox' and see what breaks
```

---

## 🔍 Inspecting Your Built Image

After building, use these commands to explore what you created:

```bash
# View image details and all its layers
docker inspect my-python-app

# See the full build history — each layer, its size, and the instruction that created it
docker history my-python-app

# Example output:
# IMAGE         CREATED    CREATED BY                                      SIZE
# abc123def456  1 min ago  CMD ["python" "app.py"]                         0B
# def456abc123  1 min ago  COPY app.py .                                   95B
# ...           ...        WORKDIR /app                                    0B
# ...           ...        FROM python:3.9-slim                            125MB

# Check image sizes across all your images
docker images
```

---

## ⚡ Dockerfile Best Practices Summary

```
✅  DO                                    ❌  AVOID
────────────────────────────────────      ────────────────────────────────────
Use specific image tags (python:3.9)      Using 'latest' tag in production
Use slim/alpine variants                  Bloated base images when not needed
Copy requirements.txt before source code  COPY . . before installing deps
Chain RUN commands with &&                Separate RUN for each apt-get command
Use .dockerignore                         Copying node_modules or .git
One process per container                 Running multiple services in one container
Use COPY over ADD (unless you need ADD)   Using ADD for simple file copies
Set a non-root USER for security          Running everything as root
```

---

## 📚 References & Further Reading

| Resource | Link |
|---------|------|
| Dockerfile Reference (Official) | https://docs.docker.com/engine/reference/builder/ |
| Docker Best Practices | https://docs.docker.com/develop/develop-images/dockerfile_best-practices/ |
| Docker Hub Official Images | https://hub.docker.com/search?type=image&image_filter=official |
| Alpine Linux Package Search | https://pkgs.alpinelinux.org |

---

## ⏭️ What's Next — Day 4 Preview

On Day 4, you'll learn about **Docker Volumes & Networking**:
- How to persist data beyond a container's lifecycle using Volumes
- How containers communicate with each other
- Bridge networks, host networks, and custom networks
- Connecting a web app container to a database container

---

*You can now build any application into a container — that's a superpower! 🚀*
