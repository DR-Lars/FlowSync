import { config, buildLocalSnapshotsUrl, MeterConfig } from "./config";
import { fetch } from "undici";

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function withTimeout<T>(p: Promise<T>, seconds: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), seconds * 1000);
  return p.finally(() => clearTimeout(timer));
}

function normalizeBatch(v: unknown): string {
  const num = Number(v);
  return String(Number.isFinite(num) ? Math.trunc(num) : 0);
}

function fmt(ts: string | number | Date): string | null {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const HH = String(d.getHours()).padStart(2, "0");
  const MM = String(d.getMinutes()).padStart(2, "0");
  const SS = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`;
}

type AnyObj = Record<string, any>;

async function getJson(url: string, headers: AnyObj, timeoutSec: number) {
  const res = await withTimeout(
    fetch(url, {
      method: "GET",
      headers,
      signal: new AbortController().signal,
    }),
    timeoutSec,
  );
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  return res.json();
}

async function postJson(
  url: string,
  headers: AnyObj,
  body: any,
  timeoutSec: number,
) {
  const res = await withTimeout(
    fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
    timeoutSec,
  );
  if (!res.ok)
    throw new Error(`POST ${url} -> ${res.status} ${res.statusText}`);
  return res.json().catch(() => null);
}

function asArray(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (x == null) return [];
  return [x];
}

export class Poller {
  private localHeaders = { "Content-Type": "application/json" };
  private remoteHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.remoteApiToken}`,
  };
  private meter: MeterConfig;

  constructor(meter: MeterConfig) {
    this.meter = meter;
  }

  async runWithRetries(log: (msg: string) => void) {
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        log(`INFO: [${this.meter.meterId}] Attempt ${attempt}/${config.maxRetries}`);
        await this.runOnce(log);
        return;
      } catch (err: any) {
        log(`ERROR: [${this.meter.meterId}] (attempt ${attempt}): ${err?.message ?? String(err)}`);
        if (attempt < config.maxRetries) {
          log(`INFO: [${this.meter.meterId}] Retrying in ${config.retryDelaySeconds} seconds...`);
          await delay(config.retryDelaySeconds * 1000);
        } else {
          log(`ERROR: [${this.meter.meterId}] Max retries exceeded`);
          throw err;
        }
      }
    }
  }

  async runOnce(log: (msg: string) => void) {
    const LocalApiUrl = buildLocalSnapshotsUrl(this.meter);
    const batchSize = config.batchSize;

    log(`INFO: [${this.meter.meterId}] Starting snapshot retrieval from ${LocalApiUrl}`);

    // Fetch first page to determine latest batch
    const firstPageUrl = `${LocalApiUrl}&count=${batchSize}`;
    log("INFO: Fetching first page to determine latest batch number...");
    const firstPageRaw = await getJson(
      firstPageUrl,
      this.localHeaders,
      config.timeoutSecondsLocal,
    );
    const firstPage = asArray(firstPageRaw);
    if (!firstPage.length) {
      throw new Error("No snapshots found in local API.");
    }

    const targetBatchRaw =
      firstPage[0]?.snapshot?.tags?.["LM_RUN1!RUN1_BATCH_NR_PRV"]?.v;
    const latestBatch = normalizeBatch(targetBatchRaw);
    const previousBatch = String(Number(latestBatch) - 1);
    log(
      `INFO: Latest batch number detected: ${targetBatchRaw} (normalized: ${latestBatch})`,
    );
    log(
      `INFO: Will collect current batch ${latestBatch} and previous batch ${previousBatch}`,
    );

    const batchSnapshots: Record<string, any[]> = {
      [latestBatch]: [],
      [previousBatch]: [],
    };

    log("INFO: Starting snapshot collection...");
    let lastUuid: string | null = null;
    let stopPaging = false;
    let pageCount = 0;

    while (!stopPaging) {
      const url = lastUuid
        ? `${LocalApiUrl}&iterator=${encodeURIComponent(lastUuid)}&count=${batchSize}`
        : `${LocalApiUrl}&count=${batchSize}`;
      log(`INFO: Fetching page ${pageCount + 1} with URL: ${url}`);
      const pageRaw = await getJson(
        url,
        this.localHeaders,
        config.timeoutSecondsLocal,
      );
      pageCount++;
      const page = asArray(pageRaw);
      if (!page.length) {
        log("INFO: No more snapshots retrieved, stopping.");
        break;
      }

      log(`INFO: Page ${pageCount} contains ${page.length} snapshots`);

      for (const snap of page) {
        const currentBatch =
          snap?.snapshot?.tags?.["LM_RUN1!RUN1_BATCH_NR_PRV"]?.v;
        const currentBatchNormalized = normalizeBatch(currentBatch);
        if (Number(currentBatchNormalized) < Number(previousBatch)) {
          log(
            `INFO: Reached batch ${currentBatchNormalized} which is before our target batches, stopping pagination.`,
          );
          stopPaging = true;
          break;
        }
        if (batchSnapshots[currentBatchNormalized]) {
          batchSnapshots[currentBatchNormalized].push(snap);
        }
      }

      if (stopPaging) {
        log("INFO: Stopping pagination.");
        break;
      }

      lastUuid = page[page.length - 1]?.uuid ?? null;
      if (page.length < batchSize) break; // no more full pages
    }

    for (const targetBatch of [latestBatch, previousBatch]) {
      const latestBatchSnapshots = batchSnapshots[targetBatch];
      log(`INFO: ===== Processing batch ${targetBatch} =====`);

      if (!latestBatchSnapshots?.length) {
        log(
          `WARNING: No snapshots found locally for batch ${targetBatch}, skipping.`,
        );
        continue;
      }

      const localCount = latestBatchSnapshots.length;
      log(
        `INFO: Found ${localCount} snapshots locally for batch ${targetBatch}`,
      );

      // Check remote count
      const separator = config.remoteApiUrl.includes("?") ? "&" : "?";
      const checkUrl = `${config.remoteApiUrl}${separator}meter_id=${encodeURIComponent(this.meter.meterId)}&ship_name=${encodeURIComponent(config.shipName)}&batch_number=${encodeURIComponent(targetBatch)}`;
      log(`INFO: [${this.meter.meterId}] Checking if batch ${targetBatch} already exists: ${checkUrl}`);

      let shouldSkip = false;
      try {
        const existingBatch: any = await getJson(
          checkUrl,
          this.remoteHeaders,
          config.timeoutSecondsLocal,
        );
        let remoteCount = 0;
        if (Array.isArray(existingBatch)) {
          remoteCount = existingBatch.length;
        } else if (existingBatch && Array.isArray(existingBatch.data)) {
          remoteCount = existingBatch.data.length;
        } else if (existingBatch) {
          remoteCount = 1;
        }
        if (remoteCount > 0) {
          if (remoteCount === localCount) {
            log(
              `WARNING: Batch ${targetBatch} already exists with same count (${remoteCount} snapshots), skipping upload.`,
            );
            shouldSkip = true;
          } else {
            log(
              `INFO: Batch ${targetBatch} exists remotely with ${remoteCount} snapshots but local has ${localCount}, proceeding with upload.`,
            );
          }
        } else {
          log(
            `INFO: Batch ${targetBatch} does not exist in remote API, proceeding with upload.`,
          );
        }
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        if (/404/.test(msg)) {
          log(
            `INFO: Batch ${targetBatch} not present (404), proceeding with upload.`,
          );
        } else {
          log(
            `WARNING: Batch check failed: ${msg}. Proceeding with upload anyway.`,
          );
        }
      }

      if (shouldSkip) continue;

      const filteredSnapshots: any[] = [];
      let skippedWithoutTimestamp = 0;
      for (const snap of latestBatchSnapshots) {
        if (!snap.timestamp && snap.snapshot?.ts)
          snap.timestamp = snap.snapshot.ts;
        if (!snap.timestamp) {
          skippedWithoutTimestamp++;
          continue;
        }
        const formatted = fmt(snap.timestamp);
        if (!formatted) {
          skippedWithoutTimestamp++;
          continue;
        }
        snap.timestamp = formatted;
        filteredSnapshots.push(snap);
      }

      if (skippedWithoutTimestamp > 0) {
        log(
          `INFO: Skipped ${skippedWithoutTimestamp} snapshots without valid timestamp`,
        );
      }

      if (!filteredSnapshots.length) {
        log(
          `ERROR: No snapshots with valid timestamp to send for batch ${targetBatch}.`,
        );
        continue;
      }

      const firstSnap = filteredSnapshots[0];
      log(`DEBUG: Endpoint=${config.remoteApiUrl}`);
      log(
        `DEBUG: First snapshot timestamps: top=${firstSnap.timestamp}, inner=${firstSnap?.snapshot?.ts}`,
      );

      const payload = {
        ship_name: config.shipName,
        meter_id: String(this.meter.meterId),
        batch_number: targetBatch,
        snapshots: filteredSnapshots,
      };

      const bytesLen = Buffer.byteLength(JSON.stringify(payload), "utf8");
      log(
        `INFO: Sending batch payload (${bytesLen} bytes) to ${config.remoteApiUrlBatch}`,
      );

      const response = await postJson(
        config.remoteApiUrlBatch,
        this.remoteHeaders,
        payload,
        config.timeoutSecondsRemote,
      ).catch((err) => {
        throw err;
      });
      log(
        `SUCCESS: Posted ${filteredSnapshots.length} snapshots from batch ${targetBatch} in one request`,
      );
      if (response) {
        try {
          log(`SUCCESS: Response: ${JSON.stringify(response)}`);
        } catch {}
      }
    }
  }
}
