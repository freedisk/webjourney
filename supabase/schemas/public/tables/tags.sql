CREATE TABLE "public"."tags" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "nom"        text                     NOT NULL,
  "couleur"    text                     NOT NULL DEFAULT '#6366f1'::text,
  "user_id"    uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "tags_pkey" PRIMARY KEY (id),
  CONSTRAINT "tags_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE "public"."tags"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs créent leurs tags" ON "public"."tags"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Les utilisateurs modifient leurs tags" ON "public"."tags"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Les utilisateurs suppriment leurs tags" ON "public"."tags"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Les utilisateurs voient leurs tags" ON "public"."tags"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tags" TO "anon", "authenticated", "postgres", "service_role";
