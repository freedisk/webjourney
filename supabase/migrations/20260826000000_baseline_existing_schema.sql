-- Baseline du schéma Capsule/Webjourney existant avant l'activation de
-- l'historique Supabase CLI.
--
-- Source : export déclaratif strict du projet lié yteconbqwmozpxjaxxey,
-- réalisé le 2026-08-26. Cette migration précède volontairement la migration
-- 20260826120000_add_note_images.sql, qui réaffirme la configuration images et
-- crée le bucket Storage (les lignes de storage.buckets ne font pas partie
-- d'un export de schéma).
--
-- Sur la production existante, cette version doit être marquée « applied »
-- avec `supabase migration repair`; elle ne doit pas y être rejouée.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

comment on schema public is 'standard public schema';

revoke all on schema public from public;
grant usage on schema public to public;
revoke all on schema public from anon;
grant usage on schema public to anon;
revoke all on schema public from authenticated;
grant usage on schema public to authenticated;
revoke all on schema public from pg_database_owner;
grant create, usage on schema public to pg_database_owner;
revoke all on schema public from postgres;
grant usage on schema public to postgres;
revoke all on schema public from service_role;
grant usage on schema public to service_role;

alter default privileges for role postgres in schema public
  grant select, update, usage on sequences to anon;
alter default privileges for role postgres in schema public
  grant select, update, usage on sequences to authenticated;
alter default privileges for role postgres in schema public
  grant select, update, usage on sequences to service_role;

alter default privileges for role postgres in schema public
  revoke all on functions from public;
alter default privileges for role postgres in schema public
  grant execute on functions to anon;
alter default privileges for role postgres in schema public
  grant execute on functions to authenticated;
alter default privileges for role postgres in schema public
  grant execute on functions to service_role;

alter default privileges for role postgres in schema public
  grant delete, insert, maintain, references, select, trigger, truncate, update
  on tables to anon;
alter default privileges for role postgres in schema public
  grant delete, insert, maintain, references, select, trigger, truncate, update
  on tables to authenticated;
alter default privileges for role postgres in schema public
  grant delete, insert, maintain, references, select, trigger, truncate, update
  on tables to service_role;

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name is not null
      and cmd.schema_name in ('public')
      and cmd.schema_name not in ('pg_catalog', 'information_schema')
      and cmd.schema_name not like 'pg_toast%'
      and cmd.schema_name not like 'pg_temp%'
    then
      begin
        execute format(
          'alter table if exists %s enable row level security',
          cmd.object_identity
        );
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %',
            cmd.object_identity;
      end;
    else
      raise log
        'rls_auto_enable: skip % (either system schema or not in enforced list: %.)',
        cmd.object_identity,
        cmd.schema_name;
    end if;
  end loop;
end;
$function$;

grant execute on function public.rls_auto_enable()
  to public, anon, authenticated, postgres, service_role;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade,
  titre text not null,
  contenu text,
  fait boolean default false,
  resume text,
  couleur text,
  epinglee boolean default false,
  share_token text,
  kanban_colonne text default 'todo',
  kanban_ordre integer default 0
);

alter table public.notes enable row level security;

drop policy if exists "Les utilisateurs créent leurs notes" on public.notes;
create policy "Les utilisateurs créent leurs notes"
  on public.notes
  for insert
  to public
  with check (auth.uid() = user_id);

drop policy if exists "Les utilisateurs modifient leurs notes" on public.notes;
create policy "Les utilisateurs modifient leurs notes"
  on public.notes
  for update
  to public
  using (auth.uid() = user_id);

drop policy if exists "Les utilisateurs suppriment leurs notes" on public.notes;
create policy "Les utilisateurs suppriment leurs notes"
  on public.notes
  for delete
  to public
  using (auth.uid() = user_id);

drop policy if exists "Les utilisateurs voient leurs notes" on public.notes;
create policy "Les utilisateurs voient leurs notes"
  on public.notes
  for select
  to public
  using (auth.uid() = user_id);

drop policy if exists "notes partageables lisibles par tous" on public.notes;
create policy "notes partageables lisibles par tous"
  on public.notes
  for select
  to public
  using (share_token is not null);

grant delete, insert, maintain, references, select, trigger, truncate, update
  on table public.notes to anon, authenticated, postgres, service_role;

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  couleur text not null default '#6366f1',
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.tags enable row level security;

drop policy if exists "Les utilisateurs créent leurs tags" on public.tags;
create policy "Les utilisateurs créent leurs tags"
  on public.tags
  for insert
  to public
  with check (auth.uid() = user_id);

drop policy if exists "Les utilisateurs modifient leurs tags" on public.tags;
create policy "Les utilisateurs modifient leurs tags"
  on public.tags
  for update
  to public
  using (auth.uid() = user_id);

drop policy if exists "Les utilisateurs suppriment leurs tags" on public.tags;
create policy "Les utilisateurs suppriment leurs tags"
  on public.tags
  for delete
  to public
  using (auth.uid() = user_id);

drop policy if exists "Les utilisateurs voient leurs tags" on public.tags;
create policy "Les utilisateurs voient leurs tags"
  on public.tags
  for select
  to public
  using (auth.uid() = user_id);

grant delete, insert, maintain, references, select, trigger, truncate, update
  on table public.tags to anon, authenticated, postgres, service_role;

create table if not exists public.notes_tags (
  note_id uuid not null references public.notes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (note_id, tag_id)
);

alter table public.notes_tags enable row level security;

drop policy if exists "Les utilisateurs créent leurs liaisons"
  on public.notes_tags;
create policy "Les utilisateurs créent leurs liaisons"
  on public.notes_tags
  for insert
  to public
  with check (
    note_id in (
      select notes.id
      from public.notes
      where notes.user_id = auth.uid()
    )
  );

drop policy if exists "Les utilisateurs suppriment leurs liaisons"
  on public.notes_tags;
create policy "Les utilisateurs suppriment leurs liaisons"
  on public.notes_tags
  for delete
  to public
  using (
    note_id in (
      select notes.id
      from public.notes
      where notes.user_id = auth.uid()
    )
  );

drop policy if exists "Les utilisateurs voient leurs liaisons"
  on public.notes_tags;
create policy "Les utilisateurs voient leurs liaisons"
  on public.notes_tags
  for select
  to public
  using (
    note_id in (
      select notes.id
      from public.notes
      where notes.user_id = auth.uid()
    )
  );

grant delete, insert, maintain, references, select, trigger, truncate, update
  on table public.notes_tags to anon, authenticated, postgres, service_role;
