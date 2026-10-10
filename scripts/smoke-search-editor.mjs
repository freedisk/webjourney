import assert from "node:assert/strict";
import { createRequire } from "node:module";

// Recette locale : toutes les lectures et mutations Supabase sont simulées.
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.CAPSULE_PLAYWRIGHT_MODULE || "playwright");
const baseURL = process.env.CAPSULE_EDITOR_BASE_URL || "http://localhost:3112";
const storageKey = process.env.CAPSULE_EDITOR_STORAGE_KEY || "sb-scroll-test-auth-token";
const userId = "00000000-0000-4000-8000-000000000001";
const imageId = "00000000-0000-4000-8000-000000009999";
const user = { id: userId, aud: "authenticated", role: "authenticated", email: "editor@example.invalid" };
const expiresAt = Math.floor(Date.now() / 1000) + 3600;
const accessToken = [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ sub: userId, aud: "authenticated", exp: expiresAt })).toString("base64url"),
  "synthetic-signature",
].join(".");
const session = { access_token: accessToken, refresh_token: "synthetic-refresh", user, token_type: "bearer", expires_in: 3600, expires_at: expiresAt };
const viewports = [
  { width: 320, height: 568 }, { width: 390, height: 844 }, { width: 430, height: 932 },
  { width: 667, height: 375 }, { width: 1024, height: 768 }, { width: 1416, height: 900 },
];
const results = [];

function fixtures() {
  const notes = Array.from({ length: 60 }, (_, index) => ({
    id: "00000000-0000-4000-8000-" + String(index + 1000).padStart(12, "0"),
    user_id: userId,
    titre: index === 0 ? "Archives d’été" : "Note synthétique " + String(index + 1).padStart(2, "0"),
    contenu: "Paragraphe de recette. ".repeat(24) + (index === 0 ? "![Image privée](capsule-image/" + imageId + ")" : ""),
    couleur: null, epinglee: false, share_token: null, kanban_colonne: "todo", kanban_ordre: index,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
  }));
  const tags = Array.from({ length: 8 }, (_, index) => ({
    id: "00000000-0000-4000-8000-" + String(index + 2000).padStart(12, "0"),
    user_id: userId, nom: "Tag " + (index + 1), couleur: "#8b5cf6",
  }));
  return { notes, tags, links: notes.map((note, index) => ({ note_id: note.id, tag_id: tags[index % 8].id })) };
}

for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      const mobile = viewport.width < 768;
      const tablet = viewport.width === 1024;
      const context = await browser.newContext({ viewport, isMobile: mobile || tablet, hasTouch: mobile || tablet, serviceWorkers: "block", reducedMotion: "reduce" });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      const data = fixtures();
      const errors = [];
      let writes = 0;
      let rejectedSave = false;
      page.on("pageerror", (error) => errors.push(error.message));
      await context.route("**/*.supabase.co/**", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const headers = {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": request.headers()["access-control-request-headers"] || "*",
          "access-control-allow-methods": "GET, OPTIONS, PATCH",
        };
        if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
        if (request.method() === "PATCH" && url.pathname === "/rest/v1/notes") {
          writes += 1;
          await new Promise((resolve) => setTimeout(resolve, 150));
          if (!rejectedSave) {
            rejectedSave = true;
            return route.fulfill({ status: 400, headers, json: { code: "SYNTHETIC_SAVE_ERROR", message: "Échec de recette simulé." } });
          }
          const id = url.searchParams.get("id")?.replace(/^eq\./, "");
          Object.assign(data.notes.find((note) => note.id === id), request.postDataJSON());
          return route.fulfill({ status: 204, headers });
        }
        assert.equal(request.method(), "GET", "Mutation hors scénario : " + url.pathname);
        const payload = {
          "/auth/v1/user": user, "/rest/v1/notes": data.notes, "/rest/v1/tags": data.tags,
          "/rest/v1/notes_tags": data.links, "/rest/v1/note_images": [],
        }[url.pathname];
        assert.notEqual(payload, undefined, "Lecture hors scénario : " + url.pathname);
        return route.fulfill({ status: 200, headers, json: payload });
      });
      await context.addInitScript(({ key, session }) => {
        localStorage.setItem(key, JSON.stringify(session));
        localStorage.setItem("capsule-help-progress-v1", JSON.stringify({ completed: [], checklistHidden: true }));
      }, { key: storageKey, session });
      try {
        await page.goto(baseURL);
        await page.locator(".note-count").filter({ hasText: "60" }).waitFor();
        await page.locator(mobile ? ".mobile-navigation" : ".view-switcher").getByRole("button", { name: "Liste", exact: true }).click();
        const list = page.locator(".panel-left-scroll");
        await list.evaluate((node) => { node.scrollTop = node.scrollHeight; });
        const previousTop = await list.evaluate((node) => node.scrollTop);
        await page.locator(".panel-left-scroll .note-item").last().click();
        await page.locator(".detail-body").waitFor({ state: "visible" });
        if (mobile) {
          await page.getByRole("button", { name: "← Notes", exact: true }).click();
          await page.waitForFunction((top) => Math.abs(document.querySelector(".panel-left-scroll").scrollTop - top) <= 2, previousTop);
        }
        const openSearch = () => mobile
          ? page.locator(".mobile-navigation").getByRole("button", { name: "Chercher", exact: true }).click()
          : page.getByRole("button", { name: "Ouvrir la palette de commandes", exact: true }).click();
        const assertSearchSize = async (field) => {
          if (!mobile && !tablet) return;
          const size = await field.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
          assert.ok(size >= 16, "Champ de recherche tactile trop petit : " + size + " px");
        };
        await assertSearchSize(page.getByRole("textbox", { name: "Rechercher dans les notes", exact: true }));
        await openSearch();
        await page.getByRole("group", { name: "Notes récentes", exact: true }).getByRole("option").nth(7).waitFor();
        assert.equal(await page.getByRole("group", { name: "Notes récentes", exact: true }).getByRole("option").count(), 8);
        const query = page.getByRole("combobox", { name: "Rechercher dans toutes les notes", exact: true });
        await assertSearchSize(query);
        const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute("content");
        assert.ok(!/user-scalable\s*=\s*(no|0)/i.test(viewportMeta), "Zoom utilisateur désactivé");
        const maximumScale = viewportMeta.match(/maximum-scale\s*=\s*([\d.]+)/i);
        assert.ok(!maximumScale || Number(maximumScale[1]) >= 2, "Zoom utilisateur limité");
        await query.fill("paragraphe");
        assert.equal(await page.locator("#command-results [role=option]").count(), 20);
        await page.getByRole("button", { name: /Afficher les autres résultats/ }).click();
        assert.equal(await page.locator("#command-results [role=option]").count(), 40);
        await page.getByRole("button", { name: /Afficher les autres résultats/ }).click();
        assert.equal(await page.locator("#command-results [role=option]").count(), 60);
        await query.fill("archives d'ete");
        assert.equal(await page.locator("#command-results [role=option]").count(), 1);
        const excerpt = await page.locator("#command-results").innerText();
        assert.ok(!excerpt.includes(imageId) && !excerpt.includes("capsule-image"));
        await query.press("Enter");
        await page.locator(".detail-header").getByRole("heading", { name: "Archives d’été", exact: true }).waitFor();
        if (mobile) assert.equal(await page.locator(".mobile-navigation").getByRole("button", { name: "Liste", exact: true }).getAttribute("aria-current"), "page");
        else assert.equal(await page.locator(".view-switcher").getByRole("button", { name: "Liste", exact: true }).getAttribute("aria-pressed"), "true");
        await page.locator(".detail-footer").getByRole("button", { name: "Plus", exact: false }).click();
        const actions = page.getByRole("dialog", { name: "Actions de la note", exact: true });
        for (const name of ["Dupliquer", "Imprimer / PDF", "Copier le contenu", "Ajouter un tag", "Activer le partage", "Supprimer…"]) {
          await actions.getByRole("button", { name, exact: true }).waitFor();
        }
        await actions.getByRole("button", { name: "Fermer", exact: true }).click();
        await page.locator(".detail-footer").getByRole("button", { name: "Modifier", exact: true }).click();
        const editor = page.getByRole("dialog", { name: "Modifier la note", exact: true });
        await editor.waitFor();
        const title = editor.getByRole("textbox", { name: "Titre de la note", exact: true });
        const content = editor.getByRole("textbox", { name: "Contenu Markdown", exact: true });
        const draft = "Texte de recette conservé après une erreur.";
        await content.fill(draft);
        assert.ok(await page.evaluate(() => { const event = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; }));
        await content.press("Escape");
        const exit = page.getByRole("dialog", { name: "Quitter sans enregistrer ?", exact: true });
        await exit.waitFor();
        await exit.getByRole("button", { name: "Continuer l’édition", exact: true }).click();
        assert.equal(await content.inputValue(), draft);
        if (mobile || tablet) {
          await page.evaluate(() => {
            const viewport = window.visualViewport;
            Object.defineProperty(viewport, "height", { configurable: true, value: Math.min(420, window.innerHeight - 120) });
            Object.defineProperty(viewport, "offsetTop", { configurable: true, value: 20 });
            viewport.dispatchEvent(new Event("resize"));
          });
          // Attendre le frame de mise en page, y compris les transitions réduites.
          try {
            await page.waitForFunction(() => {
              const overlay = document.querySelector(".note-editor-overlay");
              return Math.abs(overlay.getBoundingClientRect().height - window.visualViewport.height) <= 1
                && Math.abs(parseFloat(getComputedStyle(overlay).top) - window.visualViewport.offsetTop) <= 1;
            });
          } catch {
            const metrics = await page.evaluate(() => ({
              innerWidth: window.innerWidth, innerHeight: window.innerHeight, touches: navigator.maxTouchPoints,
              coarse: window.matchMedia("(pointer: coarse)").matches,
              scale: window.visualViewport.scale, visualHeight: window.visualViewport.height,
              overlayHeight: document.querySelector(".note-editor-overlay").getBoundingClientRect().height,
              top: getComputedStyle(document.querySelector(".note-editor-overlay")).top,
              assignedHeight: document.querySelector(".note-editor-overlay").style.getPropertyValue("--note-editor-height"),
            }));
            throw new Error("Viewport non ajusté : " + JSON.stringify({ engineName, viewport, metrics }));
          }
          // Comparer le bouton et le viewport dans le même repère de layout.
          const saveBox = await editor.locator(".note-editor-save").evaluate((button) => {
            const box = button.getBoundingClientRect();
            return { y: box.top, height: box.height };
          });
          const visualBottom = await page.evaluate(() => window.visualViewport.height + window.visualViewport.offsetTop);
          const viewportMetrics = await page.evaluate(() => ({
            width: window.innerWidth, height: window.innerHeight, scale: window.visualViewport.scale,
            visualHeight: window.visualViewport.height, offset: window.visualViewport.offsetTop,
            editorTop: document.querySelector(".note-editor-overlay").style.top,
            editorHeight: document.querySelector(".note-editor-overlay").style.getPropertyValue("--note-editor-height"),
            overlayTop: document.querySelector(".note-editor-overlay").getBoundingClientRect().top,
            overlayHeight: document.querySelector(".note-editor-overlay").getBoundingClientRect().height,
            computedTop: getComputedStyle(document.querySelector(".note-editor-overlay")).top,
            scrollY: window.scrollY,
          }));
          assert.ok(saveBox.y >= viewportMetrics.offset - 1 && saveBox.y + saveBox.height <= visualBottom + 1,
            "Sauvegarde masquée dans le viewport réduit : " + JSON.stringify({ saveBox, viewportMetrics }));
        }
        await title.fill("Archives d’été — modifiées");
        await editor.locator(".note-editor-save").evaluate((button) => { button.click(); button.click(); });
        await editor.getByRole("button", { name: "Réessayer", exact: true }).waitFor();
        assert.equal(writes, 1, "Double envoi pendant une sauvegarde");
        assert.equal(await content.inputValue(), draft);
        assert.equal(await title.inputValue(), "Archives d’été — modifiées");
        await editor.getByRole("button", { name: "Réessayer", exact: true }).click();
        await editor.waitFor({ state: "hidden" });
        await page.locator(".detail-body").getByText(draft, { exact: true }).waitFor();
        assert.equal(writes, 2);
        assert.equal(await page.evaluate(() => { const event = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; }), false);
        if (mobile || tablet) {
          await page.evaluate(() => { delete window.visualViewport.height; delete window.visualViewport.offsetTop; window.visualViewport.dispatchEvent(new Event("resize")); });
        }
        if (mobile) {
          await page.getByRole("button", { name: "← Notes", exact: true }).click();
        }
        const beforeEmptySearch = await list.evaluate((node) => ({
          width: node.getBoundingClientRect().width, top: node.scrollTop,
          itemWidth: node.querySelector(".note-item").getBoundingClientRect().width,
          scale: window.visualViewport?.scale || 1,
        }));
        await openSearch();
        assert.equal(await query.inputValue(), "archives d'ete");
        await page.getByRole("button", { name: "Effacer la recherche", exact: true }).click();
        assert.equal(await query.inputValue(), "");
        assert.equal(await page.getByRole("group", { name: "Notes récentes", exact: true }).getByRole("option").count(), 8);
        await assertSearchSize(query);
        await page.getByRole("button", { name: "Fermer la recherche", exact: true }).click();
        await page.waitForFunction((before) => {
          const node = document.querySelector(".panel-left-scroll");
          return Math.abs(node.scrollTop - before.top) <= 2
            && Math.abs(node.getBoundingClientRect().width - before.width) <= 1;
        }, beforeEmptySearch);
        const afterEmptySearch = await list.evaluate((node) => ({
          itemWidth: node.querySelector(".note-item").getBoundingClientRect().width,
          scale: window.visualViewport?.scale || 1,
          pageWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth,
        }));
        assert.equal(afterEmptySearch.itemWidth, beforeEmptySearch.itemWidth, "Notes agrandies après effacement et retour");
        assert.equal(afterEmptySearch.scale, beforeEmptySearch.scale, "Échelle modifiée après effacement et retour");
        assert.ok(afterEmptySearch.pageWidth <= afterEmptySearch.viewportWidth + 1, "Débordement après recherche vide");
        assert.equal(await page.getByRole("textbox", { name: "Rechercher dans les notes", exact: true }).inputValue(), "");
        await page.getByRole("button", { name: "Plus d'actions", exact: true }).click();
        await page.getByRole("menuitem", { name: "Thème sombre", exact: true }).click();
        const width = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, expected: window.innerWidth }));
        assert.ok(width.actual <= width.expected + 1, "Débordement horizontal");
        let extraViews = false;
        let pendingImage = false;
        if (viewport.width === 390 || viewport.width === 1416) {
          const switcher = page.locator(mobile ? ".mobile-navigation" : ".view-switcher");
          await switcher.getByRole("button", { name: "Cartes", exact: true }).click();
          await assertSearchSize(page.getByRole("textbox", { name: "Rechercher dans les notes", exact: true }));
          await page.locator(".note-card-actions").getByRole("button", { name: "Modifier", exact: true }).first().click();
          const cardEditor = page.getByRole("dialog", { name: "Modifier la note", exact: true });
          await cardEditor.waitFor();
          await cardEditor.getByRole("button", { name: "Quitter l’édition", exact: true }).click();
          await cardEditor.waitFor({ state: "hidden" });
          await switcher.getByRole("button", { name: "Kanban", exact: true }).click();
          await assertSearchSize(page.getByRole("textbox", { name: "Rechercher dans les notes", exact: true }));
          await page.locator(".kanban-card").first().click();
          const reading = page.locator(".modal-content").filter({ has: page.locator("#note-detail-title") });
          await reading.getByRole("button", { name: "Modifier", exact: true }).click();
          const nestedEditor = page.getByRole("dialog", { name: "Modifier la note", exact: true });
          await nestedEditor.waitFor();
          const png = await page.evaluate(() => {
            const canvas = document.createElement("canvas");
            canvas.width = 8; canvas.height = 8;
            const drawing = canvas.getContext("2d");
            drawing.fillStyle = "#5b2eff"; drawing.fillRect(0, 0, 8, 8);
            return canvas.toDataURL("image/png").split(",")[1];
          });
          await nestedEditor.locator('input[type="file"]').setInputFiles({ name: "fixture.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
          await nestedEditor.getByRole("button", { name: "Agrandir fixture", exact: true }).waitFor();
          assert.equal(writes, 2, "L'image en attente ne doit pas être envoyée");
          await nestedEditor.getByRole("button", { name: "Agrandir fixture", exact: true }).click();
          const gallery = page.getByRole("dialog", { name: "Visionneuse d'images", exact: true });
          await gallery.waitFor();
          await gallery.getByRole("button", { name: "Fermer la visionneuse", exact: true }).press("Escape");
          await gallery.waitFor({ state: "hidden" });
          assert.equal(await page.getByRole("dialog", { name: "Quitter sans enregistrer ?", exact: true }).count(), 0);
          await nestedEditor.getByRole("button", { name: "Quitter l’édition", exact: true }).click();
          await page.getByRole("dialog", { name: "Quitter sans enregistrer ?", exact: true }).getByRole("button", { name: "Quitter sans enregistrer", exact: true }).click();
          await nestedEditor.waitFor({ state: "hidden" });
          await reading.getByRole("button", { name: "Fermer la note", exact: true }).click();
          await reading.waitFor({ state: "hidden" });
          assert.equal(await page.locator(".app-shell").getAttribute("inert"), null);
          assert.equal(writes, 2);
          extraViews = true; pendingImage = true;
        }
        assert.deepEqual(errors, []);
        results.push({ engine: engineName, viewport, globalSearch: true, pagination: true, privateReferencesHidden: true,
          currentViewPreserved: true, scrollRestored: true, actionsAvailable: true, dirtyExitProtected: true,
          saveRetry: true, singleSubmission: true, keyboardViewport: mobile || tablet ? "synthetic" : "not-applicable", darkTheme: true, syntheticWrites: writes,
          extraViews, pendingImage, emptySearchReturn: true, touchSearchFont: mobile || tablet ? "at-least-16px" : "desktop", userZoomAllowed: true });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
console.log(JSON.stringify({ ok: true, scenarios: results.length, results }, null, 2));
