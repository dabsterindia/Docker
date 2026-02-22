# 🐳 Day 2 - What is a Docker Image?

> A beginner-friendly guide to understanding Docker Images and getting hands-on with containers.

---

## 📖 Overview

A **Docker Image** is a read-only template that contains everything needed to run an application — the code, runtime, libraries, environment variables, and configuration files. Think of it like a **blueprint or a snapshot** of your application.

When you *run* an image, it becomes a **container** — a live, running instance of that blueprint.

### Key Concepts at a Glance

| Term | Analogy | Description |
|------|---------|-------------|
| **Image** | Blueprint / Recipe | Read-only template with app + dependencies |
| **Container** | House / Meal | A running instance created from an image |
| **Layer** | Floors of a building | Each instruction in an image adds a new layer |
| **Registry** | App Store | A place to store and share images (e.g. Docker Hub) |

---

## 🧱 How Images Are Built — Layers Explained

Docker images are built in **layers**, and each layer represents a change or instruction (like installing a package or copying a file). This layered approach makes images:

- ✅ **Efficient** — layers are cached and reused across images
- ✅ **Lightweight** — only changed layers need to be re-downloaded or rebuilt
- ✅ **Reusable** — multiple images can share common base layers

```
┌─────────────────────────┐
│    Your Application      │  ← Layer 4: Your app code
├─────────────────────────┤
│    Install Dependencies  │  ← Layer 3: e.g. npm install / pip install
├─────────────────────────┤
│    Base Runtime          │  ← Layer 2: e.g. Node.js, Python
├─────────────────────────┤
│    Base OS               │  ← Layer 1: e.g. Ubuntu, Alpine Linux
└─────────────────────────┘
```

---

## 🎮 Play with Docker — Hands-On Demo (No Installation Needed!)

If you don't have Docker installed locally yet, you can practice **entirely in the browser** for free.

### Step 1 — Create a Docker Hub Account
Docker Hub is the official public registry where images are stored and shared.

👉 Sign up or log in at: [https://app.docker.com/accounts](https://app.docker.com/accounts)

> **Why do I need this?** Docker Hub lets you pull (download) public images and push (upload) your own images so others can use them.

---

### Step 2 — Open Play with Docker
Play with Docker gives you a free Linux terminal in your browser with Docker pre-installed.

👉 Go to: [https://play-with-docker.com](https://play-with-docker.com)

1. Click **Login** and sign in with your Docker Hub account
2. Click **+ Add New Instance** to get a terminal
3. You now have a full Docker environment ready to use! 🎉

---

### Step 3 — Hello Whale Example

The Hello Whale project is a simple beginner-friendly demo to build and run your first custom Docker image.

👉 Repository: [https://github.com/ajeetraina/hellowhale](https://github.com/ajeetraina/hellowhale)

```bash
# Clone the repository
git clone https://github.com/ajeetraina/hellowhale.git

# Navigate into the project folder
cd hellowhale

# Look at what's inside
ls
```

You'll see a `Dockerfile` — this is the file that defines the instructions for building a Docker image.

---

### Step 4 — Build Your First Docker Image & Push to Docker Hub

```bash
# Build the image (replace 'yourusername' with your Docker Hub username)
docker build -t yourusername/hellowhale:latest .

# The '.' at the end means "use the Dockerfile in the current directory"
# '-t' stands for 'tag' — it gives your image a name

# Log in to Docker Hub from the terminal
docker login

# Push your image to Docker Hub so the world can use it!
docker push yourusername/hellowhale:latest
```

> 🎉 Congratulations! Your image is now live on Docker Hub at `hub.docker.com/r/yourusername/hellowhale`

---

## 🔧 Essential Docker Commands

### 🔍 Finding Images

```bash
# Search Docker Hub for available images
docker search nginx

# Pull (download) a specific image to your machine
docker pull nginx:latest

# 'nginx' is the image name, 'latest' is the tag (version)
# Other examples:
docker pull nginx:1.25       # specific version
docker pull ubuntu:22.04     # Ubuntu 22.04
docker pull python:3.11-slim # lightweight Python image
```

> **What is a tag?** Tags are like version labels. `latest` means the most recent stable version. It's good practice to use a specific version tag (e.g. `nginx:1.25`) in production so your app doesn't break when a new version is released.

---

### 📦 Managing Images

```bash
# List all images downloaded on your machine
docker images

# Example output:
# REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
# nginx        latest    a6bd71f48f68   2 weeks ago    187MB
# ubuntu       22.04     3b418d7b466a   3 weeks ago    77.8MB

# Remove an image (it must not be used by any container)
docker rmi nginx

# Remove by image ID (useful when you have multiple tags)
docker rmi a6bd71f48f68

# Force remove even if a container is using it (use carefully!)
docker rmi -f nginx

# View detailed metadata about an image (JSON format)
docker inspect nginx

# Remove ALL unused images to free up disk space
docker image prune -a
```

---

### 🚀 Running Containers from Images

```bash
# Run nginx web server in the background
docker run -d -p 8080:80 --name my-nginx nginx

# Breaking down the flags:
# -d         → detached mode (runs in background, frees up your terminal)
# -p 8080:80 → port mapping: host port 8080 maps to container port 80
# --name     → give your container a friendly name instead of a random ID
# nginx      → the image to use
```

> 🌐 Open your browser and visit **http://localhost:8080** — you should see the nginx welcome page!

**More `docker run` examples:**

```bash
# Run an interactive Ubuntu container (drops you into a bash shell)
docker run -it ubuntu bash
# -i → interactive (keep stdin open)
# -t → allocate a terminal (tty)
# Type 'exit' to leave the container

# Run a container and automatically remove it when stopped
docker run --rm ubuntu echo "Hello from Ubuntu!"
# Useful for one-off tasks

# Run with an environment variable
docker run -d -e MYSQL_ROOT_PASSWORD=secret --name my-db mysql

# Run with a volume (persist data outside the container)
docker run -d -v /my/local/folder:/data nginx
```

---

### 🛠️ Managing Containers — Troubleshooting Commands

```bash
# List only RUNNING containers
docker ps

# List ALL containers (running + stopped)
docker ps -a

# Example output:
# CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS    PORTS                  NAMES
# a1b2c3d4e5f6   nginx   "..."     1 min     Up        0.0.0.0:8080->80/tcp   my-nginx

# Stop a running container gracefully (sends SIGTERM signal)
docker stop my-nginx

# Forcefully kill a container immediately
docker kill my-nginx

# Start a stopped container
docker start my-nginx

# Restart a container
docker restart my-nginx

# Remove a stopped container
docker rm my-nginx

# Remove a running container forcefully
docker rm -f my-nginx

# Remove ALL stopped containers at once
docker container prune
```

**Debugging & Logs:**

```bash
# View logs from a container
docker logs my-nginx

# Follow logs in real-time (like 'tail -f')
docker logs -f my-nginx

# Show last 50 lines of logs
docker logs --tail 50 my-nginx

# Show logs with timestamps
docker logs -t my-nginx

# Execute a command inside a running container
docker exec -it my-nginx bash
# This opens a bash shell INSIDE the container — great for debugging!

# Run a single command without opening a shell
docker exec my-nginx ls /usr/share/nginx/html

# Check resource usage (CPU, memory) of running containers
docker stats

# Inspect detailed config and state of a container
docker inspect my-nginx
```

---

## 🗺️ Docker Command Cheat Sheet

```
Image Lifecycle:           Container Lifecycle:
─────────────────          ────────────────────────
docker pull                docker run
docker build               docker start / stop / restart
docker push                docker rm
docker images              docker ps / ps -a
docker rmi                 docker logs
docker inspect             docker exec
docker image prune         docker stats
                           docker inspect
```

---

## 📝 Practice Exercise

Work through these steps to reinforce what you've learned:

### Exercise 1 — Pull and Explore Images
```bash
# Pull these three images
docker pull python:3.11-slim
docker pull node:18-alpine
docker pull redis:latest

# Verify they were downloaded
docker images
```

### Exercise 2 — Run Each as a Container
```bash
# Run a Python container interactively
docker run -it --name my-python python:3.11-slim python
# Try: print("Hello from Python inside Docker!")
# Exit with: Ctrl+D or exit()

# Run a Node.js container interactively
docker run -it --name my-node node:18-alpine node
# Try: console.log("Hello from Node.js!")
# Exit with: Ctrl+C twice

# Run Redis in the background
docker run -d --name my-redis -p 6379:6379 redis:latest
```

### Exercise 3 — Inspect Running Containers
```bash
# See all running containers
docker ps

# See logs from Redis
docker logs my-redis

# Check resource usage
docker stats --no-stream
```

### Exercise 4 — Clean Up
```bash
# Stop all running containers
docker stop my-redis

# Remove all three containers
docker rm my-python my-node my-redis

# Verify they're gone
docker ps -a

# (Optional) Remove the images to free disk space
docker rmi python:3.11-slim node:18-alpine redis:latest
```

> ✅ **You've completed the exercise!** You pulled images, ran containers, inspected them, and cleaned up — the full Docker workflow.

---

## 📚 Helpful Resources

| Resource | Link |
|---------|------|
| Docker Official Docs | https://docs.docker.com |
| Docker Hub | https://hub.docker.com |
| Play with Docker | https://labs.play-with-docker.com |
| Docker Curriculum (free) | https://docker-curriculum.com |
| Hello Whale Demo Repo | https://github.com/ajeetraina/hellowhale |

---

*Happy containerizing! 🐳*

