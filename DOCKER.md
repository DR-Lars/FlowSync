# Docker Setup for FlowSync

## Overview

FlowSync is now fully containerized and can be deployed using Docker. Container images are automatically built and published to GitHub Container Registry (GHCR) on each release.

## What Changed

The deployment has been modernized to use Docker containers instead of manual Node.js installation:

- **Removed**: Node.js installation, npm dependency management, systemd service setup
- **Added**: Docker image building, container orchestration with docker-compose, GitHub Actions CI/CD

## Files Added

### Dockerfile
Multi-stage Docker build file that:
- Builds the TypeScript application in a builder stage
- Runs the application in a minimal Alpine Linux runtime
- Includes health checks
- Uses a non-root user for security
- Implements proper signal handling with dumb-init

### docker-compose.yml
Orchestration file that:
- Defines the FlowSync service configuration
- Maps environment variables from .env
- Sets up health checks
- Configures logging
- Handles port mapping

### .github/workflows/build-and-push.yml
GitHub Actions workflow that:
- Automatically builds Docker images on push to main
- Tags releases with semantic versioning
- Pushes images to GHCR
- Caches layers for faster builds

### .dockerignore
Optimizes Docker build by excluding unnecessary files

## Quick Start

### 1. Prepare Your System

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Set Up Configuration

```bash
# Create directory
mkdir -p ~/flowsync
cd ~/flowsync

# Get files
wget https://raw.githubusercontent.com/your-username/flowsync/main/docker-compose.yml
wget https://raw.githubusercontent.com/your-username/flowsync/main/.env.example
cp .env.example .env

# Edit configuration
nano .env
```

### 3. Start the Service

```bash
docker-compose up -d
```

### 4. Verify

```bash
docker-compose logs -f
curl http://localhost:3000/health
```

## Common Commands

```bash
# Start service
docker-compose up -d

# Stop service
docker-compose down

# View logs
docker-compose logs -f

# Restart service
docker-compose restart

# Check status
docker-compose ps

# Update to latest image
docker-compose pull && docker-compose up -d
```

## Building Your Own Image

### Local Build

```bash
docker build -t flowsync:latest .
docker run -d -p 3000:3000 --env-file .env flowsync:latest
```

### Push to GHCR

```bash
# Tag image
docker tag flowsync:latest ghcr.io/your-username/flowsync:latest

# Login to GHCR
cat ~/GH_TOKEN.txt | docker login ghcr.io -u your-username --password-stdin

# Push
docker push ghcr.io/your-username/flowsync:latest
```

## Image Details

- **Base Image**: node:18-alpine (minimal, secure)
- **Size**: ~200MB (optimized with multi-stage build)
- **Architecture**: Supports linux/amd64, linux/arm64, linux/arm/v7 (Raspberry Pi)
- **Health Check**: Built-in HTTP health check
- **User**: Non-root nodejs user for security
- **Logging**: Structured JSON logging with Pino

## Environment Variables

All configuration is passed via environment variables (see `.env.example` for full list):

**Required:**
- `SHIP_NAME`
- `REMOTE_API_URL`
- `REMOTE_API_URL_BATCH`
- `REMOTE_API_TOKEN`
- `METER_1_ID`
- `METER_1_LOCAL_API_URL`
- `METER_1_ARCHIVE_NAME`

**Optional:**
- `METER_2_*` and `METER_3_*` (up to 3 meters total)
- `PORT`, `POLL_INTERVAL_MS`, `BATCH_SIZE`, etc.

## Troubleshooting

### Image not found
```bash
docker-compose pull
docker-compose pull --no-parallel
```

### Container won't start
```bash
docker-compose logs
cat .env  # Check configuration
```

### Port already in use
Edit `.env` and change `PORT=3000` to another port

### Permission denied
```bash
sudo usermod -aG docker $USER
newgrp docker
```

## Advanced Topics

### Multi-Architecture Builds

The GitHub Actions workflow automatically builds for:
- linux/amd64 (Intel/AMD)
- linux/arm64 (64-bit ARM)
- linux/arm/v7 (32-bit ARM for Raspberry Pi Zero/1A)

### Custom Builds with BuildKit

```bash
DOCKER_BUILDKIT=1 docker build -t flowsync:latest .
```

### Size Optimization

The multi-stage build reduces image size significantly:
- Builder stage: Full build tools (~1GB)
- Runtime stage: Only production files (~200MB)

## Migration from systemd

If upgrading from the systemd-based deployment:

```bash
# Stop old service
sudo systemctl stop flowsync
sudo systemctl disable flowsync
sudo rm /etc/systemd/system/flowsync.service

# Start Docker service
mkdir -p ~/flowsync
cd ~/flowsync
cp /path/to/.env .  # Copy old .env
docker-compose up -d
```

## Security Considerations

- Non-root user (nodejs) runs the container
- Read-only filesystem recommended for production
- Environment variables for sensitive data
- Health checks for automatic failure detection
- Log rotation via docker-compose configuration

## More Information

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guide
