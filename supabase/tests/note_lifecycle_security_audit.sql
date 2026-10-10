-- Audit read-only : schéma, droits, RLS et Storage, sans aucune donnée de note.
with checks(check_name, passed) as (values
 ('lifecycle columns', (select count(*)=4 from information_schema.columns where table_schema='public' and table_name='notes' and column_name in('archived_at','deleted_at','purge_started_at','lifecycle_version'))),
 ('image operation markers', (select count(*)=2 from information_schema.columns where table_schema='public' and table_name='note_images' and column_name in('cleanup_started_at','upload_started_at'))),
 ('notes RLS', (select relrowsecurity from pg_class where oid='public.notes'::regclass)),
 ('images RLS', (select relrowsecurity from pg_class where oid='public.note_images'::regclass)),
 ('links RLS', (select relrowsecurity from pg_class where oid='public.notes_tags'::regclass)),
 ('no browser note DELETE', not has_table_privilege('authenticated','public.notes','DELETE') and not has_table_privilege('anon','public.notes','DELETE')),
 ('no browser TRUNCATE', not has_table_privilege('authenticated','public.notes','TRUNCATE') and not has_table_privilege('authenticated','public.notes_tags','TRUNCATE')),
 ('reserved column denied', not has_column_privilege('authenticated','public.notes','deleted_at','UPDATE') and not has_column_privilege('authenticated','public.notes','archived_at','UPDATE') and not has_column_privilege('authenticated','public.notes','purge_started_at','UPDATE') and not has_column_privilege('authenticated','public.notes','lifecycle_version','UPDATE')),
 ('content remains writable', has_column_privilege('authenticated','public.notes','contenu','UPDATE')),
 ('metadata DELETE denied', not has_table_privilege('authenticated','public.note_images','DELETE')),
 ('metadata markers denied', not has_column_privilege('authenticated','public.note_images','upload_started_at','INSERT') and not has_column_privilege('authenticated','public.note_images','cleanup_started_at','INSERT')),
 ('transition owner RPC', has_function_privilege('authenticated','public.transition_note_lifecycle(uuid,text,bigint)','EXECUTE') and not has_function_privilege('anon','public.transition_note_lifecycle(uuid,text,bigint)','EXECUTE')),
 ('purge server only', has_function_privilege('service_role','public.begin_note_purge(uuid,uuid,bigint)','EXECUTE') and not has_function_privilege('authenticated','public.begin_note_purge(uuid,uuid,bigint)','EXECUTE') and not has_function_privilege('anon','public.finish_note_purge(uuid,uuid)','EXECUTE')),
 ('cleanup server only', has_function_privilege('service_role','public.begin_note_image_cleanup(uuid,uuid,uuid[])','EXECUTE') and not has_function_privilege('authenticated','public.begin_note_image_cleanup(uuid,uuid,uuid[])','EXECUTE') and not has_function_privilege('authenticated','public.finish_note_image_cleanup(uuid,uuid,uuid[])','EXECUTE')),
 ('protected Storage DELETE', exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='note_images_storage_delete_unattached' and permissive='RESTRICTIVE')),
 ('reserved Storage upload', exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='note_images_storage_insert_live_note' and permissive='RESTRICTIVE')),
 ('trash update protected', exists(select 1 from pg_policies where schemaname='public' and tablename='notes' and cmd='UPDATE' and with_check like '%deleted_at IS NULL%' and with_check like '%purge_started_at IS NULL%')),
 ('content guard', exists(select 1 from pg_trigger where tgrelid='public.notes'::regclass and tgname='notes_pending_image_cleanup' and tgenabled='O')),
 ('bucket private', (select not public and file_size_limit=5242880 from storage.buckets where id='note-images')),
 ('RPC hardened paths', (select count(*)=8 and bool_and(p.prosecdef and 'search_path=pg_catalog'=any(p.proconfig)) from pg_proc p join pg_namespace s on s.oid=p.pronamespace where s.nspname='public' and p.proname in('guard_note_pending_image_cleanup','transition_note_lifecycle','begin_note_purge','finish_note_purge','begin_note_image_cleanup','finish_note_image_cleanup','prepare_note_images','finish_note_image_uploads')))
)
select count(*) as checks, count(*) filter(where passed) as passed,
 coalesce(jsonb_agg(check_name) filter(where passed is not true),'[]'::jsonb) as failures from checks;
