import { describe, expect, it } from "vitest";
import { evaluateDependencyAudit, LINT_AUDIT_EXCEPTION } from "../lib/dependency-audit.js";

const NOW = Date.parse("2026-10-10T12:00:00Z");
const ADVISORY = {
  url: LINT_AUDIT_EXCEPTION.url, name: "braces", dependency: "braces",
  severity: "high", range: "<=3.0.3",
};

function fixture() {
  const causes = {
    braces: [ADVISORY], micromatch: ["braces"], "fast-glob": ["micromatch"],
    "@next/eslint-plugin-next": ["fast-glob"], "eslint-config-next": ["@next/eslint-plugin-next"],
  };
  const vulnerabilities = {};
  const packages = {};
  for (const [name, version] of Object.entries(LINT_AUDIT_EXCEPTION.versions)) {
    const node = "node_modules/" + name;
    packages[node] = { version, dev: true };
    vulnerabilities[name] = { name, severity: "high", via: structuredClone(causes[name]), nodes: [node] };
  }
  return {
    report: { auditReportVersion: 2, vulnerabilities, metadata: {
      vulnerabilities: { info: 0, low: 0, moderate: 0, high: 5, critical: 0, total: 5 },
    } },
    lockfile: { packages },
  };
}

function evaluate(report, lockfile, options) {
  return evaluateDependencyAudit(report, lockfile, { now: NOW, level: "high", ...options });
}

describe("exception temporaire et ciblée de l'audit de dépendances", () => {
  it("autorise seulement la chaîne de lint explicitement approuvée", () => {
    const { report, lockfile } = fixture();
    expect(evaluate(report, lockfile)).toMatchObject({ remaining: [], blocking: [] });
    expect(evaluate(report, lockfile).ignored).toHaveLength(5);
  });

  it("ne peut jamais exempter cette même alerte dans l'audit de production", () => {
    const { report, lockfile } = fixture();
    expect(evaluate(report, lockfile, { allowException: false }).ignored).toEqual([]);
    expect(evaluate(report, lockfile, { allowException: false }).blocking).toHaveLength(5);
  });

  it("refuse les versions, chemins et usages hors périmètre développement", () => {
    for (const change of [
      (data) => { data.lockfile.packages["node_modules/braces"].dev = false; },
      (data) => { data.lockfile.packages["node_modules/braces"].version = "3.0.4"; },
      (data) => { data.report.vulnerabilities.braces.nodes.push("node_modules/other/node_modules/braces"); },
    ]) {
      const data = fixture();
      change(data);
      expect(evaluate(data.report, data.lockfile).blocking).toHaveLength(5);
    }
  });

  it("n'ignore pas une nouvelle alerte dans le package ou ses parents", () => {
    for (const name of ["braces", "eslint-config-next"]) {
      const { report, lockfile } = fixture();
      report.vulnerabilities[name].via.push({ ...ADVISORY, url: "https://github.com/advisories/GHSA-new-alert" });
      expect(evaluate(report, lockfile).blocking.map((finding) => finding.name)).toContain(name);
    }
  });

  it("cesse automatiquement d'exempter l'alerte à l'échéance", () => {
    const { report, lockfile } = fixture();
    const deadline = Date.parse(LINT_AUDIT_EXCEPTION.expiresAt);
    expect(evaluate(report, lockfile, { now: deadline - 1 }).ignored).toHaveLength(5);
    expect(evaluate(report, lockfile, { now: deadline }).blocking).toHaveLength(5);
  });

  it("refuse une sévérité devenue critique ou un graphe cyclique", () => {
    const critical = fixture();
    critical.report.vulnerabilities.braces.severity = "critical";
    critical.report.metadata.vulnerabilities.high -= 1;
    critical.report.metadata.vulnerabilities.critical += 1;
    expect(evaluate(critical.report, critical.lockfile).blocking).toHaveLength(5);
    const cyclic = fixture();
    cyclic.report.vulnerabilities.braces.via = ["micromatch"];
    expect(evaluate(cyclic.report, cyclic.lockfile).blocking).toHaveLength(5);
  });

  it("échoue fermement sur un rapport incomplet, incohérent ou en erreur", () => {
    for (const report of [
      {}, { error: { code: "registry unavailable" } },
      { ...fixture().report, auditReportVersion: 1 },
      { ...fixture().report, vulnerabilities: {} },
    ]) {
      expect(() => evaluate(report, fixture().lockfile)).toThrow("AUDIT_REPORT_INVALID");
    }
  });

  it("conserve le blocage des autres alertes au seuil demandé", () => {
    const { report, lockfile } = fixture();
    report.vulnerabilities.other = {
      name: "other", severity: "high", via: [{ ...ADVISORY, url: "https://github.com/advisories/GHSA-other" }],
      nodes: ["node_modules/other"],
    };
    report.metadata.vulnerabilities.high += 1;
    report.metadata.vulnerabilities.total += 1;
    expect(evaluate(report, lockfile).blocking).toEqual([{ name: "other", severity: "high" }]);
  });
});
