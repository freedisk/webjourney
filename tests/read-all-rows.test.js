import { expect, it, vi } from "vitest";
import { readAllRows } from "../lib/read-all-rows.js";
it("charge aussi les notes et associations au-delà de la première page", async () => {
  const corpus = Array.from({ length: 1051 }, (_, id) => ({ id }));
  const range = vi.fn(async (start, end) => ({ data: corpus.slice(start, end + 1), error: null }));
  expect((await readAllRows(() => ({ range }))).data).toEqual(corpus);
  expect(range).toHaveBeenCalledTimes(3);
});
it("ne publie pas un corpus incomplet après une erreur sur une page", async () => {
  const range = vi.fn().mockResolvedValueOnce({ data: [{ id: 1 }], error: null }).mockResolvedValueOnce({ error: { code: "test" } });
  expect(await readAllRows(() => ({ range }), 1)).toEqual({ data: null, error: { code: "test" } });
});
