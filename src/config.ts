import dotenv from "dotenv";

const envFilePath = process.env.ENV_FILE_PATH?.trim();
dotenv.config(envFilePath ? { path: envFilePath } : {});

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string): string | undefined {
  return process.env[name]?.trim();
}

export interface MeterConfig {
  meterId: string;
  localApiUrlBase: string;
  archiveName: string;
}

export const config = {
  shipName: required("SHIP_NAME"),
  remoteApiUrl: required("REMOTE_API_URL"),
  remoteApiUrlBatch: required("REMOTE_API_URL_BATCH"),
  remoteApiToken: required("REMOTE_API_TOKEN"),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 900000), // 15 minutes
  batchSize: Number(process.env.BATCH_SIZE ?? 100),
  maxRetries: Number(process.env.MAX_RETRIES ?? 3),
  retryDelaySeconds: Number(process.env.RETRY_DELAY_SECONDS ?? 10),
  timeoutSecondsLocal: Number(process.env.TIMEOUT_SECONDS_LOCAL ?? 30),
  timeoutSecondsRemote: Number(process.env.TIMEOUT_SECONDS_REMOTE ?? 300),
  // Report Poller Configuration (optional)
  reportTicketApiUrl: optional("REPORT_TICKET_API_URL") || "",
  reportFilter: optional("REPORT_FILTER") || "*Mass*",
};

// Load meter configurations (up to 3 meters)
export function getMeters(): MeterConfig[] {
  const meters: MeterConfig[] = [];
  
  for (let i = 1; i <= 3; i++) {
    const meterId = optional(`METER_${i}_ID`);
    const localApiUrl = optional(`METER_${i}_LOCAL_API_URL`);
    const archiveName = optional(`METER_${i}_ARCHIVE_NAME`);
    
    // All three fields must be present for a meter to be valid
    if (meterId && localApiUrl && archiveName) {
      meters.push({
        meterId,
        localApiUrlBase: localApiUrl,
        archiveName,
      });
    }
  }
  
  if (meters.length === 0) {
    throw new Error("At least one meter must be configured (METER_1_ID, METER_1_LOCAL_API_URL, METER_1_ARCHIVE_NAME)");
  }
  
  return meters;
}

export function buildLocalSnapshotsUrl(meter: MeterConfig): string {
  // Example: http://host/snapshots?archive=ARCHIVE&ascending=0
  const base = meter.localApiUrlBase.replace(/\/$/, "");
  return `${base}/snapshots?archive=${encodeURIComponent(meter.archiveName)}&ascending=0`;
}
