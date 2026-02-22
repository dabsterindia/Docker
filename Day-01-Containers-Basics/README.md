# 🐳 Day 1 — Getting Started with Docker

> **Goal for today:** Understand what containers and Docker are, how they differ from Virtual Machines, and get Docker running on your machine with your first container.

---

## 📦 What is a Container?

A **container** is a lightweight, standalone package that includes everything needed to run a piece of software:

- ✅ Application code
- ✅ Runtime (e.g. Node.js, Python)
- ✅ System tools & libraries
- ✅ Configuration & environment settings

Think of it like a **shipping container** 🚢 — no matter which ship (server) it travels on, the contents stay exactly the same and work exactly the same way. A container running on your laptop will behave identically on a colleague's machine or a cloud server.

### 🤔 Why Do We Need Containers?

Before containers, developers often ran into the dreaded **"it works on my machine"** problem. The app worked perfectly in development but crashed in production because of different OS versions, missing libraries, or conflicting settings.

**Containers solve this by packaging the app AND its environment together.**

```
Without Containers:          With Containers:
─────────────────            ─────────────────────────
Developer's laptop ✅        Developer's laptop  ✅
Staging server     ❌        Staging server      ✅
Production server  ❌        Production server   ✅
Colleague's Mac    ❌        Colleague's Mac     ✅
```

---

## ⚖️ Containers vs Virtual Machines — Key Differences

Both containers and VMs are used to isolate applications, but they work very differently under the hood.

```
┌─────────────────────────────────────────────────────┐
│                   VIRTUAL MACHINES                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐        │
│  │   App A   │  │   App B   │  │   App C   │        │
│  │  Libs/Deps│  │  Libs/Deps│  │  Libs/Deps│        │
│  │  Guest OS │  │  Guest OS │  │  Guest OS │        │
│  └───────────┘  └───────────┘  └───────────┘        │
│            Hypervisor (e.g. VMware)                  │
│                   Host OS                            │
│                  Hardware                            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    CONTAINERS                        │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐        │
│  │   App A   │  │   App B   │  │   App C   │        │
│  │  Libs/Deps│  │  Libs/Deps│  │  Libs/Deps│        │
│  └───────────┘  └───────────┘  └───────────┘        │
│              Docker Engine (shared kernel)           │
│                   Host OS                            │
│                  Hardware                            │
└─────────────────────────────────────────────────────┘
```

| Feature | 🐳 Containers | 💻 Virtual Machines |
|--------|-------------|-------------------|
| **OS** | Share the host OS kernel | Each has its own full OS |
| **Size** | Lightweight — MBs | Heavy — GBs |
| **Startup Time** | Seconds | Minutes |
| **Isolation** | Process-level isolation | Full hardware-level isolation |
| **Performance** | Near-native performance | Some overhead from hypervisor |
| **Use Case** | Microservices, CI/CD, scaling | Legacy apps, full OS environments |
| **Portability** | Highly portable | Less portable |

> **Bottom line:** Use containers when you need speed, efficiency, and portability. Use VMs when you need complete OS-level isolation.

---

## 🐋 What is Docker?

**Docker** is an open-source platform that makes it easy to **build, ship, and run** applications inside containers. It's the most widely used containerization tool in the world, with millions of developers and companies relying on it daily.

Docker essentially does three things:

1. **Build** — Packages your application into an image using a `Dockerfile`
2. **Ship** — Pushes images to a registry (like Docker Hub) to share them
3. **Run** — Starts containers from images on any machine

---

## 🔩 Core Components of Docker

### 1. Docker Engine
The **brain and muscle** of Docker. It's a client-server application with two parts:
- **Docker Daemon (`dockerd`)** — A background service that manages building, running, and distributing containers. You don't interact with it directly.
- **REST API** — The interface between the CLI and the daemon.

### 2. Docker CLI (Command-Line Interface)
The tool you use every day. When you type `docker run ...` or `docker build ...`, the CLI sends instructions to the Docker Daemon via the API.

```bash
# You type this in your terminal (CLI)
docker run nginx

# Behind the scenes:
# CLI → REST API → Docker Daemon → pulls image → starts container
```

### 3. Docker Hub
A **public cloud registry** — think of it as the "App Store" or "GitHub" for Docker images. It hosts millions of official and community images (nginx, ubuntu, postgres, python, etc.) that you can pull and use instantly.

> 🔗 Browse images at [hub.docker.com](https://hub.docker.com)

---

## 🏗️ Docker Engine Architecture

Here's how all the components connect when you run a command:

```
┌─────────────────────────────────────────────────────────────┐
│                        Your Terminal                         │
│                    docker run nginx                          │
└────────────────────────┬────────────────────────────────────┘
                         │ (CLI sends request)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Docker Daemon                           │
│   (Manages images, containers, networks, volumes)            │
│                                                              │
│   1. Check if 'nginx' image exists locally                   │
│   2. If not → pull from Docker Hub                           │
│   3. Create and start container from the image               │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐     ┌────────────────────────┐
│     Local Images     │     │      Docker Hub         │
│  (your machine's     │     │  (remote image store)   │
│   image cache)       │     │                         │
└──────────────────────┘     └────────────────────────┘
```

---

## 📖 Docker Terminologies

Before going further, let's make sure these key terms are crystal clear:

| Term | Definition | Real-world Analogy |
|------|-----------|-------------------|
| **Image** | Read-only blueprint for a container | Recipe / Blueprint |
| **Container** | A running instance of an image | A meal cooked from a recipe |
| **Dockerfile** | Script of instructions to build an image | The recipe itself |
| **Registry** | Storage for Docker images (e.g. Docker Hub) | App Store / GitHub |
| **Docker Daemon** | Background service managing containers | The kitchen staff |
| **Docker CLI** | Terminal tool to talk to the daemon | You placing an order |
| **Volume** | Persistent storage for containers | An external hard drive |
| **Network** | Allows containers to communicate | A private office Wi-Fi |

---

## 🛠️ Hands-On: Installation & First Command

### Install Docker

**Windows / macOS — Docker Desktop (Recommended for beginners)**
1. Visit [https://docker.com](https://docker.com) and download **Docker Desktop**
2. Run the installer and follow the prompts
3. Once installed, Docker Desktop runs as a background app with a GUI dashboard

**Linux (Ubuntu/Debian)**
```bash
# Update package index
sudo apt-get update

# Install Docker
sudo apt-get install docker.io

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker  # auto-start on boot

# (Optional) Run Docker without sudo
sudo usermod -aG docker $USER
# Log out and back in for this to take effect
```

---

### Verify Your Installation

```bash
# Check Docker version
docker --version
# Expected output: Docker version 24.x.x, build ...

# Check that the daemon is running
docker info
# Shows system-wide info: containers, images, OS, kernel version, etc.
```

---

### Your First Container — Hello World!

```bash
docker run hello-world
```

**What happens behind the scenes when you run this?**

```
Step 1: Docker CLI sends "run hello-world" to the Docker Daemon
Step 2: Daemon checks — is the 'hello-world' image on your machine? No.
Step 3: Daemon pulls 'hello-world' image from Docker Hub
Step 4: Daemon creates a new container from the image
Step 5: Container runs, prints the welcome message
Step 6: Container exits (it has nothing else to do)
```

You should see output like:
```
Hello from Docker!
This message shows that your installation appears to be working correctly.
...
```

> 🎉 **If you see this message — Docker is installed and working!**

---

## 👥 Core Responsibilities — Developers vs Operations

Docker is used differently by different roles in a team. Understanding this helps you see the full picture:

```
┌─────────────────────────────────────────────────────────────┐
│                     DEVELOPERS                               │
│                                                              │
│  • Write Dockerfiles to containerize their applications      │
│  • Build images locally and test containers                  │
│  • Push images to Docker Hub or a private registry           │
│  • Define services using Docker Compose                      │
│  • Ensure the app works consistently across environments     │
└─────────────────────────┬───────────────────────────────────┘
                          │  Hands off the image ➡️
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  OPERATIONS / DevOps                         │
│                                                              │
│  • Pull images and deploy containers to production servers   │
│  • Manage container orchestration (e.g. Kubernetes)          │
│  • Monitor container health and resource usage               │
│  • Configure networking, volumes, and security               │
│  • Set up CI/CD pipelines that build and deploy images       │
└─────────────────────────────────────────────────────────────┘
```

> 💡 With Docker, **developers and operations teams speak the same language** — the container image. This reduces friction and is the foundation of the **DevOps** culture.

---

## ✅ Key Concepts to Understand Today

Before moving to Day 2, make sure you can explain these in your own words:

- [ ] Containers package apps with **all their dependencies** so they run consistently anywhere
- [ ] Docker makes container management simple with an easy-to-use CLI and ecosystem
- [ ] **Images** are read-only blueprints; **Containers** are live running instances of those blueprints
- [ ] Containers are **much lighter** than Virtual Machines because they share the host OS kernel
- [ ] Docker has three main components: **Engine**, **CLI**, and **Hub**

---

## 🧪 Practice Exercise — Explore a Container from the Inside

```bash
# Run an interactive Ubuntu container
docker run -it ubuntu bash

# -i → interactive: keeps the terminal open
# -t → tty: gives you a proper terminal session
# ubuntu → the image to use
# bash → the command to run inside the container
```

Once inside the container, try these commands:

```bash
# See the filesystem
ls

# Check which OS you're running
cat /etc/os-release

# See what processes are running
ps aux

# Check available disk space
df -h

# Try installing something
apt-get update && apt-get install -y curl

# Test it works
curl https://example.com

# Exit the container (container stops when you exit)
exit
```

> 💡 **Notice:** You just ran Ubuntu commands without having Ubuntu installed on your machine! This is the power of containers — isolated, portable environments on demand.

**Bonus Challenge:**
```bash
# After exiting, check that the container is stopped (not running)
docker ps

# But it still exists in a stopped state
docker ps -a

# Clean it up
docker rm <container_id>
```

---

## 📚 References & Further Reading

| Resource | Link |
|---------|------|
| Docker Official Docs | https://docs.docker.com |
| Docker Labs — VIT Intro | https://dockerlabs.collabnix.com/docker/Docker_VIT_Intro/Docker_VIT_Intro.html |
| Play with Docker (browser) | https://labs.play-with-docker.com |
| Docker Hub | https://hub.docker.com |

---

## ⏭️ What's Next — Day 2 Preview

On Day 2, you'll learn about **Docker Images in depth**:
- How images are built using layers
- Writing your first `Dockerfile`
- Building, tagging, and pushing your own custom image
- Exploring the Docker Hub ecosystem

---

*Keep going — you're building real DevOps skills! 🚀*
