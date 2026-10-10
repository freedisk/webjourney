import assert from "node:assert/strict";
import { createRequire } from "node:module";

// Recette du vrai écran avec une session et des données entièrement simulées.
// Playwright peut être fourni par le runtime local, sans dépendance produit.
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.CAPSULE_PLAYWRIGHT_MODULE || "playwright");
const baseURL = process.env.CAPSULE_SCROLL_BASE_URL || "http://localhost:3106";
const storageKey = process.env.CAPSULE_SCROLL_STORAGE_KEY || "sb-scroll-test-auth-token";
const expectBroken = process.argv.includes("--expect-broken");
const userId = "00000000-0000-4000-8000-000000000001";
const expiresAt = Math.floor(Date.now() / 1000) + 3600;
const user = { id: userId, aud: "authenticated", role: "authenticated", email: "scroll@example.invalid" };
const accessToken = [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ sub: userId, aud: "authenticated", exp: expiresAt })).toString("base64url"),
  "synthetic-signature",
].join(".");
const session = {
  access_token: accessToken, refresh_token: "synthetic-refresh", user,
  token_type: "bearer", expires_in: 3600, expires_at: expiresAt,
};
const notes = Array.from({ length: 60 }, (_, index) => ({
  id: "00000000-0000-4000-8000-" + String(index + 1000).padStart(12, "0"),
  user_id: userId, titre: "Note synthétique " + String(index + 1).padStart(2, "0"),
  contenu: Array.from({ length: 60 }, (_, line) => "Paragraphe de recette " + (line + 1) + ".").join("\n\n"),
  couleur: null, epinglee: false, share_token: null, kanban_colonne: "todo",
  kanban_ordre: index, created_at: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
}));
const tags = Array.from({ length: 8 }, (_, index) => ({
  id: "00000000-0000-4000-8000-" + String(index + 2000).padStart(12, "0"),
  user_id: userId, nom: "Tag " + (index + 1), couleur: "#8b5cf6",
}));
const viewports = expectBroken
  ? [{ width: 390, height: 844 }]
  : [
    { width: 320, height: 568 }, { width: 390, height: 844 },
    { width: 430, height: 932 }, { width: 667, height: 375 },
    { width: 1024, height: 768 }, { width: 1416, height: 900 },
  ];
const engines = expectBroken ? [["chromium", chromium]] : [["chromium", chromium], ["webkit", webkit]];
const results = [];

async function metrics(page) {
  return page.locator(".panel-left-scroll").evaluate((list) => {
    const panel = list.parentElement;
    const workspace = panel.parentElement;
    return {
      listHeight: list.clientHeight, contentHeight: list.scrollHeight,
      scrollTop: list.scrollTop, panelHeight: panel.clientHeight,
      workspaceHeight: workspace.clientHeight,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
}

for (const [engineName, engine] of engines) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      const mobile = viewport.width < 768;
      const context = await browser.newContext({
        viewport, isMobile: mobile, hasTouch: mobile, serviceWorkers: "block",
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const errors = [];
      let blockedWrites = 0;
      let mockedReads = 0;
      page.on("pageerror", (error) => errors.push(error.message));
      await context.route("**/*.supabase.co/**", async (route) => {
        const request = route.request();
        const pathname = new URL(request.url()).pathname;
        const headers = {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": request.headers()["access-control-request-headers"] || "*",
          "access-control-allow-methods": "GET, OPTIONS",
        };
        if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
        if (request.method() !== "GET") {
          blockedWrites += 1;
          return route.abort();
        }
        const data = {
          "/auth/v1/user": user, "/rest/v1/notes": notes,
          "/rest/v1/tags": tags, "/rest/v1/notes_tags": [], "/rest/v1/note_images": [],
        }[pathname];
        assert.notEqual(data, undefined, "API simulée non prévue : " + pathname);
        mockedReads += 1;
        return route.fulfill({ status: 200, headers, json: data });
      });
      await context.addInitScript(({ key, value }) => {
        localStorage.setItem(key, JSON.stringify(value));
        localStorage.setItem("capsule-help-progress-v1", JSON.stringify({ completed: [], checklistHidden: true }));
      }, { key: storageKey, value: session });
      try {
        await page.goto(baseURL);
        await page.locator(".note-count").filter({ hasText: "60" }).waitFor();
        await page.locator(mobile ? ".mobile-navigation" : ".view-switcher")
          .getByRole("button", { name: "Liste", exact: true }).click();
        await page.locator(".panel-left-scroll .note-item").last().waitFor({ state: "attached" });
        const before = await metrics(page);
        if (expectBroken) {
          assert.ok(before.panelHeight > before.workspaceHeight + 1);
          assert.equal(before.contentHeight, before.listHeight);
          results.push({ engine: engineName, viewport, reproduced: true, ...before });
          continue;
        }
        assert.ok(before.panelHeight <= before.workspaceHeight + 1, "Panneau liste non borné");
        assert.ok(before.listHeight > 0, "Liste sans hauteur visible");
        assert.ok(before.contentHeight > before.listHeight, "Liste sans plage de défilement");
        assert.ok(before.documentWidth <= before.viewportWidth + 1, "Débordement horizontal");

        const box = await page.locator(".panel-left-scroll").boundingBox();
        if (mobile && engineName === "chromium") {
          const cdp = await context.newCDPSession(page);
          const x = box.x + box.width / 2;
          const startY = box.y + box.height * 0.85;
          const distance = Math.min(220, box.height * 0.65);
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: startY }] });
          for (let step = 1; step <= 8; step += 1) {
            await cdp.send("Input.dispatchTouchEvent", {
              type: "touchMove", touchPoints: [{ x, y: startY - distance * step / 8 }],
            });
            await page.waitForTimeout(25);
          }
          await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          await cdp.detach();
        } else if (mobile && engineName === "webkit") {
          // Playwright ne fournit pas de geste de défilement natif en WebKit mobile.
          await page.locator(".panel-left-scroll").evaluate((list) => list.scrollBy(0, 750));
        } else {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.wheel(0, 750);
        }
        await page.waitForFunction(() => document.querySelector(".panel-left-scroll").scrollTop > 0);
        const afterGesture = await metrics(page);

        // Atteindre la dernière note puis revenir conserve le conteneur utilisable.
        const last = page.locator(".panel-left-scroll .note-item").last();
        await last.scrollIntoViewIfNeeded();
        await last.click();
        await page.locator(".detail-body").waitFor({ state: "visible" });
        const detail = await page.locator(".detail-body").evaluate((body) => {
          body.scrollTop = 400;
          return { height: body.clientHeight, contentHeight: body.scrollHeight, scrollTop: body.scrollTop };
        });
        assert.ok(detail.height > 0 && detail.contentHeight > detail.height && detail.scrollTop > 0,
          "Le contenu de la note doit aussi rester défilable");
        if (mobile) {
          await page.getByRole("button", { name: "← Notes", exact: true }).click();
          await page.locator(".panel-left-scroll").waitFor({ state: "visible" });
        }
        const search = page.getByRole("textbox", { name: "Rechercher dans les notes", exact: true });
        await search.fill("Note synthétique 01");
        await page.waitForFunction(() => document.querySelectorAll(".panel-left-scroll .note-item").length === 1);
        await search.fill("");
        await page.waitForFunction(() => document.querySelectorAll(".panel-left-scroll .note-item").length === 60);

        await page.getByRole("button", { name: "Plus d'actions", exact: true }).click();
        await page.getByRole("menuitem", { name: "Thème sombre", exact: true }).click();
        const dark = await metrics(page);
        assert.ok(dark.contentHeight > dark.listHeight && dark.listHeight > 0);
        assert.equal(blockedWrites, 0, "Une écriture a été tentée pendant la recette");
        assert.ok(mockedReads >= 5, "La session et les données doivent venir des mocks");
        assert.deepEqual(errors, [], "Erreur JavaScript pendant la recette");
        results.push({
          engine: engineName, viewport,
          gesture: mobile ? (engineName === "chromium" ? "touch" : "programmatic") : "wheel",
          listHeight: before.listHeight, contentHeight: before.contentHeight,
          scrollTopAfterGesture: afterGesture.scrollTop,
          lastNoteAccessible: true, detailScrollable: true, searchAndReturn: true, darkTheme: true,
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
console.log(JSON.stringify({ ok: true, scenarios: results.length, results }, null, 2));
