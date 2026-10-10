import { describe, expect, it } from "vitest";
import { getEditorViewport } from "../lib/editor-viewport";

describe("surface visible de l'éditeur mobile", () => {
  it("suit une réduction par le clavier sans changer le viewport du shell", () => {
    expect(getEditorViewport(844, 390, { height: 450, offsetTop: 80, scale: 1 })).toEqual({ height: 450, top: 80 });
  });
  it("conserve le repli CSS sur desktop, sans API et hors réduction", () => {
    expect(getEditorViewport(844, 1024, { height: 450, scale: 1 })).toBeNull();
    expect(getEditorViewport(844, 390, null)).toBeNull();
    expect(getEditorViewport(844, 390, { height: 820, scale: 1 })).toBeNull();
  });
  it("ne force pas le zoom et rejette une mesure inutilisable", () => {
    expect(getEditorViewport(844, 390, { height: 450, scale: 2 })).toBeNull();
    expect(getEditorViewport(844, 390, { height: 0, scale: 1 })).toBeNull();
  });
  it("adapte aussi une tablette tactile avec une largeur de desktop", () => {
    expect(getEditorViewport(768, 1024, { height: 420, offsetTop: 20, scale: 1 }, { touch: true }))
      .toEqual({ height: 420, top: 20 });
  });
});
