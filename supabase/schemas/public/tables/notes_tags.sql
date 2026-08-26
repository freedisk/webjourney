CREATE TABLE "public"."notes_tags" (
  "note_id" uuid NOT NULL,
  "tag_id"  uuid NOT NULL,
  CONSTRAINT "notes_tags_note_id_fkey" FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE,
  CONSTRAINT "notes_tags_pkey" PRIMARY KEY (note_id, tag_id),
  CONSTRAINT "notes_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE
);

ALTER TABLE "public"."notes_tags"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs créent leurs liaisons" ON "public"."notes_tags"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((note_id IN ( SELECT notes.id
   FROM public.notes
  WHERE (notes.user_id = auth.uid()))));

CREATE POLICY "Les utilisateurs suppriment leurs liaisons" ON "public"."notes_tags"
  FOR DELETE
  TO PUBLIC
  USING ((note_id IN ( SELECT notes.id
   FROM public.notes
  WHERE (notes.user_id = auth.uid()))));

CREATE POLICY "Les utilisateurs voient leurs liaisons" ON "public"."notes_tags"
  FOR SELECT
  TO PUBLIC
  USING ((note_id IN ( SELECT notes.id
   FROM public.notes
  WHERE (notes.user_id = auth.uid()))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notes_tags" TO "anon", "authenticated", "postgres", "service_role";
