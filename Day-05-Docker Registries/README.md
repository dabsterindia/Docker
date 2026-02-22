# 🐳 Day 5 — Docker Registries: Public & Private

> **Goal for today:** Understand what Docker registries are, publish your own image to Docker Hub, and explore the landscape of private registry options for teams and production use.

---

## 📦 What is a Docker Registry?

A **Docker Registry** is a storage and distribution system for Docker images. It's the place where images live between being built and being run.

Think of it in layers:

```
┌─────────────────────────────────────────────────────────────┐
│                        REGISTRY                              │
│   (e.g. Docker Hub, GHCR, AWS ECR)                          │
│                                                              │
│   ┌─────────────────┐     ┌─────────────────┐               │
│   │  REPOSITORY     │     │  REPOSITORY     │               │
│   │  myapp          │     │  nginx          │               │
│   │                 │     │                 │               │
│   │  Tags:          │     │  Tags:          │               │
│   │  • v1.0  🏷️    │     │  • latest 🏷️   │               │
│   │  • v1.1  🏷️    │     │  • 1.25   🏷️   │               │
│   │  • latest 🏷️   │     │  • alpine 🏷️   │               │
│   └─────────────────┘     └─────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

| Term | Meaning | Example |
|------|---------|---------|
| **Registry** | The server that hosts image repositories | `hub.docker.com`, `ghcr.io` |
| **Repository** | A collection of related images (different versions of one app) | `nginx`, `yourusername/myapp` |
| **Tag** | A label for a specific version of an image | `latest`, `v1.0`, `3.9-slim` |
| **Image Reference** | Full address to pull a specific image | `yourusername/myapp:v1.0` |

### How Registries Fit Into the Docker Workflow

```
Developer's Machine                    Registry                   Server / Cloud
─────────────────────                  ────────────────           ──────────────────
1. Write code
2. Create Dockerfile
3. docker build → Image
4. docker tag                ──push──▶ Stores image    ──pull──▶ 5. docker run
                                        (versioned)              6. App is live! 🚀
```

---

## 🌐 Docker Hub — The Default Public Registry

**Docker Hub** (`hub.docker.com`) is the world's largest container image registry, hosting millions of official and community images. When you run `docker pull nginx`, Docker automatically looks on Docker Hub.

### Docker Hub Account Setup

**Step 1 — Create Your Account**

Go to [https://hub.docker.com](https://hub.docker.com) and sign up for a free account.

> **Choose your username carefully** — it becomes part of every image name you publish:
> `yourusername/image-name:tag`

**Step 2 — Login from the CLI**

```bash
docker login

# You'll be prompted for:
# Username: yourusername
# Password: ********

# Expected output:
# Login Succeeded ✅

# Login with username directly (skips the prompt)
docker login -u yourusername

# Login to a different registry (not Docker Hub)
docker login ghcr.io
docker login registry.gitlab.com
```

> 💡 Your credentials are saved in `~/.docker/config.json` so you don't need to log in every time.

---

## 🏷️ Tagging Images — Naming Conventions

A Docker image tag is the full address that tells Docker **where to push/pull** an image and **which version** it is.

### Tag Format

```
┌────────────────────────────────────────────────────────────┐
│   registry/username/repository:tag                          │
│                                                             │
│   docker.io/yourusername/my-python-app:v1.0                 │
│   │          │             │            │                   │
│   Registry   │             │            Version/Tag         │
│   (optional, │             Repository                       │
│   defaults   Username/                                      │
│   to Hub)    Namespace                                      │
└────────────────────────────────────────────────────────────┘
```

### Tagging Commands

```bash
# Basic tag: username/repository:version
docker tag my-python-app yourusername/my-python-app:v1.0

# Also tag as 'latest' (the default tag when no tag is specified)
docker tag my-python-app yourusername/my-python-app:latest

# Tag the same image with multiple tags (common practice)
docker tag my-python-app yourusername/my-python-app:v1.0
docker tag my-python-app yourusername/my-python-app:v1
docker tag my-python-app yourusername/my-python-app:latest

# Tag using an existing image ID
docker tag abc123def456 yourusername/my-python-app:v1.0

# Verify your tags
docker images | grep my-python-app
```

### Tagging Strategy — Semantic Versioning

```
yourusername/myapp:latest      ← always points to the newest stable build
yourusername/myapp:v2          ← major version (gets minor/patch updates)
yourusername/myapp:v2.1        ← minor version (gets patch updates)
yourusername/myapp:v2.1.3      ← exact version (never changes) ← most reliable!
yourusername/myapp:dev         ← work-in-progress / pre-release
```

> 🔒 **Production Tip:** Always use a pinned version tag (e.g. `v2.1.3`) in production — `latest` changes without warning and can break your deployments.

---

## 📤 Pushing Images to Docker Hub

```bash
# Make sure you're logged in
docker login

# Push a specific version
docker push yourusername/my-python-app:v1.0

# Push the latest tag
docker push yourusername/my-python-app:latest

# Push all tags at once
docker push yourusername/my-python-app --all-tags

# Watch the output — each layer is uploaded separately:
# The push refers to repository [docker.io/yourusername/my-python-app]
# 5f70bf18a086: Pushed
# d7a513a663c1: Layer already exists  ← cached layers skip re-upload!
# v1.0: digest: sha256:abc123... size: 1234
```

> ⚡ **Layers are deduplicated** — if Docker Hub already has a layer (e.g. the `python:3.9-slim` base), it won't re-upload it. Only your new layers are uploaded, keeping pushes fast.

---

## 📥 Pulling and Running Images

```bash
# Pull a specific version from Docker Hub
docker pull yourusername/my-python-app:v1.0

# Pull the latest tag (default if no tag given)
docker pull yourusername/my-python-app

# Pull from a different registry (GHCR example)
docker pull ghcr.io/yourusername/my-python-app:v1.0

# Run the pulled image directly (pulls automatically if not local)
docker run yourusername/my-python-app:v1.0

# Run and remove container after it exits (--rm flag)
docker run --rm yourusername/my-python-app:v1.0
```

---

## 🧪 Practice Exercise — Full Publish Workflow

Work through this end-to-end to experience the complete Docker Hub workflow.

### Step 1 — Create a Simple App to Publish

```bash
mkdir my-registry-demo && cd my-registry-demo
```

Create `app.py`:
```python
import platform
import sys

print("=" * 45)
print("  🐳 My First Published Docker Image!")
print("=" * 45)
print(f"  Python version : {sys.version.split()[0]}")
print(f"  Platform       : {platform.system()} {platform.release()}")
print(f"  Architecture   : {platform.machine()}")
print("=" * 45)
print("  Successfully pulled from Docker Hub! ✅")
print("=" * 45)
```

Create `Dockerfile`:
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY app.py .
CMD ["python", "app.py"]
```

### Step 2 — Build and Tag

```bash
# Build the image
docker build -t my-registry-demo .

# Tag with your Docker Hub username (replace 'yourusername')
docker tag my-registry-demo yourusername/my-registry-demo:v1.0
docker tag my-registry-demo yourusername/my-registry-demo:latest

# Confirm your tags exist
docker images | grep my-registry-demo
```

### Step 3 — Push to Docker Hub

```bash
# Log in (if not already)
docker login

# Push both tags
docker push yourusername/my-registry-demo:v1.0
docker push yourusername/my-registry-demo:latest

# 🌐 Visit https://hub.docker.com/r/yourusername/my-registry-demo
# Your image is now publicly available to the entire world!
```

### Step 4 — Delete Local Image and Pull It Back

```bash
# Delete the local image (simulates pulling on a fresh machine)
docker rmi my-registry-demo
docker rmi yourusername/my-registry-demo:v1.0
docker rmi yourusername/my-registry-demo:latest

# Confirm it's gone
docker images | grep my-registry-demo
# (should return nothing)

# Pull it back from Docker Hub
docker pull yourusername/my-registry-demo:v1.0

# Run it — works exactly as before!
docker run yourusername/my-registry-demo:v1.0
```

### Step 5 — Share It!

```bash
# Anyone in the world can now run your image with:
docker run yourusername/my-registry-demo:v1.0

# They don't need your code, your Python installation, or any setup.
# The image contains everything. That's the power of Docker. 🚀
```

---

## 🔒 What is a Docker Private Registry?

A **private Docker registry** is a secure registry where only **authorized users, services, or CI/CD pipelines** can push or pull images. Your images are hidden from the public.

```
Public Registry (Docker Hub)          Private Registry
────────────────────────────          ────────────────────────────────
Anyone can pull images                Only authorized users can access
Open to the internet                  Access controlled via tokens/keys
Free for public images                May require authentication always
Great for open-source projects        Required for proprietary/internal apps
```

Think of it like GitHub repositories:
```
GitHub Public Repo   →  Docker Hub public image
GitHub Private Repo  →  Private Docker registry
```

### Why Teams Use Private Registries

| Reason | Details |
|--------|---------|
| 🔐 **Keep code private** | Proprietary app code stays inside the company |
| 🏢 **Internal images** | Base images customised with company tools/configs |
| ⚡ **Performance** | Registry hosted close to your servers = faster pulls |
| 🔑 **Access control** | Fine-grained control over who can push/pull what |
| 📋 **Compliance** | Financial, healthcare, and government sectors require it |
| 🔍 **Audit trails** | Track who pulled/pushed which image and when |

---

## 🏗️ Option 1 — Self-Hosted Docker Registry (100% Free)

Docker provides an official `registry:2` image — run it as a container on any machine to get your own private registry instantly.

### Quick Start

```bash
# Run the registry container on port 5000
docker run -d \
  -p 5000:5000 \
  --name my-registry \
  --restart=always \
  registry:2

# Verify it's running
docker ps | grep registry
curl http://localhost:5000/v2/   # Should return: {}
```

### Using Your Local Registry

```bash
# Tag an image for your local registry
docker tag my-python-app localhost:5000/my-python-app:v1.0

# Push to your local registry
docker push localhost:5000/my-python-app:v1.0

# Pull from your local registry
docker pull localhost:5000/my-python-app:v1.0

# List all repositories in your registry
curl http://localhost:5000/v2/_catalog
# Output: {"repositories":["my-python-app"]}

# List tags for a specific image
curl http://localhost:5000/v2/my-python-app/tags/list
# Output: {"name":"my-python-app","tags":["v1.0"]}
```

### Self-Hosted Registry with Persistent Storage

By default, the registry container stores images inside the container — they disappear if the container is removed. Mount a volume to persist images:

```bash
docker run -d \
  -p 5000:5000 \
  --name my-registry \
  --restart=always \
  -v /opt/registry-data:/var/lib/registry \
  registry:2

# Now images are saved to /opt/registry-data on your host machine
# They survive container restarts and removals
```

### Add a UI with Docker Registry Browser

The official registry has no web interface. Add one with a community UI container:

```bash
# Run registry + UI together
docker run -d -p 5000:5000 --name registry registry:2

docker run -d \
  -p 8080:8080 \
  --name registry-ui \
  -e REGISTRY_URL=http://registry:5000 \
  --link registry \
  joxit/docker-registry-ui:latest

# Open http://localhost:8080 to browse your registry visually
```

**Self-Hosted Registry — Pros & Cons:**

| ✅ Pros | ❌ Cons |
|---------|---------|
| 100% free | No UI by default |
| Full control over data | You manage security & TLS |
| Works offline / on-prem | You handle backups |
| No rate limits | Requires maintenance |
| Great for learning & internal infra | Not ideal for distributed teams |

---

## ☁️ Option 2 — Cloud-Hosted Private Registries

### 🐙 GitHub Container Registry (GHCR) — Most Recommended for Beginners

**`ghcr.io`** is GitHub's free container registry, tightly integrated with GitHub Actions for CI/CD.

```
Image format: ghcr.io/yourusername/image-name:tag
```

**Why GHCR is the best free option right now:**
- ✅ Unlimited private container images (for personal accounts)
- ✅ Free for individuals and open-source projects
- ✅ Built-in GitHub Actions integration
- ✅ Fine-grained access control via GitHub permissions
- ✅ Package visibility tied to your repository

```bash
# Step 1: Create a GitHub Personal Access Token (PAT)
# Go to: GitHub → Settings → Developer Settings → Personal Access Tokens
# Enable scopes: write:packages, read:packages, delete:packages

# Step 2: Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u yourusername --password-stdin

# Step 3: Tag your image for GHCR
docker tag my-python-app ghcr.io/yourusername/my-python-app:v1.0

# Step 4: Push to GHCR
docker push ghcr.io/yourusername/my-python-app:v1.0

# Step 5: Pull from GHCR
docker pull ghcr.io/yourusername/my-python-app:v1.0
```

👉 Manage your packages at: `https://github.com/yourusername?tab=packages`

---

### 🦊 GitLab Container Registry

Every GitLab project automatically gets a private container registry — no setup required.

```
Image format: registry.gitlab.com/yourusername/project/image:tag
```

```bash
# Login to GitLab registry
docker login registry.gitlab.com

# Tag and push
docker tag myapp registry.gitlab.com/yourusername/myproject/myapp:v1.0
docker push registry.gitlab.com/yourusername/myproject/myapp:v1.0
```

👉 Best for teams already using GitLab for source control and CI/CD.

---

## ☁️ Option 3 — Cloud Provider Registries

For teams deploying to a specific cloud platform, using that cloud's native registry gives the fastest pull speeds and tightest integration.

### AWS Elastic Container Registry (ECR)

```bash
# Authenticate with AWS ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag myapp 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0
```

### Azure Container Registry (ACR)

```bash
# Login to ACR
az acr login --name myregistry

# Tag and push
docker tag myapp myregistry.azurecr.io/myapp:v1.0
docker push myregistry.azurecr.io/myapp:v1.0
```

### Google Artifact Registry

```bash
# Configure authentication
gcloud auth configure-docker us-central1-docker.pkg.dev

# Tag and push
docker tag myapp us-central1-docker.pkg.dev/PROJECT_ID/myrepo/myapp:v1.0
docker push us-central1-docker.pkg.dev/PROJECT_ID/myrepo/myapp:v1.0
```

---

## 📊 Registry Comparison — Choose the Right One

| Registry | Private | Free Tier | Best For |
|----------|---------|-----------|----------|
| **Self-Hosted** (`registry:2`) | ✅ | ✅ Free | Full control, internal infra, learning |
| **GitHub GHCR** (`ghcr.io`) | ✅ | ✅ Free | Individuals, open-source, CI/CD with GitHub |
| **GitLab Registry** | ✅ | ✅ Free | GitLab users, built-in CI/CD |
| **Docker Hub** | ✅ | ⚠️ 1 private repo | Simple personal use |
| **AWS ECR** | ✅ | ⚠️ 500MB / 12mo | AWS / ECS / EKS workloads |
| **Azure ACR** | ✅ | ⚠️ With credits | Azure / AKS workloads |
| **Google GAR** | ✅ | ⚠️ Limited | GCP / GKE workloads |

> **For beginners:** Start with **Docker Hub** for public images and **GitHub GHCR** for private ones. Both are free and well-documented.

---

## 🔑 Registry Security Best Practices

```bash
# 1. Always logout when on shared machines
docker logout
docker logout ghcr.io

# 2. Use tokens instead of passwords
# Tokens can be scoped (read-only) and revoked without changing your password

# 3. Scan images for vulnerabilities
docker scout quickview yourusername/myapp:v1.0
# Docker Scout is built into Docker Desktop

# 4. Set image to private on Docker Hub
# Docker Hub → Repository → Settings → Visibility → Private

# 5. Use read-only tokens for production deployments
# Production servers should only PULL, never PUSH
# Create a separate token with read:packages scope only
```

---

## 📋 Quick Reference — Registry Commands

```bash
# Authentication
docker login                          # login to Docker Hub
docker login ghcr.io                  # login to GitHub registry
docker logout                         # logout

# Tagging
docker tag SOURCE_IMAGE REGISTRY/USER/REPO:TAG

# Pushing
docker push USER/IMAGE:TAG            # push to Docker Hub
docker push ghcr.io/USER/IMAGE:TAG    # push to GHCR

# Pulling
docker pull USER/IMAGE:TAG            # pull from Docker Hub
docker pull ghcr.io/USER/IMAGE:TAG    # pull from GHCR

# Self-Hosted
docker run -d -p 5000:5000 registry:2              # start local registry
docker tag IMAGE localhost:5000/IMAGE:TAG           # tag for local registry
docker push localhost:5000/IMAGE:TAG                # push to local registry
curl localhost:5000/v2/_catalog                     # list repositories
```

---

## 📚 References & Further Reading

| Resource | Link |
|---------|------|
| Docker Hub | https://hub.docker.com |
| Docker Hub Docs | https://docs.docker.com/docker-hub/ |
| GitHub Container Registry Docs | https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry |
| GitLab Container Registry | https://docs.gitlab.com/ee/user/packages/container_registry/ |
| Deploy a Registry Server (Official) | https://docs.docker.com/registry/deploying/ |
| Docker Scout (Image Scanning) | https://docs.docker.com/scout/ |

---

## ⏭️ What's Next — Day 6 Preview

On Day 6, you'll learn about **Docker Compose**:
- Why managing multiple containers manually doesn't scale
- Writing a `docker-compose.yml` to define an entire application stack
- Running a web app + database + cache with a **single command**
- Managing logs, environment variables, volumes, and networking between services

---

*Your images are now on the internet and ready to deploy anywhere. That's real DevOps! 🚀*