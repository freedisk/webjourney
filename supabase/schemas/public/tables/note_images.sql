CREATE TABLE "public"."note_images" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "note_id"       uuid                     NOT NULL,
  "storage_path"  text                     NOT NULL,
  "original_name" text                     NOT NULL,
  "mime_type"     text                     NOT NULL,
  "size_bytes"    bigint                   NOT NULL,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "note_images_mime_type_check" CHECK ((mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text]))),
  CONSTRAINT "note_images_pkey" PRIMARY KEY (id),
  CONSTRAINT "note_images_size_bytes_check" CHECK (((size_bytes > 0) AND (size_bytes <= 5242880))),
  CONSTRAINT "note_images_storage_path_key" UNIQUE (storage_path),
  CONSTRAINT "note_images_note_id_fkey" FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE
);

ALTER TABLE "public"."note_images"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX note_images_note_id_idx ON public.note_images USING btree (note_id);

CREATE POLICY "note_images_delete_owner" ON "public"."note_images"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.notes
  WHERE ((notes.id = note_images.note_id) AND (notes.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "note_images_insert_owner" ON "public"."note_images"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.notes
  WHERE ((notes.id = note_images.note_id) AND (notes.user_id = ( SELECT auth.uid() AS uid))))) AND
    (storage_path = (((((( SELECT (auth.uid())::text AS uid) || '/'::text) || (note_id)::text) || '/'::text) || (id)::text) ||
CASE mime_type
    WHEN 'image/jpeg'::text THEN '.jpg'::text
    WHEN 'image/png'::text THEN '.png'::text
    WHEN 'image/webp'::text THEN '.webp'::text
    ELSE NULL::text
END))));

CREATE POLICY "note_images_select_owner" ON "public"."note_images"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.notes
  WHERE ((notes.id = note_images.note_id) AND (notes.user_id = ( SELECT auth.uid() AS uid))))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."note_images" TO "postgres", "service_role";

COMMENT ON TABLE "public"."note_images" IS 'Métadonnées des images privées intégrées au contenu Markdown des notes.';

REVOKE ALL ON TABLE "public"."note_images" FROM "authenticated";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."note_images" TO "authenticated";
