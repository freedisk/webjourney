const NON_INTERACTIVE_ROOTS = new Set(["SCRIPT", "STYLE", "LINK", "TEMPLATE"]);
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function getModalFocusable(panel, browserDocument = globalThis.document) {
  if (!panel) return [];
  const focusable = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR));
  for (const exemptRoot of Array.from(browserDocument?.querySelectorAll?.("[data-modal-exempt]") || [])) {
    focusable.push(...exemptRoot.querySelectorAll(FOCUSABLE_SELECTOR));
  }
  return [...new Set(focusable)].filter(
    (element) => element.getAttribute("aria-hidden") !== "true",
  );
}

export function isWithinModalFocus(panel, element) {
  return Boolean(
    panel?.contains(element) || element?.closest?.("[data-modal-exempt]"),
  );
}

export function isolateBodyContent(activeRoot, browserDocument = globalThis.document) {
  if (!activeRoot || !browserDocument?.body || activeRoot.parentElement !== browserDocument.body) {
    return () => {};
  }

  const isolated = [];
  for (const element of Array.from(browserDocument.body.children)) {
    if (
      element === activeRoot ||
      NON_INTERACTIVE_ROOTS.has(element.tagName) ||
      element.hasAttribute("data-modal-exempt")
    ) continue;
    isolated.push({
      element,
      inert: Boolean(element.inert),
      hadInert: element.hasAttribute("inert"),
      hadAriaHidden: element.hasAttribute("aria-hidden"),
      ariaHidden: element.getAttribute("aria-hidden"),
    });
    element.setAttribute("inert", "");
    if ("inert" in element) element.inert = true;
    element.setAttribute("aria-hidden", "true");
  }

  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    for (const entry of isolated) {
      if (entry.hadInert) {
        entry.element.setAttribute("inert", "");
      } else {
        entry.element.removeAttribute("inert");
      }
      if ("inert" in entry.element) entry.element.inert = entry.inert;
      if (entry.hadAriaHidden) {
        entry.element.setAttribute("aria-hidden", entry.ariaHidden);
      } else {
        entry.element.removeAttribute("aria-hidden");
      }
    }
  };
}
