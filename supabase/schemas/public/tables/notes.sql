CREATE TABLE "public"."notes" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"     timestamp with time zone DEFAULT now(),
  "user_id"        uuid,
  "titre"          text                     NOT NULL,
  "contenu"        text,
  "fait"           boolean                  DEFAULT false,
  "resume"         text,
  "couleur"        text,
  "epinglee"       boolean                  DEFAULT false,
  "share_token"    text,
  "kanban_colonne" text                     DEFAULT 'todo'::text,
  "kanban_ordre"   integer                  DEFAULT 0,
  CONSTRAINT "notes_pkey" PRIMARY KEY (id),
  CONSTRAINT "notes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE "public"."notes"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs créent leurs notes" ON "public"."notes"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Les utilisateurs modifient leurs notes" ON "public"."notes"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Les utilisateurs suppriment leurs notes" ON "public"."notes"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Les utilisateurs voient leurs notes" ON "public"."notes"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "notes partageables lisibles par tous" ON "public"."notes"
  FOR SELECT
  TO PUBLIC
  USING ((share_token IS NOT NULL));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notes" TO "anon", "authenticated", "postgres", "service_role";
