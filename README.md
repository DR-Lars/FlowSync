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

1. Install Node.js (>= 18 recommended).
2. Create `.env` from `.env.example` and fill values.
3. Install deps and run:

```bash
npm install
npm run dev
# or
npm run build && npm start
```

### Raspberry Pi Deployment

#### Automated Deployment

The easiest way to deploy FlowSync to a Raspberry Pi is using the deployment script:

1. Copy the project to your Raspberry Pi:

   ```bash
   # On your development machine
   scp -r . pi@raspberrypi.local:~/flowsync-source
   ```

2. SSH into your Raspberry Pi:

   ```bash
   ssh pi@raspberrypi.local
   ```

3. Run the deployment script:

   ```bash
   cd ~/flowsync-source
   chmod +x deploy.sh
   ./deploy.sh
   ```

4. Configure your environment:

   ```bash
   nano ~/flowsync/.env
   # Edit with your actual values
   ```

5. Start the service:
   ```bash
   sudo systemctl start flowsync
   sudo systemctl status flowsync
   ```

The deployment script will:

- Install Node.js 18 if not present
- Install build dependencies
- Copy files to `~/flowsync`
- Install npm dependencies
- Build the TypeScript project
- Create and enable a systemd service for auto-start on boot

#### Manual Deployment

If you prefer manual deployment:

1. Install Node.js on Raspberry Pi:

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs build-essential
   ```

2. Copy project files to Raspberry Pi (excluding node_modules and dist)

3. Build the project:

   ```bash
   cd ~/flowsync
   npm install
   npm run build
   ```

4. Create `.env` from `.env.example` and configure

5. Set up systemd service:
   ```bash
   sudo cp flowsync.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable flowsync
   sudo systemctl start flowsync
   ```

#### Service Management

```bash
# Start service
sudo systemctl start flowsync

# Stop service
sudo systemctl stop flowsync

# Restart service
sudo systemctl restart flowsync

# Check status
sudo systemctl status flowsync

# View logs (live)
sudo journalctl -u flowsync -f

# View recent logs
sudo journalctl -u flowsync -n 100
```

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

## Notes

- Uses `undici` for HTTP; timeouts are enforced.
- No local disk buffer yet; add SQLite if offline persistence is required.
