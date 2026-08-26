import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { classifyImageIntegrity } from "../lib/note-image-audit.mjs";
import { NOTE_IMAGES_BUCKET } from "../lib/note-images.js";

function loadLocalEnvironment() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

async function fetchAllRows(supabase, table, columns) {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table} : ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

async function listStoragePaths(supabase) {
  const paths = [];
  const visited = new Set();
  const pageSize = 1000;

  async function visit(prefix, depth) {
    if (visited.has(prefix)) return;
    visited.add(prefix);

    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase.storage.from(NOTE_IMAGES_BUCKET).list(prefix, {
        limit: pageSize,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error(`Storage ${prefix || "/"} : ${error.message}`);

      for (const item of data || []) {
        const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
        const isFolder = !item.id && !item.metadata;
        if (isFolder && depth < 4) {
          await visit(itemPath, depth + 1);
        } else if (item.name !== ".emptyFolderPlaceholder") {
          paths.push(itemPath);
        }
      }

      if (!data || data.length < pageSize) break;
    }
  }

  await visit("", 0);
  return paths;
}

loadLocalEnvironment();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !secretKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY) sont requis."
  );
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
const [notes, metadata, storagePaths] = await Promise.all([
  fetchAllRows(supabase, "notes", "id, user_id, contenu"),
  fetchAllRows(
    supabase,
    "note_images",
    "id, note_id, storage_path, original_name, mime_type, size_bytes"
  ),
  listStoragePaths(supabase),
]);
const audit = classifyImageIntegrity({ notes, metadata, storagePaths });
const includeDetails = process.argv.includes("--details");

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  mode: "read-only",
  bucket: NOTE_IMAGES_BUCKET,
  totals: {
    notes: notes.length,
    metadata: metadata.length,
    storageObjects: storagePaths.length,
  },
  clean: audit.clean,
  counts: audit.counts,
  ...(includeDetails ? { findings: audit.findings } : {}),
}, null, 2));

if (!audit.clean) process.exitCode = 2;
