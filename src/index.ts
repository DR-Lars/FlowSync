import Fastify from "fastify";
import { config, getMeters } from "./config";
import { Poller } from "./poller";
import { ReportPoller } from "./report-poller";
import * as fs from "fs";
import * as path from "path";

const fastify = Fastify({
  logger: true,
  bodyLimit: 1048576, // 1MB
});

// Register JSON parser
fastify.addContentTypeParser(
  "application/json",
  { parseAs: "string" },
  function (req, body, done) {
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  },
);

const envFilePath =
  process.env.ENV_FILE_PATH?.trim() || path.join(process.cwd(), ".env");
const meters = getMeters();
const pollers = meters.map((meter) => ({
  meter,
  poller: new Poller(meter),
  reportPoller: new ReportPoller(meter),
  isPolling: false,
  isReportPolling: false,
}));

function log(msg: string) {
  fastify.log.info(msg);
}

// Basic auth middleware for admin endpoints
function checkAuth(request: any, reply: any): boolean {
  const authHeader = request.headers.authorization;
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "admin";

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    reply
      .code(401)
      .header("WWW-Authenticate", 'Basic realm="FlowSync Admin"')
      .send({ error: "Authentication required" });
    return false;
  }

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "ascii",
  );
  const [username, password] = credentials.split(":");

  if (username !== adminUser || password !== adminPass) {
    reply.code(401).send({ error: "Invalid credentials" });
    return false;
  }

  return true;
}

// Serve config editor HTML
fastify.get("/admin", async (request, reply) => {
  if (!checkAuth(request, reply)) return;

  const htmlPath = path.join(__dirname, "config-editor.html");
  const html = fs.readFileSync(htmlPath, "utf-8");
  reply.type("text/html").send(html);
});

// Read current .env configuration
fastify.get("/api/config", async (request, reply) => {
  if (!checkAuth(request, reply)) return;

  try {
    const envPath = envFilePath;
    fastify.log.info(`Reading config from: ${envPath}`);

    if (!fs.existsSync(envPath)) {
      fastify.log.warn(`Config file does not exist: ${envPath}`);
      return {};
    }

    const envContent = fs.readFileSync(envPath, "utf-8");
    fastify.log.info(`Read ${envContent.length} bytes from config file`);

    const envVars: Record<string, string> = {};

    envContent.split("\n").forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        envVars[key] = value;
      }
    });

    fastify.log.info(
      `Parsed ${Object.keys(envVars).length} environment variables from config file`,
    );
    return envVars;
  } catch (error: any) {
    fastify.log.error(`Error reading config file: ${error.message}`);
    reply.code(500).send({ error: error.message });
  }
});

// Update .env configuration
fastify.post("/api/config", async (request, reply) => {
  if (!checkAuth(request, reply)) return;

  try {
    const newConfig = request.body as Record<string, string>;
    const envPath = envFilePath;
    const envDir = path.dirname(envPath);

    fastify.log.info(`Attempting to write config to: ${envPath}`);

    if (!fs.existsSync(envDir)) {
      fs.mkdirSync(envDir, { recursive: true });
    }

    // Build new .env content
    const lines: string[] = [
      "# FlowSync Configuration",
      "# Updated: " + new Date().toISOString(),
      "",
      "# Global Configuration",
      `SHIP_NAME=${newConfig.SHIP_NAME || ""}`,
      `REMOTE_API_URL=${newConfig.REMOTE_API_URL || ""}`,
      `REMOTE_API_URL_BATCH=${newConfig.REMOTE_API_URL_BATCH || ""}`,
      `REMOTE_API_TOKEN=${newConfig.REMOTE_API_TOKEN || ""}`,
      "",
      "# Meter Configurations (up to 3)",
    ];

    // Save meter configurations
    for (let i = 1; i <= 3; i++) {
      const meterId = newConfig[`METER_${i}_ID`];
      const localApiUrl = newConfig[`METER_${i}_LOCAL_API_URL`];
      const archiveName = newConfig[`METER_${i}_ARCHIVE_NAME`];

      if (meterId || localApiUrl || archiveName) {
        lines.push(`METER_${i}_ID=${meterId || ""}`);
        lines.push(`METER_${i}_LOCAL_API_URL=${localApiUrl || ""}`);
        lines.push(`METER_${i}_ARCHIVE_NAME=${archiveName || ""}`);
        if (i < 3) lines.push("");
      }
    }

    lines.push("");
    lines.push("# Optional Configuration");
    const optionalVars = [
      "PORT",
      "POLL_INTERVAL_MS",
      "BATCH_SIZE",
      "MAX_RETRIES",
      "RETRY_DELAY_SECONDS",
      "TIMEOUT_SECONDS_LOCAL",
      "TIMEOUT_SECONDS_REMOTE",
    ];

    optionalVars.forEach((key) => {
      if (newConfig[key]) {
        lines.push(`${key}=${newConfig[key]}`);
      }
    });

    // Report Poller Configuration (optional)
    const reportVars = ["REPORT_TICKET_API_URL", "REPORT_FILTER"];
    if (reportVars.some((key) => newConfig[key])) {
      lines.push("");
      lines.push("# Report Poller Configuration (optional)");
      reportVars.forEach((key) => {
        if (newConfig[key]) {
          lines.push(`${key}=${newConfig[key]}`);
        }
      });
    }

    // Preserve admin credentials if they exist
    if (process.env.ADMIN_USER) {
      lines.push("");
      lines.push("# Admin Credentials");
      lines.push(`ADMIN_USER=${process.env.ADMIN_USER}`);
      lines.push(`ADMIN_PASSWORD=${process.env.ADMIN_PASSWORD}`);
    }

    fs.writeFileSync(envPath, lines.join("\n") + "\n", "utf-8");
    fastify.log.info(`Configuration saved successfully to ${envPath}`);

    return { success: true, message: "Configuration saved successfully" };
  } catch (error: any) {
    fastify.log.error(`Error saving config: ${error.message}`);
    reply.code(500).send({ error: error.message });
  }
});

// Test configuration endpoint
fastify.post("/api/test-config", async (request, reply) => {
  if (!checkAuth(request, reply)) return;

  try {
    const testConfig = request.body as Record<string, string>;
    const results: Array<{ name: string; status: string; message: string }> =
      [];

    // Test each meter's Local API connectivity
    for (let i = 1; i <= 3; i++) {
      const meterId = testConfig[`METER_${i}_ID`];
      const localUrl = testConfig[`METER_${i}_LOCAL_API_URL`];
      const archiveName = testConfig[`METER_${i}_ARCHIVE_NAME`];

      if (meterId && localUrl && archiveName) {
        try {
          const cleanUrl = localUrl.replace(/\/$/, "");
          const response = await fetch(`${cleanUrl}/health`, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
          }).catch(() => null);

          if (response && response.ok) {
            results.push({
              name: `Meter ${i} (${meterId})`,
              status: "success",
              message: `Local API connection successful`,
            });
          } else {
            results.push({
              name: `Meter ${i} (${meterId})`,
              status: "warning",
              message: "Could not connect to /health endpoint",
            });
          }
        } catch (error: any) {
          results.push({
            name: `Meter ${i} (${meterId})`,
            status: "error",
            message: `Connection failed: ${error.message}`,
          });
        }
      }
    }

    // Test Remote API connectivity and authentication
    if (testConfig.REMOTE_API_URL && testConfig.REMOTE_API_TOKEN) {
      try {
        const response = await fetch(testConfig.REMOTE_API_URL, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${testConfig.REMOTE_API_TOKEN}`,
          },
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          results.push({
            name: "Remote API",
            status: "success",
            message: "Authentication successful",
          });
        } else if (response.status === 401 || response.status === 403) {
          results.push({
            name: "Remote API",
            status: "error",
            message: "Authentication failed - check your token",
          });
        } else {
          results.push({
            name: "Remote API",
            status: "warning",
            message: `Connection OK but got status ${response.status}`,
          });
        }
      } catch (error: any) {
        results.push({
          name: "Remote API",
          status: "error",
          message: `Connection failed: ${error.message}`,
        });
      }
    }

    // Validate global required fields
    const globalRequired = [
      "SHIP_NAME",
      "REMOTE_API_URL",
      "REMOTE_API_URL_BATCH",
      "REMOTE_API_TOKEN",
    ];
    const missingGlobal = globalRequired.filter((field) => !testConfig[field]);

    // Validate at least one meter is configured
    let hasValidMeter = false;
    for (let i = 1; i <= 3; i++) {
      const meterId = testConfig[`METER_${i}_ID`];
      const localUrl = testConfig[`METER_${i}_LOCAL_API_URL`];
      const archiveName = testConfig[`METER_${i}_ARCHIVE_NAME`];
      if (meterId && localUrl && archiveName) {
        hasValidMeter = true;
        break;
      }
    }

    if (missingGlobal.length > 0) {
      results.push({
        name: "Global Fields",
        status: "error",
        message: `Missing: ${missingGlobal.join(", ")}`,
      });
    } else if (!hasValidMeter) {
      results.push({
        name: "Meter Configuration",
        status: "error",
        message:
          "At least one meter must be configured (METER_1_ID, METER_1_LOCAL_API_URL, METER_1_ARCHIVE_NAME)",
      });
    } else {
      results.push({
        name: "Required Fields",
        status: "success",
        message: "All required fields present",
      });
    }

    // Validate numeric fields
    const numericFields = [
      "PORT",
      "POLL_INTERVAL_MS",
      "BATCH_SIZE",
      "MAX_RETRIES",
      "RETRY_DELAY_SECONDS",
      "TIMEOUT_SECONDS_LOCAL",
      "TIMEOUT_SECONDS_REMOTE",
    ];
    const invalidNumeric = numericFields.filter((field) => {
      const value = testConfig[field];
      return value && (isNaN(Number(value)) || Number(value) < 0);
    });

    if (invalidNumeric.length > 0) {
      results.push({
        name: "Numeric Values",
        status: "error",
        message: `Invalid values: ${invalidNumeric.join(", ")}`,
      });
    } else if (numericFields.some((field) => testConfig[field])) {
      results.push({
        name: "Numeric Values",
        status: "success",
        message: "All numeric values valid",
      });
    }

    if (testConfig.REPORT_TICKET_API_URL) {
      try {
        const cleanUrl = testConfig.REPORT_TICKET_API_URL.replace(/\/$/, "");
        const response = await fetch(cleanUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${testConfig.REMOTE_API_TOKEN}`,
          },
          body: JSON.stringify({ test: true }),
          signal: AbortSignal.timeout(5000),
        }).catch(() => null);

        if (response) {
          if (response.ok) {
            results.push({
              name: "Report Ticket API",
              status: "success",
              message: "Connection and authentication successful",
            });
          } else if (response.status === 401 || response.status === 403) {
            results.push({
              name: "Report Ticket API",
              status: "error",
              message: "Authentication failed",
            });
          } else {
            results.push({
              name: "Report Ticket API",
              status: "warning",
              message: `Connection OK but got status ${response.status}`,
            });
          }
        }
      } catch (error: any) {
        results.push({
          name: "Report Ticket API",
          status: "error",
          message: `Connection failed: ${error.message}`,
        });
      }
    }

    return { results };
  } catch (error: any) {
    reply.code(500).send({ error: error.message });
  }
});

// Restart service endpoint
fastify.post("/api/restart", async (request, reply) => {
  if (!checkAuth(request, reply)) return;

  try {
    reply.send({ success: true, message: "Restart initiated" });

    // Give time for response to be sent
    setTimeout(() => {
      process.exit(0); // systemd will restart the service
    }, 500);
  } catch (error: any) {
    reply.code(500).send({ error: error.message });
  }
});

fastify.get("/health", async () => ({
  status: "ok",
  ts: new Date().toISOString(),
}));

fastify.get("/trigger", async () => {
  const anyPolling = pollers.some((p) => p.isPolling || p.isReportPolling);
  if (anyPolling) return { status: "busy" };

  try {
    // Run all pollers in parallel
    const tasks = [
      ...pollers.map(async (p) => {
        p.isPolling = true;
        try {
          await p.poller.runWithRetries(log);
        } finally {
          p.isPolling = false;
        }
      }),
    ];

    // Run report pollers if configured
    if (config.reportTicketApiUrl) {
      tasks.push(
        ...pollers.map(async (p) => {
          p.isReportPolling = true;
          try {
            await p.reportPoller.runWithRetries(log);
          } finally {
            p.isReportPolling = false;
          }
        }),
      );
    }

    await Promise.all(tasks);
    return { status: "done", meters: pollers.map((p) => p.meter.meterId) };
  } catch (e: any) {
    return { status: "error", error: e?.message ?? String(e) };
  }
});

async function schedulePoll() {
  // Run all pollers in parallel, skip if any is already polling
  const anyPolling = pollers.some((p) => p.isPolling || p.isReportPolling);
  if (anyPolling) return;

  const tasks = [
    ...pollers.map(async (p) => {
      p.isPolling = true;
      try {
        await p.poller.runWithRetries(log);
      } catch (e: any) {
        fastify.log.error(`[${p.meter.meterId}]`, e);
      } finally {
        p.isPolling = false;
      }
    }),
  ];

  // Run report pollers if configured
  if (config.reportTicketApiUrl) {
    tasks.push(
      ...pollers.map(async (p) => {
        p.isReportPolling = true;
        try {
          await p.reportPoller.runWithRetries(log);
        } catch (e: any) {
          fastify.log.error(`[ReportPoller:${p.meter.meterId}]`, e);
        } finally {
          p.isReportPolling = false;
        }
      }),
    );
  }

  await Promise.all(tasks);
}

async function start() {
  try {
    await fastify.listen({
      port: Number(process.env.PORT ?? 3000),
      host: "0.0.0.0",
    });
    const meterIds = meters.map((m) => m.meterId).join(", ");
    fastify.log.info(
      `Service started with ${meters.length} meter(s): ${meterIds}. Polling every ${config.pollIntervalMs} ms (15 min)`,
    );
    // Kick off immediately, then intervals
    schedulePoll();
    setInterval(schedulePoll, config.pollIntervalMs);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
