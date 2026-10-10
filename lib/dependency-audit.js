const SEVERITY = Object.freeze({ info: 0, low: 1, moderate: 2, high: 3, critical: 4 });

// Exception approuvée par le propriétaire le 10 octobre 2026, journal UX-003.
// Les versions et chemins exacts empêchent son extension à d'autres usages.
export const LINT_AUDIT_EXCEPTION = Object.freeze({
  id: "GHSA-vfj7-8cjw-p6xm",
  url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
  expiresAt: "2026-10-24T23:59:59Z",
  versions: Object.freeze({
    braces: "3.0.3",
    micromatch: "4.0.8",
    "fast-glob": "3.3.1",
    "@next/eslint-plugin-next": "16.4.0",
    "eslint-config-next": "16.4.0",
  }),
});

function validateReport(report) {
  const counts = report?.metadata?.vulnerabilities;
  if (report?.error || report?.auditReportVersion !== 2 || !report?.vulnerabilities
    || Array.isArray(report.vulnerabilities) || typeof report.vulnerabilities !== "object"
    || !counts || !Number.isInteger(counts.total)) {
    throw new Error("AUDIT_REPORT_INVALID");
  }
  const findings = Object.entries(report.vulnerabilities);
  if (findings.length !== counts.total) throw new Error("AUDIT_REPORT_INVALID");
  const actual = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  for (const [name, finding] of findings) {
    if (finding?.name !== name || !Object.hasOwn(SEVERITY, finding?.severity)
      || !Array.isArray(finding.via) || finding.via.length === 0
      || !Array.isArray(finding.nodes) || finding.nodes.length === 0) {
      throw new Error("AUDIT_REPORT_INVALID");
    }
    actual[finding.severity] += 1;
  }
  for (const severity of Object.keys(SEVERITY)) {
    if (counts[severity] !== actual[severity]) throw new Error("AUDIT_REPORT_INVALID");
  }
  return findings;
}

export function evaluateDependencyAudit(report, lockfile, {
  level = "low",
  allowException = true,
  now = Date.now(),
} = {}) {
  if (!Object.hasOwn(SEVERITY, level) || !Number.isFinite(now)) throw new Error("AUDIT_OPTIONS_INVALID");
  const findings = validateReport(report);
  const active = allowException && now < Date.parse(LINT_AUDIT_EXCEPTION.expiresAt);

  function matchesException(name, ancestors = new Set()) {
    const finding = report.vulnerabilities[name];
    const version = LINT_AUDIT_EXCEPTION.versions[name];
    if (!active || !Object.hasOwn(LINT_AUDIT_EXCEPTION.versions, name) || ancestors.has(name)
      || !finding || finding.severity !== "high") return false;
    if (!finding.nodes.every((node) => node === "node_modules/" + name
      && lockfile?.packages?.[node]?.dev === true
      && lockfile.packages[node].version === version)) return false;
    const visited = new Set(ancestors).add(name);
    return finding.via.every((cause) => {
      if (typeof cause === "string") return matchesException(cause, visited);
      return name === "braces" && cause?.url === LINT_AUDIT_EXCEPTION.url
        && cause.name === "braces" && cause.dependency === "braces"
        && cause.severity === "high" && cause.range === "<=3.0.3";
    });
  }

  const ignored = [];
  const remaining = [];
  for (const [name, finding] of findings) {
    if (matchesException(name)) ignored.push(name);
    else remaining.push({ name, severity: finding.severity });
  }
  return {
    ignored,
    remaining,
    blocking: remaining.filter((finding) => SEVERITY[finding.severity] >= SEVERITY[level]),
  };
}
