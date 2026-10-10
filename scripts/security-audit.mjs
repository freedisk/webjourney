import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { evaluateDependencyAudit, LINT_AUDIT_EXCEPTION } from "../lib/dependency-audit.js";

// Appeler npm avec Node évite toute construction de commande shell sous Windows.
const npmCli = process.env.npm_execpath
  || path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");

function npmJson(args) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: process.cwd(), encoding: "utf8", timeout: 60000, maxBuffer: 12 * 1024 * 1024,
  });
  if (result.error || ![0, 1].includes(result.status)) throw new Error("AUDIT_COMMAND_UNAVAILABLE");
  try {
    const payload = JSON.parse(result.stdout);
    if (payload?.error) throw new Error("AUDIT_COMMAND_UNAVAILABLE");
    return payload;
  } catch {
    // Ne pas relayer stderr ni une réponse externe pouvant contenir des credentials.
    throw new Error("AUDIT_COMMAND_UNAVAILABLE");
  }
}

try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args[0] && !/^--audit-level=(info|low|moderate|high|critical)$/.test(args[0]))) {
    throw new Error("AUDIT_ARGUMENT_INVALID");
  }
  const level = args[0]?.split("=")[1] || "low";
  const lockfile = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  const production = evaluateDependencyAudit(
    npmJson(["audit", "--omit=dev", "--json", "--audit-level=" + level]),
    lockfile, { level, allowException: false },
  );
  console.log("Audit production : " + production.remaining.length + " alerte(s), aucune exception possible.");
  if (production.blocking.length) {
    console.error("AUDIT_PRODUCTION_BLOCKED: " + production.blocking.map((finding) => finding.name).join(", "));
    process.exitCode = 1;
  } else {
    const full = evaluateDependencyAudit(
      npmJson(["audit", "--json", "--audit-level=" + level]), lockfile, { level },
    );
    if (full.ignored.length) {
      const latest = npmJson(["view", "braces", "version", "--json"]);
      if (latest !== LINT_AUDIT_EXCEPTION.versions.braces) {
        throw new Error("AUDIT_EXCEPTION_REVIEW_REQUIRED_NEW_BRACES_VERSION");
      }
      console.log("Exception développement " + LINT_AUDIT_EXCEPTION.id + " : "
        + full.ignored.length + " constat(s) de la seule chaîne lint, jusqu'au " + LINT_AUDIT_EXCEPTION.expiresAt);
    }
    console.log("Audit complet : " + full.remaining.length + " autre(s) alerte(s), "
      + full.blocking.length + " bloquante(s) au niveau " + level + ".");
    if (full.blocking.length) {
      console.error("AUDIT_DEPENDENCIES_BLOCKED: " + full.blocking.map((finding) => finding.name).join(", "));
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
