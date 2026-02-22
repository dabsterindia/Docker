# 🐳 Docker Zero to Production — A 10-Day Learning Guide

> A structured, hands-on Docker learning journey — from installing Docker for the first time to building CI/CD pipelines and deploying production-grade multi-container applications.

<div align="center">

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

</div>

---

## 👋 Who Is This For?

This guide is written for **complete beginners** — no prior Docker knowledge needed. If you can run a terminal command, you can follow this guide. By the end of Day 10, you'll be building, shipping, and automating real containerised applications the way professional DevOps engineers do.

**You'll be able to:**
- Understand containers, images, and the Docker ecosystem
- Write Dockerfiles and build optimised images
- Run multi-container apps with a single `docker compose up`
- Push images to Docker Hub and private registries
- Automate builds and deployments with GitHub Actions CI/CD
- Build real full-stack apps: REST APIs, chat apps, job queues, and more

---

## 📁 Repository Structure

```
docker-learning-guide/
│
├── README.md                          ← You are here (Landing Page)
│
├── Day1-README.md                     ← What is Docker & Containers
├── Day2-README.md                     ← Docker Images Deep Dive
├── Day3-README.md                     ← Writing Dockerfiles
├── Day4-README.md                     ← Building Efficient Images
├── Day5-README.md                     ← Docker Registries (Hub + Private)
├── Day6-README.md                     ← Volumes & Networking
├── Day7-README.md                     ← Docker Compose Fundamentals
├── Day8-README.md                     ← Docker Compose: 5 Full-Stack Apps
├── Day9-README.md                     ← Docker in CI/CD Pipelines
│
└── Bonus-Docker-Compose-Apps-README.md  ← 10 Practice Apps
```

---

## 🗓️ The 10-Day Learning Path

```
Week 1: Foundations                    Week 2: Real-World Applications
──────────────────────────────────     ──────────────────────────────────
Day 1: What is Docker?                 Day 6: Volumes & Networking
Day 2: Docker Images                   Day 7: Docker Compose
Day 3: Dockerfiles                     Day 8: 5 Full-Stack Projects
Day 4: Efficient Images                Day 9: CI/CD Pipelines
Day 5: Registries & Publishing         Bonus: 10 Practice Apps
```

---

## 📖 Day-by-Day Summary

### 📘 [Day 1 — Introduction to Docker & Containers](./Day1-README.md)

The foundation. Understand the core problem Docker solves and get it running on your machine.

**Topics covered:**
- What is a Container? The "works on my machine" problem explained
- Containers vs Virtual Machines — architecture diagrams and comparison table
- What is Docker? Core components: Engine, CLI, Docker Hub
- Docker Engine architecture — how CLI → Daemon → Container works
- Docker terminology glossary with real-world analogies
- Installing Docker on Windows, macOS, and Linux
- Your first container: `docker run hello-world` — step-by-step breakdown
- Developer vs Operations responsibilities
- Interactive Ubuntu container exercise

**Key command learned:**
```bash
docker run hello-world
docker run -it ubuntu bash
```

---

### 📗 [Day 2 — Docker Images Deep Dive](./Day2-README.md)

Images are the blueprint for everything. Learn how they're built, stored, and shared.

**Topics covered:**
- What is a Docker Image? Read-only templates explained
- How image layers work — why Docker is efficient and fast
- Play with Docker (browser-based practice — no install needed)
- Docker Hub account setup and Hello Whale demo project
- Build your first image and push it to Docker Hub
- Essential image commands: `search`, `pull`, `images`, `rmi`, `inspect`
- Running containers from images with port mapping and detached mode
- Container management and troubleshooting commands
- `docker exec`, `docker logs`, `docker stats`

**Key commands learned:**
```bash
docker pull nginx:latest
docker build -t my-app .
docker push yourusername/my-app:v1.0
docker run -d -p 8080:80 --name my-nginx nginx
```

---

### 📙 [Day 3 — Writing Your First Dockerfile](./Day3-README.md)

A Dockerfile is the recipe for your container. Learn every instruction and build real apps.

**Topics covered:**
- What is a Dockerfile? Recipe → Image → Container mental model
- How Docker builds layer by layer — and why order matters for caching
- Every Dockerfile instruction explained with examples:
  `FROM`, `WORKDIR`, `COPY`, `ADD`, `RUN`, `CMD`, `ENTRYPOINT`, `EXPOSE`, `ENV`, `ARG`, `VOLUME`, `LABEL`
- `CMD` vs `ENTRYPOINT` — the difference explained clearly
- Example 1: Simple Python "Hello World" app
- Example 2: Node.js HTTP web server
- Example 3: Python Flask app with `requirements.txt` (real-world pattern)
- `.dockerignore` — what it is and why it matters
- Practice exercise: Bash system info script

**Key concept learned:**
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .        # ← copy this FIRST for layer caching
RUN pip install -r requirements.txt
COPY app.py .
CMD ["python", "app.py"]
```

---

### 📕 [Day 4 — Building Efficient Docker Images](./Day4-README.md)

Smaller, faster, safer images. Learn the optimisation techniques used in production.

**Topics covered:**
- Understanding layer caching — with a real before/after time comparison
- Best Practice 1: Order instructions from least → most frequently changed
- Best Practice 2: `.dockerignore` to exclude bloat and secrets
- Best Practice 3: Combine `RUN` commands to minimise layers
- Best Practice 4: Use specific image tags — never `:latest` in production
- Best Practice 5: Run as a non-root USER for security
- Best Practice 6: HEALTHCHECK — how Docker monitors container readiness
- **Multi-Stage Builds** — the most powerful optimisation technique
- Go app example: 810MB single-stage → 12MB multi-stage (98.5% reduction!)
- Python and Node.js multi-stage build patterns
- Practice exercise: Measure image size before/after `.dockerignore`
- Image analysis commands: `docker history`, `docker system df`

**Key concept learned:**
```dockerfile
# Stage 1: Build (large, discarded after build)
FROM golang:1.19 AS builder
RUN go build -o myapp main.go

# Stage 2: Runtime (tiny, this is what ships)
FROM alpine:latest
COPY --from=builder /app/myapp .
CMD ["./myapp"]
```

---

### 📒 [Day 5 — Docker Registries: Public & Private](./Day5-README.md)

Images need a home. Learn how to publish, share, and secure your images.

**Topics covered:**
- What is a Docker Registry? Registry → Repository → Tag hierarchy
- Docker Hub setup, login, and account best practices
- Image tagging — semantic versioning strategy explained
- Why `:latest` is dangerous in production
- Pushing images and how layer deduplication saves upload time
- Full publish workflow: build → tag → push → delete local → pull back
- **Private Registries** — why teams need them (security, compliance, speed)
- Option 1: Self-hosted `registry:2` with persistent storage and web UI
- Option 2: GitHub Container Registry (GHCR) — best free option
- Option 3: GitLab Container Registry
- Option 4: AWS ECR, Azure ACR, Google Artifact Registry
- Registry comparison table — choose the right one for your use case
- Registry security: access tokens, scanning with `docker scout`, read-only tokens

**Key commands learned:**
```bash
docker tag my-app yourusername/my-app:v1.0
docker push yourusername/my-app:v1.0
docker pull ghcr.io/yourusername/my-app:v1.0
docker run -d -p 5000:5000 registry:2    # self-hosted registry
```

---

### 📓 [Day 6 — Docker Volumes & Networking](./Day6-README.md)

Data persistence and container communication — the two pillars of production deployments.

**Topics covered:**
- The core problem: containers are ephemeral — data is lost on deletion
- **3 Mount Types:** Named Volumes, Bind Mounts, tmpfs (in-memory)
- Named Volume commands: `create`, `ls`, `inspect`, `rm`, `prune`
- Example 1: Persistent MySQL database — prove data survives container deletion
- How volume attachment works (host path → container filesystem diagram)
- Example 2: Bind mounts for live development — edit locally, see changes instantly
- Anonymous volumes — why to avoid them in production
- **Docker Networking** — bridge, host, none network types
- Network commands: `create`, `ls`, `inspect`, `connect`, `rm`
- Docker DNS — how containers find each other by name (not IP)
- Full practice exercise: Node.js web app + MySQL via custom network
- 8-step exercise: prove DNS works, prove isolation works, prove data persists
- Production best practices table for both volumes and networking

**Key concept learned:**
```bash
docker network create app-network
docker run -d --name mysql-db --network app-network \
  -v mysql-data:/var/lib/mysql mysql:8.0
# web-app can now reach MySQL at hostname "mysql-db"
```

---

### 📔 [Day 7 — Docker Compose Fundamentals](./Day7-README.md)

Replace 10 manual commands with one YAML file and one command.

**Topics covered:**
- The problem: managing multi-container apps manually doesn't scale
- What is Docker Compose? YAML-defined application stacks
- Compose file structure: `services`, `volumes`, `networks`
- Every core instruction explained: `image`, `build`, `ports`, `environment`,
  `volumes`, `networks`, `depends_on`, `healthcheck`, `restart`
- `depends_on` vs `healthcheck` — the critical difference (startup order vs readiness)
- Using `.env` files for secrets — never hardcode passwords in compose files
- All essential Compose commands with examples
- Example 1: Simple Node.js + MySQL starter template
- **Full Project: URL Shortener** — Node.js + MySQL + Redis + phpMyAdmin
  - Shorten long URLs and get short codes
  - Redis caches redirects for fast lookups (cache HIT/MISS logging)
  - phpMyAdmin for visual database browsing
- Architecture diagram of the full stack

**Key command learned:**
```bash
docker compose up -d          # start everything
docker compose logs -f web    # follow one service
docker compose exec db mysql  # shell into service
docker compose down           # stop everything
```

---

### 📃 [Day 8 — Docker Compose: 5 Full-Stack Projects](./Day8-README.md)

Build real applications. Each project teaches a pattern used in production systems today.

**Projects built:**

| Project | Stack | Pattern |
|---------|-------|---------|
| **Visit Counter** | Flask + Redis | In-memory counter, manual → Compose comparison |
| **Todo App** | Node.js + MongoDB + Mongo Express | CRUD with NoSQL + admin UI |
| **Real-Time Chat** | Node.js + Redis Pub/Sub + Socket.io | Event-driven broadcast |
| **REST API** | FastAPI + PostgreSQL + pgAdmin | SQL + auto Swagger docs |
| **Blog Platform** | PHP + MySQL + Nginx + phpMyAdmin | Classic LAMP-style reverse proxy |

**Each project includes:** complete source code, Dockerfile, docker-compose.yml, `.env` template, and run/test instructions.

**Key lesson:** The same `docker compose up -d` workflow deploys radically different technology stacks identically.

---

### 📜 [Day 9 — Docker in CI/CD Pipelines](./Day9-README.md)

Stop deploying manually. Make every `git push` automatically build, test, and ship your image.

**Topics covered:**
- The problem: manual deployments don't scale, aren't auditable, and break under pressure
- CI/CD concepts: Continuous Integration vs Continuous Delivery
- GitHub Actions key concepts: workflows, triggers, jobs, steps, secrets, runners
- Setting up Docker Hub secrets in GitHub (access tokens, not passwords)
- **Workflow 1:** Basic build and push on every push to `main`
- **Workflow 2:** Smart tagging — `:dev`, `:staging`, `:v1.2.3`, `:latest`, `:sha-abc1234`
- **Workflow 3:** Test → Build → Push pipeline (image never pushed if tests fail)
- **Workflow 4:** Push to GitHub Container Registry (GHCR) with automatic `GITHUB_TOKEN`
- **Full Project:** Node.js API with 6 Jest tests, multi-stage Dockerfile, and complete 3-job CI/CD pipeline (test → build/push → security scan with Trivy)
- Environment tagging strategy table
- CI/CD security best practices

**Key concept learned:**
```yaml
jobs:
  test:
    steps:
      - run: docker build --target test -t myapp:test .
      - run: docker run --rm myapp:test npm test
  push:
    needs: test       # ← only runs if tests pass!
    steps:
      - uses: docker/build-push-action@v5
```

---

## 🎁 [Bonus — 10 Docker Compose Practice Apps](./Bonus-Docker-Compose-Apps-README.md)

A complete practice collection of 10 progressively complex, fully working apps. Each one is self-contained, copy-paste ready, and teaches a specific real-world architecture pattern.

| # | App | Stack | Pattern |
|---|-----|-------|---------|
| 1 | Weather Dashboard | Python + Redis | API response caching |
| 2 | Notes App | Node.js + MongoDB | CRUD + NoSQL |
| 3 | Job Queue Worker | Python + Redis + Worker | Background job processing |
| 4 | Leaderboard API | FastAPI + PostgreSQL + Redis | SQL + sorted set cache |
| 5 | File Upload Service | Node.js + MinIO | S3-compatible object storage |
| 6 | Auth Service | Node.js + PostgreSQL + Redis | JWT auth + token revocation |
| 7 | Email Newsletter | Node.js + MySQL + Mailhog | Dev email catching |
| 8 | Inventory + Grafana | Flask + PostgreSQL + Prometheus | Metrics and dashboards |
| 9 | Microservices Gateway | Nginx + 3× Node.js | API Gateway pattern |
| 10 | Full SaaS Starter | Next.js + FastAPI + PostgreSQL + Redis + Nginx | Production full-stack |

Every app includes: full source code, Dockerfile(s), `docker-compose.yml`, `.env.example`, run instructions, and challenge extensions.

---

## ⚡ Quick Start

### Prerequisites
- Docker Desktop installed → [docker.com](https://docker.com)
- Git installed
- A terminal (bash, zsh, or PowerShell)

### Run Your First Container (30 seconds)
```bash
# Verify Docker is working
docker run hello-world

# Run an interactive Ubuntu shell
docker run -it --rm ubuntu bash
```

### Jump Into Any Day
```bash
# Clone this repository
git clone https://github.com/yourusername/docker-learning-guide.git
cd docker-learning-guide

# Open any day's README to start learning
# Each day's code examples can be copy-pasted directly into your terminal
```

### Run a Bonus App (under 2 minutes)
```bash
cd bonus-apps/01-weather-dashboard
cp .env.example .env
docker compose up -d --build
open http://localhost:5001
```

---

## 🛠️ Technologies & Tools Covered

### Container & Orchestration
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=flat&logo=docker&logoColor=white)

### Languages & Frameworks
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=flat&logo=flask&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-777BB4?style=flat&logo=php&logoColor=white)

### Databases & Storage
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)
![MinIO](https://img.shields.io/badge/MinIO-C72E49?style=flat&logo=minio&logoColor=white)

### Infrastructure & DevOps
![Nginx](https://img.shields.io/badge/Nginx-009639?style=flat&logo=nginx&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat&logo=github-actions&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-F46800?style=flat&logo=grafana&logoColor=white)
![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=flat&logo=prometheus&logoColor=white)

---

## 📊 What You'll Build Across All 10 Days

```
Day 1  ── Hello World container
Day 2  ── nginx web server, first pushed image on Docker Hub
Day 3  ── Python app, Node.js server, Flask app — all containerised
Day 4  ── Go app: 810MB → 12MB with multi-stage builds
Day 5  ── Images published to Docker Hub + GHCR
Day 6  ── Node.js + MySQL stack with custom networking
Day 7  ── URL Shortener (Node.js + MySQL + Redis + phpMyAdmin)
Day 8  ── Visit Counter, Todo App, Chat App, REST API, Blog Platform
Day 9  ── Full CI/CD pipeline: test → build → scan → push on git push
Bonus  ── Weather Dashboard, Job Queue, Leaderboard, File Upload,
           Auth Service, Newsletter, Inventory+Grafana,
           Microservices Gateway, Full SaaS Starter
```

---

## 💡 Learning Tips

**Do, don't just read.** Every code block in this guide is meant to be copy-pasted and run. The muscle memory of typing commands matters.

**Break things on purpose.** Delete a volume and see what happens. Remove a `depends_on` and watch services fail to connect. Failures teach more than successes.

**Read the logs.** `docker compose logs -f` is your best friend. Almost every issue is explained in the logs if you know to look there.

**Use the cheat sheets.** Every day ends with a quick reference section. Bookmark them.

**Layer the concepts.** Each day builds on the last. If something in Day 6 feels confusing, the answer is usually in Day 3 or Day 4.

---

## 🗺️ What Comes After This Guide

Once you've completed all 10 days, your natural next steps are:

```
Docker Mastery (This Guide)
         │
         ├── Kubernetes ──────── Container orchestration at scale
         │   (k8s, k3s, minikube)
         │
         ├── Helm ────────────── Kubernetes package manager
         │
         ├── Terraform ───────── Infrastructure as Code
         │
         ├── ArgoCD / FluxCD ─── GitOps continuous deployment
         │
         └── Cloud Platforms ─── EKS (AWS), AKS (Azure), GKE (GCP)
```

**Recommended resources for next steps:**
- [Kubernetes Official Docs](https://kubernetes.io/docs/home/)
- [Play with Kubernetes](https://labs.play-with-k8s.com/)
- [Docker Certified Associate Exam](https://training.mirantis.com/certification/dca-certification-exam/)
- [KodeKloud Docker & Kubernetes courses](https://kodekloud.com)

---

## 📚 Official References

| Resource | Link |
|---------|------|
| Docker Official Documentation | https://docs.docker.com |
| Docker Hub | https://hub.docker.com |
| Docker Compose Reference | https://docs.docker.com/compose/compose-file/ |
| GitHub Actions for Docker | https://docs.docker.com/ci-cd/github-actions/ |
| Play with Docker (browser) | https://labs.play-with-docker.com |
| DockerLabs (hands-on labs) | https://dockerlabs.collabnix.com |
| Awesome Compose Examples | https://github.com/docker/awesome-compose |

---

## 🤝 Contributing

Found a bug? Have a better example? Want to add a Day 10?

1. Fork this repository
2. Create a feature branch: `git checkout -b improve/day-3-dockerfile`
3. Make your changes
4. Submit a Pull Request with a clear description

---

<div align="center">

**Built for learners, by learners. Happy containerising! 🐳**

*If this guide helped you, consider starring ⭐ the repository so others can find it.*

</div>