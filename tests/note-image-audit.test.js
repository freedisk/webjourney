import { describe, expect, it } from "vitest";
import { classifyImageIntegrity } from "../lib/note-image-audit.mjs";
import { createImageReference } from "../lib/note-images.js";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NOTE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const IMAGE_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_IMAGE_ID = "22222222-2222-4222-8222-222222222222";

function imageRow(id = IMAGE_ID) {
  return {
    id,
    note_id: NOTE_ID,
    storage_path: `${USER_ID}/${NOTE_ID}/${id}.png`,
    mime_type: "image/png",
  };
}

describe("audit d'intégrité des images", () => {
  it("confirme un triplet Markdown, métadonnée et objet cohérent", () => {
    const image = imageRow();
    const result = classifyImageIntegrity({
      notes: [{
        id: NOTE_ID,
        user_id: USER_ID,
        contenu: createImageReference(IMAGE_ID),
      }],
      metadata: [image],
      storagePaths: [image.storage_path],
    });

    expect(result.clean).toBe(true);
    expect(Object.values(result.counts)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("classe chaque type d'orphelin sans effectuer de suppression", () => {
    const metadataWithoutObject = imageRow();
    const unreferencedMetadata = imageRow(SECOND_IMAGE_ID);
    const unexpectedStoragePath = `${USER_ID}/${NOTE_ID}/orphan.png`;
    const missingMetadataId = "33333333-3333-4333-8333-333333333333";
    const result = classifyImageIntegrity({
      notes: [{
        id: NOTE_ID,
        user_id: USER_ID,
        contenu: [
          createImageReference(IMAGE_ID),
          createImageReference(missingMetadataId),
        ].join("\n"),
      }],
      metadata: [metadataWithoutObject, unreferencedMetadata],
      storagePaths: [unreferencedMetadata.storage_path, unexpectedStoragePath],
    });

    expect(result.clean).toBe(false);
    expect(result.findings.metadataWithoutObject).toEqual([IMAGE_ID]);
    expect(result.findings.objectsWithoutMetadata).toEqual([unexpectedStoragePath]);
    expect(result.findings.metadataWithoutReference).toEqual([SECOND_IMAGE_ID]);
    expect(result.findings.referencesWithoutMetadata).toEqual([
      `${NOTE_ID}:${missingMetadataId}`,
    ]);
  });
});
