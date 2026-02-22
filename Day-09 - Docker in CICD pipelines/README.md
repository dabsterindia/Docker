# 🐳 Day 9 — Docker in CI/CD Pipelines

> **Goal for today:** Automate your entire Docker workflow — building, testing, and pushing images automatically on every `git push` using GitHub Actions. By the end, your code goes from laptop to Docker Hub to production without a single manual command.

---

## 🧠 The Problem: Manual Deployments Don't Scale

So far in this series, every build and push has been manual:

```bash
# What you do TODAY (manual):
docker build -t myapp .
docker tag myapp yourusername/myapp:v1.0
docker push yourusername/myapp:v1.0
# SSH into server...
# docker pull...
# docker run...
# Hope nothing broke 🤞
```

This works for one developer, one app, once. But in real teams:

```
❌ "Works on my machine" — builds succeed locally, fail in production
❌ Forgot to run tests before pushing
❌ Pushed broken code to the wrong environment
❌ No record of who deployed what and when
❌ Manual steps get skipped under pressure
```

**CI/CD solves all of this.** Every code push automatically triggers a pipeline that builds, tests, and (if tests pass) deploys your image.

---

## 📖 Core Concepts

### What is CI/CD?

```
CI — Continuous Integration          CD — Continuous Delivery/Deployment
─────────────────────────────────    ──────────────────────────────────────
Automatically:                       Automatically:
  • Build code on every push           • Push tested image to registry
  • Run tests                          • Deploy to staging/production
  • Report pass/fail                   • Tag with environment labels
  • Build Docker image                 • Notify team of deployment
```

### The Full Pipeline Flow

```
Developer pushes code
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                    GitHub Actions Pipeline                     │
│                                                               │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│  │ Checkout │──▶│  Build   │──▶│   Test   │──▶│   Push   │  │
│  │   Code   │   │  Image   │   │  in      │   │  Image   │  │
│  │          │   │          │   │Container │   │to Docker │  │
│  └──────────┘   └──────────┘   └──────────┘   │   Hub    │  │
│                                                └────┬─────┘  │
└─────────────────────────────────────────────────────┼────────┘
                                                       │
                                          ┌────────────▼────────────┐
                                          │  Tagged & versioned      │
                                          │  image available for     │
                                          │  deployment anywhere     │
                                          └─────────────────────────┘
```

### Environment Tagging Strategy

```
git push origin feature/login    →  image:sha-abc1234   (commit SHA)
git push origin main             →  image:dev           (latest on main)
git tag v1.2.0                   →  image:v1.2.0        (release)
                                    image:latest        (always newest release)
```

---

## 🔧 GitHub Actions — Key Concepts

GitHub Actions is the CI/CD platform built directly into GitHub. It's free for public repos and has a generous free tier for private repos.

| Term | Meaning |
|------|---------|
| **Workflow** | A complete automation pipeline defined in a `.yml` file |
| **Trigger** | The event that starts the pipeline (`push`, `pull_request`, `release`) |
| **Job** | A group of steps that run on the same machine |
| **Step** | A single task — run a command or use a pre-built Action |
| **Action** | A reusable plugin from the GitHub Marketplace |
| **Runner** | The virtual machine that executes your jobs (GitHub provides Ubuntu, Windows, macOS) |
| **Secret** | An encrypted environment variable stored in GitHub, never visible in logs |

### Workflow File Location

```
your-repo/
└── .github/
    └── workflows/
        ├── docker-build.yml        ← runs on every push
        ├── docker-release.yml      ← runs on version tags
        └── docker-test.yml         ← runs on pull requests
```

---

## 🔑 Step 1 — Set Up GitHub Secrets

Before writing any workflow, store your Docker Hub credentials as GitHub Secrets so they're never exposed in your code.

```
GitHub Repository
  → Settings
    → Secrets and variables
      → Actions
        → New repository secret
```

Add these two secrets:

| Secret Name | Value |
|-------------|-------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | A Docker Hub Access Token (not your password!) |

**How to create a Docker Hub Access Token:**
```
Docker Hub → Account Settings → Security → New Access Token
Name: "github-actions"
Permissions: Read & Write
→ Copy the token → paste as DOCKERHUB_TOKEN secret in GitHub
```

> 🔒 **Why a token and not your password?** Access tokens can be scoped (read-only vs read/write) and revoked individually without changing your password. If a token is ever leaked, you revoke just that token.

---

## 🚀 Workflow 1 — Basic Build & Push on Every Push

The simplest production-ready pipeline. Every push to `main` builds and pushes the image.

**File:** `.github/workflows/docker-build.yml`

```yaml
name: 🐳 Build and Push Docker Image

# ─── Triggers ──────────────────────────────────────────────────
on:
  push:
    branches:
      - main          # run on every push to main
  pull_request:
    branches:
      - main          # also run on PRs (build only, no push)

# ─── Jobs ──────────────────────────────────────────────────────
jobs:
  build-and-push:
    name: Build & Push to Docker Hub
    runs-on: ubuntu-latest        # GitHub-hosted Ubuntu runner

    steps:

      # Step 1: Check out your repository code
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      # Step 2: Log in to Docker Hub using stored secrets
      - name: 🔑 Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      # Step 3: Build the Docker image
      - name: 🔨 Build Docker image
        run: |
          docker build -t ${{ secrets.DOCKERHUB_USERNAME }}/myapp:latest .

      # Step 4: Push to Docker Hub (only on push to main, not PRs)
      - name: 📤 Push to Docker Hub
        if: github.event_name == 'push'   # skip push on pull_request events
        run: |
          docker push ${{ secrets.DOCKERHUB_USERNAME }}/myapp:latest
```

**What happens:**
- PR opened → builds image, verifies it compiles — does NOT push
- Code merged to `main` → builds AND pushes `myapp:latest`

---

## 🏷️ Workflow 2 — Smart Tagging (dev / staging / prod)

A more sophisticated pipeline that tags images differently based on which branch or tag triggered the build.

**File:** `.github/workflows/docker-smart-tags.yml`

```yaml
name: 🐳 Build, Tag, and Push

on:
  push:
    branches:
      - main          # → tags as :dev
      - staging       # → tags as :staging
    tags:
      - 'v*.*.*'      # → tags as :v1.2.3 and :latest  (e.g. git tag v1.2.3)

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      # ── Docker Buildx: enables multi-platform builds (arm64 + amd64) ──
      - name: 🔧 Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: 🔑 Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      # ── Automatically generate smart tags based on trigger ──────────
      # This action figures out what tags to use based on branch/tag name
      - name: 🏷️  Generate image tags and labels
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ secrets.DOCKERHUB_USERNAME }}/myapp
          tags: |
            # On push to 'main' branch → tag as :dev
            type=raw,value=dev,enable=${{ github.ref == 'refs/heads/main' }}

            # On push to 'staging' branch → tag as :staging
            type=raw,value=staging,enable=${{ github.ref == 'refs/heads/staging' }}

            # On version tag (v1.2.3) → tag as :v1.2.3
            type=semver,pattern={{version}}

            # On version tag → also tag as :latest
            type=raw,value=latest,enable=${{ startsWith(github.ref, 'refs/tags/v') }}

            # Always add the short commit SHA as a tag (e.g. :sha-abc1234)
            type=sha,prefix=sha-,format=short

      # ── Build and push with all generated tags ──────────────────────
      - name: 🚀 Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name == 'push' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          # Cache layers between builds for speed (uses GitHub Actions cache)
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

**Tag output examples:**

| What you do | Image tags created |
|-------------|-------------------|
| `git push origin main` | `:dev`, `:sha-abc1234` |
| `git push origin staging` | `:staging`, `:sha-abc1234` |
| `git tag v1.2.0 && git push --tags` | `:v1.2.0`, `:latest`, `:sha-abc1234` |

---

## 🧪 Workflow 3 — Build, Test Inside Container, Then Push

The most important pipeline pattern — **run your tests inside a Docker container** before pushing. If tests fail, the image is never pushed.

**File:** `.github/workflows/docker-test-and-push.yml`

```yaml
name: 🐳 Test, Build, and Push

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:

  # ────────────────────────────────────────────────────────────
  # JOB 1: Run tests inside a Docker container
  # ────────────────────────────────────────────────────────────
  test:
    name: 🧪 Run Tests in Container
    runs-on: ubuntu-latest

    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      # Build a test-specific image (with dev dependencies included)
      - name: 🔨 Build test image
        run: docker build --target test -t myapp-test .

      # Run the test suite inside the container
      - name: 🧪 Run tests
        run: |
          docker run --rm \
            -e NODE_ENV=test \
            myapp-test \
            npm test
          # If tests fail (non-zero exit code), this step fails
          # and the entire pipeline stops → image never gets pushed

  # ────────────────────────────────────────────────────────────
  # JOB 2: Build and push (only runs if tests passed)
  # ────────────────────────────────────────────────────────────
  build-and-push:
    name: 🚀 Build and Push
    runs-on: ubuntu-latest
    needs: test                  # ← ONLY runs if the 'test' job passed!
    if: github.event_name == 'push'

    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 🔧 Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: 🔑 Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: 🏷️  Generate tags
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ secrets.DOCKERHUB_USERNAME }}/myapp
          tags: |
            type=raw,value=dev
            type=sha,prefix=sha-,format=short

      - name: 🚀 Build and push production image
        uses: docker/build-push-action@v5
        with:
          context: .
          target: production     # multi-stage: build the production stage only
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

**The multi-stage Dockerfile that supports this:**

```dockerfile
# ─── Stage 1: Base (shared by all stages) ─────────────────────
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ─── Stage 2: Test (includes dev dependencies) ────────────────
FROM base AS test
# Install dev dependencies (jest, supertest, etc.)
RUN npm ci --include=dev
COPY . .
# The test command is run by the CI pipeline, not by CMD
CMD ["npm", "test"]

# ─── Stage 3: Production (lean, no test deps) ─────────────────
FROM base AS production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

**Pipeline flow:**

```
git push to main
      │
      ▼
┌─────────────┐        ┌──────────────────────┐
│  JOB: test  │──fail──▶  ✗ Pipeline stops     │
│             │        │  Image NOT pushed     │
│  npm test   │        └──────────────────────┘
│  in Docker  │
└──────┬──────┘
       │ pass
       ▼
┌──────────────────┐
│  JOB: push       │
│                  │
│  Build :dev      │
│  Push to Hub     │
│                  │
└──────────────────┘
```

---

## 🌍 Workflow 4 — Push to GHCR (GitHub Container Registry)

If you prefer GHCR over Docker Hub (no rate limits, free private repos), here's the workflow. No secrets needed for public repos — the `GITHUB_TOKEN` is automatically available.

**File:** `.github/workflows/docker-ghcr.yml`

```yaml
name: 🐳 Publish to GHCR

on:
  push:
    branches: [ main ]
  release:
    types: [ published ]       # triggers when you create a GitHub Release

env:
  REGISTRY: ghcr.io
  # github.repository = "yourusername/your-repo-name"
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    # Required permissions for pushing to GHCR
    permissions:
      contents: read
      packages: write            # allows pushing to GHCR

    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 🔧 Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      # Log in to GHCR using the automatic GITHUB_TOKEN (no setup needed!)
      - name: 🔑 Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}    # auto-provided, no setup!

      - name: 🏷️  Generate tags and labels
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=dev,enable=${{ github.ref == 'refs/heads/main' }}
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=sha-,format=short

      - name: 🚀 Build and push to GHCR
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # Print the image digest for traceability
      - name: 🔍 Print image digest
        run: echo "Image pushed with digest ${{ steps.meta.outputs.digest }}"
```

**The image will be available at:**
```
ghcr.io/yourusername/your-repo-name:dev
ghcr.io/yourusername/your-repo-name:sha-abc1234
```

---

## 🏗️ Full Project: Node.js API with Complete CI/CD Pipeline

Let's put everything together with a real project that has a working test suite.

### Project Structure

```
node-cicd-demo/
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├── src/
│   └── app.js
├── tests/
│   └── app.test.js
├── package.json
├── Dockerfile
├── .dockerignore
└── README.md
```

### `src/app.js`

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// In-memory store (would be a DB in production)
let items = [];
let nextId = 1;

app.get('/', (req, res) => {
  res.json({
    message: '🐳 Node.js API with CI/CD',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/items', (req, res) => {
  res.json({ items, count: items.length });
});

app.post('/items', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }
  const item = { id: nextId++, name, createdAt: new Date() };
  items.push(item);
  res.status(201).json(item);
});

app.get('/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

app.delete('/items/:id', (req, res) => {
  const index = items.findIndex(i => i.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Item not found' });
  items.splice(index, 1);
  res.json({ message: 'Item deleted' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

module.exports = app;

if (require.main === module) {
  app.listen(3000, () => console.log('🌐 API running on port 3000'));
}
```

### `tests/app.test.js`

```javascript
const request = require('supertest');
const app = require('../src/app');

describe('API Health Check', () => {
  test('GET / returns service info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('CI/CD');
  });

  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Items CRUD', () => {
  test('GET /items returns empty list initially', async () => {
    const res = await request(app).get('/items');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  test('POST /items creates a new item', async () => {
    const res = await request(app)
      .post('/items')
      .send({ name: 'Test Item' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Item');
    expect(res.body.id).toBeDefined();
  });

  test('POST /items returns 400 when name missing', async () => {
    const res = await request(app)
      .post('/items')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('name is required');
  });

  test('GET /items/:id returns the item', async () => {
    // Create an item first
    const created = await request(app)
      .post('/items')
      .send({ name: 'Find Me' });
    const id = created.body.id;

    const res = await request(app).get(`/items/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Find Me');
  });

  test('GET /items/:id returns 404 for missing item', async () => {
    const res = await request(app).get('/items/99999');
    expect(res.status).toBe(404);
  });

  test('DELETE /items/:id removes the item', async () => {
    const created = await request(app)
      .post('/items')
      .send({ name: 'Delete Me' });
    const id = created.body.id;

    const del = await request(app).delete(`/items/${id}`);
    expect(del.status).toBe(200);

    const find = await request(app).get(`/items/${id}`);
    expect(find.status).toBe(404);
  });
});
```

### `package.json`

```json
{
  "name": "node-cicd-demo",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/app.js",
    "test": "jest --forceExit --detectOpenHandles"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "jest": "^29.6.0",
    "supertest": "^6.3.3"
  }
}
```

### `Dockerfile` (Multi-Stage: test + production)

```dockerfile
# ─── Stage 1: Base ────────────────────────────────────────────
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

# ─── Stage 2: Test (includes dev deps) ────────────────────────
FROM base AS test
RUN npm ci                         # installs ALL deps (including devDeps)
COPY . .
CMD ["npm", "test"]

# ─── Stage 3: Production (lean) ───────────────────────────────
FROM base AS production
RUN npm ci --omit=dev              # installs ONLY production deps
COPY src/ ./src/
EXPOSE 3000
CMD ["node", "src/app.js"]
```

### `.github/workflows/ci-cd.yml` — The Complete Pipeline

```yaml
name: 🐳 CI/CD Pipeline

on:
  push:
    branches: [ main, staging ]
    tags: [ 'v*.*.*' ]
  pull_request:
    branches: [ main ]

env:
  IMAGE_NAME: ${{ secrets.DOCKERHUB_USERNAME }}/node-cicd-demo

jobs:

  # ──────────────────────────────────────────────────────────
  # JOB 1: Lint and Test
  # ──────────────────────────────────────────────────────────
  test:
    name: 🧪 Test
    runs-on: ubuntu-latest

    steps:
      - name: 📥 Checkout
        uses: actions/checkout@v4

      - name: 🔨 Build test image
        run: docker build --target test -t ${{ env.IMAGE_NAME }}:test .

      - name: 🧪 Run test suite in container
        run: |
          docker run --rm \
            --name cicd-tests \
            -e NODE_ENV=test \
            ${{ env.IMAGE_NAME }}:test

      - name: 🧹 Clean up test image
        if: always()      # runs even if tests fail — clean up regardless
        run: docker rmi ${{ env.IMAGE_NAME }}:test || true

  # ──────────────────────────────────────────────────────────
  # JOB 2: Build and Push (only after tests pass, only on push)
  # ──────────────────────────────────────────────────────────
  build-push:
    name: 🚀 Build & Push
    runs-on: ubuntu-latest
    needs: test                                    # depends on test job
    if: github.event_name == 'push'               # skip on pull_request

    steps:
      - name: 📥 Checkout
        uses: actions/checkout@v4

      - name: 🔧 Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: 🔑 Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      # ── Smart tagging based on trigger type ──────────────────
      - name: 🏷️  Generate tags
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.IMAGE_NAME }}
          tags: |
            # main branch → :dev
            type=raw,value=dev,enable=${{ github.ref == 'refs/heads/main' }}
            # staging branch → :staging
            type=raw,value=staging,enable=${{ github.ref == 'refs/heads/staging' }}
            # version tag v1.2.3 → :v1.2.3 and :latest
            type=semver,pattern={{version}}
            type=raw,value=latest,enable=${{ startsWith(github.ref, 'refs/tags/') }}
            # Always add short SHA for traceability
            type=sha,prefix=sha-,format=short

      - name: 🚀 Build and push production image
        uses: docker/build-push-action@v5
        with:
          context: .
          target: production         # only build the production stage
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha       # GitHub Actions layer cache
          cache-to: type=gha,mode=max

      # ── Print summary to the Actions UI ──────────────────────
      - name: 📋 Pipeline Summary
        run: |
          echo "## 🐳 Docker Image Published" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Image:** \`${{ env.IMAGE_NAME }}\`" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Tags:**" >> $GITHUB_STEP_SUMMARY
          echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
          echo "${{ steps.meta.outputs.tags }}" >> $GITHUB_STEP_SUMMARY
          echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Triggered by:** \`${{ github.event_name }}\` on \`${{ github.ref_name }}\`" >> $GITHUB_STEP_SUMMARY

  # ──────────────────────────────────────────────────────────
  # JOB 3: Security scan (runs in parallel with build-push)
  # ──────────────────────────────────────────────────────────
  security-scan:
    name: 🔒 Security Scan
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - name: 📥 Checkout
        uses: actions/checkout@v4

      - name: 🔨 Build image for scanning
        run: docker build --target production -t myapp-scan .

      # Trivy scans for known CVEs in your image's packages
      - name: 🔍 Scan with Trivy (vulnerability scanner)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp-scan
          format: table
          exit-code: 0              # set to '1' to FAIL pipeline on HIGH vulns
          ignore-unfixed: true
          severity: CRITICAL,HIGH
```

### `.dockerignore`

```
node_modules/
.git/
.github/
*.log
.env
tests/
README.md
```

---

## 🧪 Running It Locally First

Before pushing to GitHub, verify everything works locally:

```bash
# 1. Build the test image
docker build --target test -t myapp:test .

# 2. Run tests in container (exactly as CI will)
docker run --rm -e NODE_ENV=test myapp:test
# All tests should pass ✅

# 3. Build the production image
docker build --target production -t myapp:prod .

# 4. Run the production container
docker run -d -p 3000:3000 --name myapp myapp:prod

# 5. Verify it works
curl http://localhost:3000
curl http://localhost:3000/health
curl http://localhost:3000/items
curl -X POST http://localhost:3000/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Docker CI/CD"}'

# 6. Clean up
docker rm -f myapp
```

---

## 📊 Setting Up the Full Pipeline — Step by Step

```bash
# Step 1: Create a GitHub repository and push your code
git init
git add .
git commit -m "feat: initial Node.js API with Docker CI/CD"
git remote add origin https://github.com/yourusername/node-cicd-demo.git
git push -u origin main

# Step 2: Add secrets in GitHub
# → Settings → Secrets → Actions
# DOCKERHUB_USERNAME = yourusername
# DOCKERHUB_TOKEN    = dckr_pat_xxxx...

# Step 3: Watch the pipeline run
# → Actions tab in GitHub → click the workflow run
# You'll see each job and step in real time

# Step 4: After it passes, pull your published image
docker pull yourusername/node-cicd-demo:dev
docker run -p 3000:3000 yourusername/node-cicd-demo:dev
```

---

## 🔁 The Full Developer Workflow

Once set up, your daily workflow looks like this:

```
┌─────────────────────────────────────────────────────────────────┐
│                    YOUR DAILY WORKFLOW                           │
│                                                                  │
│  1. Write code locally                                           │
│  2. git push origin main                                         │
│                                                                  │
│  GitHub Actions automatically:                                   │
│  ┌──────────────────────────────────────────────────────┐        │
│  │ ✅ Runs tests in Docker container                    │        │
│  │ ✅ Builds production image (multi-stage)             │        │
│  │ ✅ Tags with :dev and :sha-abc1234                   │        │
│  │ ✅ Pushes to Docker Hub                              │        │
│  │ ✅ Scans for security vulnerabilities                │        │
│  │ ✅ Posts summary to Actions UI                       │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                  │
│  3. git tag v1.0.0 && git push --tags                           │
│     → image tagged :v1.0.0 and :latest pushed automatically     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Best Practices for CI/CD

```
✅  DO                                    ❌  AVOID
──────────────────────────────────────    ──────────────────────────────────────
Use Access Tokens, not passwords          Storing passwords in workflow files
Rotate tokens regularly                   Committing .env files to the repo
Use read-only tokens where possible       Using :latest tag in prod deployments
Scan images for CVEs (Trivy)              Skipping tests to "speed up" deploys
Pin action versions (actions/checkout@v4) Using @main — can change unexpectedly
Use GITHUB_TOKEN for GHCR                 Giving workflow broader perms than needed
Store ALL secrets in GitHub Secrets       Hardcoding credentials in any file
```

---

## 🔧 Quick Reference Cheat Sheet

```bash
# Local testing (simulate CI)
docker build --target test -t myapp:test .
docker run --rm -e NODE_ENV=test myapp:test

# Manual tag and push (when not using CI)
docker build --target production -t yourusername/myapp:v1.0.0 .
docker push yourusername/myapp:v1.0.0

# Trigger different pipeline paths
git push origin main                    # → :dev tag
git push origin staging                 # → :staging tag
git tag v1.2.0 && git push --tags       # → :v1.2.0 + :latest

# Check your published image
docker pull yourusername/myapp:dev
docker inspect yourusername/myapp:dev   # see labels, digest, layers

# Verify pipeline status via GitHub CLI (optional)
gh run list
gh run watch
```

---

## 📋 Environment Tag Strategy Summary

```
Branch / Trigger          Image Tag               Use Case
──────────────────────    ─────────────────────   ──────────────────────────────
push to main              :dev                    Auto-deploy to dev environment
push to staging           :staging                QA testing environment
git tag v1.2.3            :v1.2.3  :latest        Production release
Any push                  :sha-abc1234            Full traceability, rollbacks
Pull Request              (build only, no push)   Verify PR doesn't break build
```

---

## 📚 References & Further Reading

| Resource | Link |
|---------|------|
| GitHub Actions Official Docs | https://docs.github.com/en/actions |
| docker/build-push-action | https://github.com/docker/build-push-action |
| docker/metadata-action | https://github.com/docker/metadata-action |
| docker/login-action | https://github.com/docker/login-action |
| Trivy Vulnerability Scanner | https://github.com/aquasecurity/trivy-action |
| GitHub Container Registry | https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry |
| Awesome GitHub Actions | https://github.com/sdras/awesome-actions |

---

*Your code now ships itself. From `git push` to Docker Hub — fully automated, tested, and versioned. That's production-grade DevOps. 🚀*