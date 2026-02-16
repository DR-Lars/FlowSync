import { config, MeterConfig } from "./config";
import { fetch, FormData, File } from "undici";
import { parseStringPromise } from "xml2js";

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function withTimeout<T>(p: Promise<T>, seconds: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), seconds * 1000);
  return p.finally(() => clearTimeout(timer));
}

type AnyObj = Record<string, any>;

async function getText(url: string, headers: AnyObj, timeoutSec: number) {
  const res = await withTimeout(
    fetch(url, {
      method: "GET",
      headers,
      signal: new AbortController().signal,
    }),
    timeoutSec,
  );
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  return res.text();
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

async function postFormData(
  url: string,
  headers: AnyObj,
  formData: any,
  timeoutSec: number,
) {
  // Remove Content-Type header so fetch sets the proper boundary
  const headersWithoutContentType = { ...headers };
  delete headersWithoutContentType["Content-Type"];

  const res = await withTimeout(
    fetch(url, {
      method: "POST",
      headers: headersWithoutContentType,
      body: formData,
    }),
    timeoutSec,
  );
  if (!res.ok)
    throw new Error(`POST ${url} -> ${res.status} ${res.statusText}`);
  return res.json().catch(() => null);
}

interface ReportInfo {
  time: string;
  file: string;
  mod: string;
  text: string;
}

export class ReportPoller {
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
        log(
          `INFO: [ReportPoller:${this.meter.meterId}] Attempt ${attempt}/${config.maxRetries}`,
        );
        await this.runOnce(log);
        return;
      } catch (err: any) {
        log(
          `ERROR: [ReportPoller:${this.meter.meterId}] (attempt ${attempt}): ${err?.message ?? String(err)}`,
        );
        if (attempt < config.maxRetries) {
          log(
            `INFO: [ReportPoller:${this.meter.meterId}] Retrying in ${config.retryDelaySeconds} seconds...`,
          );
          await delay(config.retryDelaySeconds * 1000);
        } else {
          log(
            `ERROR: [ReportPoller:${this.meter.meterId}] Max retries exceeded`,
          );
          throw err;
        }
      }
    }
  }

  async runOnce(log: (msg: string) => void) {
    const baseUrl = this.meter.localApiUrlBase.replace(/\/$/, "");
    const reportsUrl = `${baseUrl}/reports?filter=${encodeURIComponent(config.reportFilter)}`;
    log(
      `INFO: [ReportPoller:${this.meter.meterId}] Fetching reports from: ${reportsUrl}`,
    );

    const reportsXml = await getText(
      reportsUrl,
      this.localHeaders,
      config.timeoutSecondsLocal,
    );

    const parsed = await parseStringPromise(reportsXml);
    let reports = parsed.reports?.report || [];

    // xml2js returns a single object if there's only one report, ensure it's always an array
    if (!Array.isArray(reports)) {
      reports = reports ? [reports] : [];
    }

    log(
      `INFO: [ReportPoller:${this.meter.meterId}] Found ${reports.length} reports with filter "${config.reportFilter}"`,
    );

    // Process reports in order (newest first)
    for (const report of reports) {
      const reportInfo: ReportInfo = {
        time: report.$.time,
        file: report.$.file,
        mod: report.$.mod,
        text: report.$.text,
      };

      await this.processReport(reportInfo, log);
    }
  }

  private async processReport(report: ReportInfo, log: (msg: string) => void) {
    try {
      log(
        `INFO: [ReportPoller:${this.meter.meterId}] Processing report: ${report.file}`,
      );

      // Download the report
      const baseUrl = this.meter.localApiUrlBase.replace(/\/$/, "");
      const downloadUrl = `${baseUrl}/report?type=xmlstream&report=1:${encodeURIComponent(report.file)}`;
      log(
        `INFO: [ReportPoller:${this.meter.meterId}] Downloading report from: ${downloadUrl}`,
      );

      const reportContent = await getText(
        downloadUrl,
        this.localHeaders,
        config.timeoutSecondsLocal,
      );

      // Parse the report XML to extract batch number
      const parsed = await parseStringPromise(reportContent);
      const batchNumber = this.extractBatchNumber(parsed, log);

      if (!batchNumber) {
        log(
          `WARNING: [ReportPoller:${this.meter.meterId}] Could not extract batch number from report: ${report.file}`,
        );
        return;
      }

      log(
        `INFO: [ReportPoller:${this.meter.meterId}] Extracted batch number ${batchNumber} from report: ${report.file}`,
      );

      // Post the report to the remote ticket API as form-data
      const formData = new FormData();
      formData.append("ship", config.shipName);
      formData.append("meter", this.meter.meterId);
      formData.append("batchNumber", batchNumber);

      // Append the report file
      const fileBlob = new File([reportContent], report.file, {
        type: "application/xml",
      });
      formData.append("file", fileBlob);

      log(
        `INFO: [ReportPoller:${this.meter.meterId}] Posting report to ticket API: ${config.reportTicketApiUrl}`,
      );
      log(
        `DEBUG: [ReportPoller:${this.meter.meterId}] Request URL: POST ${config.reportTicketApiUrl}`,
      );
      log(
        `DEBUG: [ReportPoller:${this.meter.meterId}] Request Headers: ${JSON.stringify(this.remoteHeaders)}`,
      );
      log(
        `DEBUG: [ReportPoller:${this.meter.meterId}] Form Fields: ship="${config.shipName}", meter="${this.meter.meterId}", batchNumber="${batchNumber}", file="${report.file}" (${reportContent.length} bytes, type: application/xml)`,
      );

      const response = await postFormData(
        config.reportTicketApiUrl,
        this.remoteHeaders,
        formData,
        config.timeoutSecondsRemote,
      );

      log(
        `SUCCESS: [ReportPoller:${this.meter.meterId}] Posted report ${report.file} to ticket API`,
      );
      if (response) {
        try {
          log(
            `SUCCESS: [ReportPoller:${this.meter.meterId}] Response: ${JSON.stringify(response)}`,
          );
        } catch {}
      }
    } catch (err: any) {
      log(
        `ERROR: [ReportPoller:${this.meter.meterId}] Failed to process report ${report.file}: ${err?.message ?? String(err)}`,
      );
    }
  }

  private extractBatchNumber(
    parsed: any,
    log: (msg: string) => void,
  ): string | null {
    try {
      // Try common paths where batch number might be stored
      const paths = [
        // Check attributes
        () => parsed.report?.$?.batch,
        () => parsed.report?.$?.batch_number,
        // Check child elements
        () => parsed.report?.batch?.[0],
        () => parsed.report?.batch_number?.[0],
        () => parsed.report?.batchnumber?.[0],
      ];

      for (const pathFn of paths) {
        try {
          const value = pathFn();
          if (value !== undefined && value !== null && value !== "") {
            const strValue = String(value).trim();
            if (strValue && strValue !== "[object Object]") {
              return strValue;
            }
          }
        } catch {}
      }

      // Search in table cells for "Batch number" label
      try {
        const rows = parsed.report?.rows?.[0]?.row;
        if (Array.isArray(rows)) {
          for (const row of rows) {
            const cells = Array.isArray(row.cell) ? row.cell : [row.cell];
            for (let i = 0; i < cells.length - 1; i++) {
              const cell = cells[i];
              const nextCell = cells[i + 1];

              const cellText = cell?.$?.text || cell?._;
              const nextCellText = nextCell?.$?.text || nextCell?._;

              if (
                cellText &&
                String(cellText).toLowerCase().includes("batch number")
              ) {
                if (nextCellText) {
                  const batchValue = String(nextCellText).trim();
                  if (batchValue && /^\d+$/.test(batchValue)) {
                    log(
                      `DEBUG: [ReportPoller:${this.meter.meterId}] Found batch number in table: ${batchValue}`,
                    );
                    return batchValue;
                  }
                }
              }
            }
          }
        }
      } catch (tableErr) {
        log(
          `DEBUG: [ReportPoller:${this.meter.meterId}] Error searching table cells: ${tableErr}`,
        );
      }

      log(
        `DEBUG: [ReportPoller:${this.meter.meterId}] Could not extract batch number. Report structure keys: ${JSON.stringify(Object.keys(parsed))}`,
      );
      if (parsed.report?.$) {
        log(
          `DEBUG: [ReportPoller:${this.meter.meterId}] Report attributes: ${JSON.stringify(parsed.report.$)}`,
        );
      }
      if (parsed.report) {
        const keys = Object.keys(parsed.report).slice(0, 10);
        log(
          `DEBUG: [ReportPoller:${this.meter.meterId}] Report top-level keys: ${JSON.stringify(keys)}`,
        );
      }

      return null;
    } catch (err: any) {
      log(
        `ERROR: [ReportPoller:${this.meter.meterId}] Error extracting batch number: ${err?.message ?? String(err)}`,
      );
      return null;
    }
  }
}
