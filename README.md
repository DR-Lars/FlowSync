# FlowSync (Fastify)

A lightweight Fastify + TypeScript service for Raspberry Pi/Windows that:

- Polls local APIs every **15 minutes** (snapshots) and sends batches to a remote cloud API.
- Features retries, timestamp normalization, and structured logging.

## Features

- Fastify server with `/health` and `/trigger` endpoints
- **15-minute interval polling** for snapshot batches (configurable via `POLL_INTERVAL_MS`)
- Local paging and batch detection (latest + previous)
- Timestamp normalization
- Remote batch existence check; skip identical counts
- Structured logs via Fastify (pino)

## Setup

### Local Development

1. Install Node.js (>= 18 recommended) and pnpm
2. Create `.env` from `.env.example` and fill values
3. Install dependencies and run:

```bash
pnpm install
pnpm run dev
# or
pnpm run build && pnpm start
```

### Docker Deployment (Recommended)

FlowSync supports multi-architecture Docker deployment for Raspberry Pi, x86, and cloud servers.

**Quick Start:**

```bash
# Clone and configure
git clone https://github.com/DR-Lars/FlowSync.git
cd FlowSync
cp .env.example .env
nano .env  # Edit configuration

# Deploy with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

**Features:**
- Runs on x86, ARM64, and ARM32 (Raspberry Pi Zero/1/2/3/4/5)
- Automatic health checks
- Easy scaling
- Log rotation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Docker deployment guide.

### Manual Deployment

If you prefer not to use Docker, see [DEPLOYMENT.md](./DEPLOYMENT.md) for manual setup instructions.

## Environment

See `.env.example` for required and optional variables.

- **POLL_INTERVAL_MS**: Snapshots polling interval (default: 900000 = 15 min)

## Endpoints

- `GET /health` → quick status
- `GET /trigger` → manual snapshot poll trigger
- `GET /admin` → web-based configuration editor (requires auth)

### Web Configuration Editor

FlowSync includes a built-in web interface for editing configuration:

1. Access `http://your-raspberry-pi:3000/admin` in your browser
2. Login with credentials from `.env`:
   - Username: `ADMIN_USER` (default: admin)
   - Password: `ADMIN_PASSWORD` (default: changeme)
3. Edit configuration values through the web UI
4. Save changes and restart the service

**Security Note:** Change the default admin credentials in your `.env` file!

## Modbus (future)

- For Modbus RTU/TCP, add `modbus-serial` and wire a reader in `src/poller.ts` before normalization.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

This project uses **Conventional Commits** and **automatic semantic versioning**. See [CONTRIBUTING.md](./CONTRIBUTING.md) for commit format guidelines that enable automatic version bumping and release generation.

## Notes

- Uses `undici` for HTTP; timeouts are enforced.
- No local disk buffer yet; add SQLite if offline persistence is required.
