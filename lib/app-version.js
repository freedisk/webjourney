const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const BUILD_ID_PATTERN = /^(?:[a-f0-9]{7,64}|local)$/i;

function validDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function parseBuildInfo(value) {
  if (!value || typeof value !== "object") return null;

  const version = typeof value.version === "string" ? value.version.trim() : "";
  const buildId = typeof value.buildId === "string" ? value.buildId.trim() : "";
  const builtAt = typeof value.builtAt === "string" ? value.builtAt.trim() : "";

  if (!VERSION_PATTERN.test(version) || !BUILD_ID_PATTERN.test(buildId) || !validDate(builtAt)) {
    return null;
  }

  return Object.freeze({ version, buildId, builtAt: new Date(builtAt).toISOString() });
}

const injectedBuildInfo = parseBuildInfo({
  version: process.env.NEXT_PUBLIC_CAPSULE_VERSION,
  buildId: process.env.NEXT_PUBLIC_CAPSULE_BUILD_ID,
  builtAt: process.env.NEXT_PUBLIC_CAPSULE_BUILT_AT,
});

export const CURRENT_BUILD_INFO = injectedBuildInfo || Object.freeze({
  version: "0.0.0",
  buildId: "local",
  builtAt: new Date(0).toISOString(),
});

export function shortBuildId(buildId) {
  return buildId === "local" ? "local" : buildId.slice(0, 7);
}

export function formatBuildDate(value, locale = "fr-FR") {
  if (!validDate(value)) return "date inconnue";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function isDifferentBuild(current, latest) {
  const parsedCurrent = parseBuildInfo(current);
  const parsedLatest = parseBuildInfo(latest);
  if (!parsedCurrent || !parsedLatest) return false;
  return parsedCurrent.version !== parsedLatest.version || parsedCurrent.buildId !== parsedLatest.buildId;
}

export async function fetchLatestBuildInfo({ fetchImpl = fetch, signal } = {}) {
  const response = await fetchImpl("/api/version", {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) throw new Error("VERSION_CHECK_UNAVAILABLE");

  const buildInfo = parseBuildInfo(await response.json());
  if (!buildInfo) throw new Error("VERSION_CHECK_INVALID_RESPONSE");
  return buildInfo;
}
