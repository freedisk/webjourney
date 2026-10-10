// N'ajuster que la feuille mobile lorsque le viewport visible est réellement réduit.
// Le zoom et les navigateurs sans VisualViewport conservent le repli CSS.
export function getEditorViewport(layoutHeight, layoutWidth, viewport, { touch = false } = {}) {
  if (!viewport || (layoutWidth >= 768 && !touch) || viewport.scale !== 1
    || !Number.isFinite(viewport.height) || viewport.height <= 0
    || viewport.height >= layoutHeight - 40) return null;
  return { height: viewport.height, top: Math.max(0, viewport.offsetTop || 0) };
}
