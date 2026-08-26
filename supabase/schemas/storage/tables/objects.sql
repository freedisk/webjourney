CREATE POLICY "note_images_storage_delete_owner" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'note-images'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid)) AND (EXISTS ( SELECT 1
   FROM public.notes
  WHERE (((notes.id)::text = (storage.foldername(objects.name))[2]) AND (notes.user_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "note_images_storage_insert_owner" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'note-images'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid)) AND (EXISTS ( SELECT 1
   FROM public.notes
  WHERE (((notes.id)::text = (storage.foldername(objects.name))[2]) AND (notes.user_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "note_images_storage_select_owner" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'note-images'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid)) AND (EXISTS ( SELECT 1
   FROM public.notes
  WHERE (((notes.id)::text = (storage.foldername(objects.name))[2]) AND (notes.user_id = ( SELECT auth.uid() AS uid)))))));
