-- Audit en lecture seule du contrat de schéma Capsule/Webjourney.
-- Exécution : npx supabase db query --linked --file supabase/tests/production_schema_audit.sql

with checks(check_name, ok) as (
  values
    (
      'table public.notes',
      to_regclass('public.notes') is not null
    ),
    (
      'colonnes public.notes',
      (
        select array_agg(column_name::text order by ordinal_position)
        from information_schema.columns
        where table_schema = 'public' and table_name = 'notes'
      ) = array[
        'id', 'created_at', 'user_id', 'titre', 'contenu', 'fait', 'resume',
        'couleur', 'epinglee', 'share_token', 'kanban_colonne', 'kanban_ordre'
      ]::text[]
    ),
    (
      'colonnes public.tags',
      (
        select array_agg(column_name::text order by ordinal_position)
        from information_schema.columns
        where table_schema = 'public' and table_name = 'tags'
      ) = array['id', 'nom', 'couleur', 'user_id', 'created_at']::text[]
    ),
    (
      'colonnes public.notes_tags',
      (
        select array_agg(column_name::text order by ordinal_position)
        from information_schema.columns
        where table_schema = 'public' and table_name = 'notes_tags'
      ) = array['note_id', 'tag_id']::text[]
    ),
    (
      'colonnes public.note_images',
      (
        select array_agg(column_name::text order by ordinal_position)
        from information_schema.columns
        where table_schema = 'public' and table_name = 'note_images'
      ) = array[
        'id', 'note_id', 'storage_path', 'original_name', 'mime_type',
        'size_bytes', 'created_at'
      ]::text[]
    ),
    (
      'RLS actif sur les tables applicatives',
      (
        select count(*) = 4 and bool_and(relrowsecurity)
        from pg_class
        join pg_namespace on pg_namespace.oid = pg_class.relnamespace
        where pg_namespace.nspname = 'public'
          and pg_class.relname in ('notes', 'tags', 'notes_tags', 'note_images')
      )
    ),
    (
      '15 policies sur les tables applicatives',
      (
        select count(*) = 15
        from pg_policies
        where schemaname = 'public'
          and tablename in ('notes', 'tags', 'notes_tags', 'note_images')
      )
    ),
    (
      '3 policies Storage images',
      (
        select count(*) = 3
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname in (
            'note_images_storage_select_owner',
            'note_images_storage_insert_owner',
            'note_images_storage_delete_owner'
          )
      )
    ),
    (
      'index note_images_note_id_idx',
      to_regclass('public.note_images_note_id_idx') is not null
    ),
    (
      'contraintes note_images',
      (
        select count(*) = 5
        from pg_constraint
        where conrelid = 'public.note_images'::regclass
          and conname in (
            'note_images_pkey',
            'note_images_note_id_fkey',
            'note_images_storage_path_key',
            'note_images_mime_type_check',
            'note_images_size_bytes_check'
          )
      )
    ),
    (
      'privilèges authenticated minimaux sur note_images',
      (
        select array_agg(
          distinct privilege_type::text order by privilege_type::text
        )
        from information_schema.role_table_grants
        where table_schema = 'public'
          and table_name = 'note_images'
          and grantee = 'authenticated'
      ) = array['DELETE', 'INSERT', 'SELECT']::text[]
    ),
    (
      'bucket note-images privé et borné',
      exists (
        select 1
        from storage.buckets
        where id = 'note-images'
          and name = 'note-images'
          and public = false
          and file_size_limit = 5242880
          and allowed_mime_types = array[
            'image/jpeg', 'image/png', 'image/webp'
          ]::text[]
      )
    )
)
select check_name, ok
from checks
order by check_name;
