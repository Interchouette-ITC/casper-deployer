#!/usr/bin/env node
/**
 * npm audit gate for CI: fail on high/critical leaf advisories that are not
 * allowlisted. Use when upstream has no patched release yet.
 *
 * Allowlist: GHSA-vfj7-8cjw-p6xm (braces) - no patched npm release yet.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ALLOWED_GHSA = new Set([
  "GHSA-vfj7-8cjw-p6xm", // braces; no patched release
]);

const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync("npm", ["audit", "--json"], {
  cwd,
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
});

let report;
try {
  report = JSON.parse(result.stdout || "{}");
} catch {
  console.error("npm audit: failed to parse JSON output");
  console.error(result.stdout);
  console.error(result.stderr);
  process.exit(1);
}

const remaining = [];
for (const vuln of Object.values(report.vulnerabilities || {})) {
  for (const via of vuln.via || []) {
    if (typeof via !== "object" || via === null || !via.url) {
      continue;
    }
    const ghsa = String(via.url).split("/").pop();
    if (ALLOWED_GHSA.has(ghsa)) {
      continue;
    }
    const severity = via.severity || vuln.severity;
    if (severity === "high" || severity === "critical") {
      remaining.push({
        package: via.name || vuln.name,
        severity,
        ghsa,
        url: via.url,
        range: via.range,
      });
    }
  }
}

if (remaining.length === 0) {
  const skipped = [...ALLOWED_GHSA].join(", ");
  console.log(
    `npm audit: no blocking high/critical advisories (allowlisted: ${skipped})`,
  );
  process.exit(0);
}

console.error("npm audit: blocking high/critical advisories:");
for (const item of remaining) {
  console.error(
    `  - ${item.package} [${item.severity}] ${item.ghsa} ${item.url}`,
  );
}
process.exit(1);
