-- Photographie de schéma uniquement ; aucun contenu de note ou secret Vault.
select jsonb_build_object(
  'captured_at', clock_timestamp(),
  'engine', version(),
  'columns', (select jsonb_agg(c order by table_name,ordinal_position)
    from information_schema.columns c where table_schema='public'),
  'constraints', (select jsonb_agg(jsonb_build_object('table',r.relname,'name',c.conname,
    'definition',pg_get_constraintdef(c.oid,true)) order by r.relname,c.conname)
    from pg_constraint c join pg_class r on r.oid=c.conrelid
    join pg_namespace s on s.oid=r.relnamespace where s.nspname='public'),
  'indexes', (select jsonb_agg(i order by tablename,indexname) from pg_indexes i where schemaname='public'),
  'policies', (select jsonb_agg(p order by schemaname,tablename,policyname) from pg_policies p
    where schemaname='public' or (schemaname='storage' and policyname like 'note_images_%')),
  'grants', (select jsonb_agg(g order by table_name,grantee,privilege_type)
    from information_schema.table_privileges g where table_schema='public'),
  'column_grants', (select jsonb_agg(g order by table_name,column_name,grantee,privilege_type)
    from information_schema.column_privileges g where table_schema='public'),
  'functions', (select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,
    'definition',pg_get_functiondef(p.oid),'acl',p.proacl) order by p.proname)
    from pg_proc p join pg_namespace s on s.oid=p.pronamespace
    where s.nspname='public' and p.prokind='f'),
  'triggers', (select jsonb_agg(jsonb_build_object('table',r.relname,
    'name',t.tgname,'definition',pg_get_triggerdef(t.oid,true)) order by r.relname,t.tgname)
    from pg_trigger t join pg_class r on r.oid=t.tgrelid
    join pg_namespace s on s.oid=r.relnamespace where s.nspname='public' and not t.tgisinternal)
) as schema_snapshot;
