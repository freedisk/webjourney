import { describe, expect, it } from "vitest";
import { isolateBodyContent } from "../lib/modal-isolation";

function element(tagName = "DIV", attributes = {}, inert = false) {
  const values = new Map(Object.entries(attributes));
  if (inert) values.set("inert", "");
  return {
    tagName,
    inert,
    parentElement: null,
    hasAttribute: (name) => values.has(name),
    getAttribute: (name) => values.get(name) ?? null,
    setAttribute: (name, value) => values.set(name, String(value)),
    removeAttribute: (name) => values.delete(name),
  };
}

function documentWith(...children) {
  const body = { children };
  for (const child of children) child.parentElement = body;
  return { body };
}

describe("isolation modale", () => {
  it("rend les autres racines inertes sans masquer la modale active", () => {
    const application = element();
    const modal = element();
    const script = element("SCRIPT");
    const browserDocument = documentWith(application, modal, script);

    const restore = isolateBodyContent(modal, browserDocument);

    expect(application.inert).toBe(true);
    expect(application.hasAttribute("inert")).toBe(true);
    expect(application.getAttribute("aria-hidden")).toBe("true");
    expect(modal.inert).toBe(false);
    expect(script.inert).toBe(false);
    restore();
  });

  it("restaure exactement les états antérieurs et reste idempotent", () => {
    const application = element("DIV", { "aria-hidden": "false" }, true);
    const modal = element();
    const browserDocument = documentWith(application, modal);

    const restore = isolateBodyContent(modal, browserDocument);
    restore();
    restore();

    expect(application.inert).toBe(true);
    expect(application.hasAttribute("inert")).toBe(true);
    expect(application.getAttribute("aria-hidden")).toBe("false");
  });

  it("ne modifie rien si la racine active n'est pas montée dans body", () => {
    const application = element();
    const detachedModal = element();
    const browserDocument = documentWith(application);

    isolateBodyContent(detachedModal, browserDocument)();

    expect(application.inert).toBe(false);
    expect(application.hasAttribute("aria-hidden")).toBe(false);
  });
});
