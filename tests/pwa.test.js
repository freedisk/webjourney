import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../app/manifest";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

describe("PWA Capsule", () => {
  it("déclare une application autonome avec icônes standard et maskable", () => {
    const value = manifest();

    expect(value).toMatchObject({
      id: "/",
      name: "Capsule — Mes Notes",
      short_name: "Capsule",
      start_url: "/",
      scope: "/",
      display: "standalone",
      lang: "fr",
    });
    expect(value.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    );
    expect(value.shortcuts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Nouvelle note", url: "/?action=new" }),
        expect.objectContaining({ name: "Rechercher", url: "/?action=search" }),
      ]),
    );
  });

  it.each([
    ["public/icons/icon-32.png", 32],
    ["public/apple-touch-icon.png", 180],
    ["public/icons/icon-192.png", 192],
    ["public/icons/icon-512.png", 512],
    ["public/icons/icon-maskable-512.png", 512],
  ])("fournit %s au bon format", async (relativePath, expectedSize) => {
    const buffer = await readFile(path.join(process.cwd(), relativePath));

    expect(buffer.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    expect(buffer.readUInt32BE(16)).toBe(expectedSize);
    expect(buffer.readUInt32BE(20)).toBe(expectedSize);
  });

  it("limite le cache aux ressources statiques et au repli hors ligne", async () => {
    const source = await readFile(
      path.join(process.cwd(), "public", "sw.js"),
      "utf8",
    );
    const precache = source.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/)?.[1];

    expect(precache).toBeTruthy();
    expect(source).toContain('const CACHE_NAME = "capsule-static-v2"');
    expect(source).toContain('const OFFLINE_URL = "/offline"');
    expect(precache).toContain("OFFLINE_URL");
    expect(precache).not.toContain('"/"');
    expect(precache).not.toContain("/api/");
    expect(source).toContain('request.mode === "navigate"');
    expect(source).toContain("url.origin !== self.location.origin");
  });
});
