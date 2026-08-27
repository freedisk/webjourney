-- AI-001 : configuration Anthropic par utilisateur, secret chiffré et quota.
-- Cette migration est additive et n'altère aucune note, image ou politique existante.

create extension if not exists supabase_vault cascade;

-- Le Vault n'est jamais exposé aux rôles de la Data API. Les fonctions
-- SECURITY DEFINER ci-dessous constituent l'unique frontière de déchiffrement.
revoke all on schema vault from public, anon, authenticated, service_role;
revoke all on all tables in schema vault from public, anon, authenticated, service_role;
revoke all on all sequences in schema vault from public, anon, authenticated, service_role;
-- Ne pas révoquer globalement les fonctions internes de l'extension : certaines
-- primitives cryptographiques sont nécessaires à vault.create_secret().
-- L'absence d'USAGE sur le schéma et de droits sur ses relations suffit à
-- empêcher les rôles Data API d'accéder directement au Vault.

create table public.user_ai_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'anthropic' check (provider = 'anthropic'),
  model_id text not null check (
    model_id ~ '^claude-[a-z0-9][a-z0-9._-]{1,126}$'
  ),
  vault_secret_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default clock_timestamp(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default clock_timestamp()
);

alter table public.user_ai_settings enable row level security;
alter table public.user_ai_settings force row level security;
alter table public.ai_rate_limits enable row level security;
alter table public.ai_rate_limits force row level security;

revoke all on table public.user_ai_settings from public, anon, authenticated;
revoke all on table public.ai_rate_limits from public, anon, authenticated;
grant all on table public.user_ai_settings to service_role;
grant all on table public.ai_rate_limits to service_role;

create or replace function public.cleanup_user_ai_vault_secret()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  delete from vault.secrets where id = old.vault_secret_id;
  return old;
end;
$function$;

create trigger user_ai_settings_cleanup_vault_secret
before delete on public.user_ai_settings
for each row execute function public.cleanup_user_ai_vault_secret();

create or replace function public.store_user_ai_credential(
  p_user_id uuid,
  p_api_key text,
  p_model_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_secret_id uuid;
  v_secret_name text := 'capsule-anthropic-' || p_user_id::text;
begin
  if p_user_id is null then
    raise exception 'invalid user';
  end if;
  if p_api_key is null
    or length(p_api_key) < 20
    or length(p_api_key) > 256
    or p_api_key !~ '^sk-ant-[^[:space:]]+$'
  then
    raise exception 'invalid credential';
  end if;
  if p_model_id is null
    or p_model_id !~ '^claude-[a-z0-9][a-z0-9._-]{1,126}$'
  then
    raise exception 'invalid model';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  select settings.vault_secret_id
  into v_secret_id
  from public.user_ai_settings as settings
  where settings.user_id = p_user_id;

  if v_secret_id is null then
    select secrets.id
    into v_secret_id
    from vault.secrets as secrets
    where secrets.name = v_secret_name;
  end if;

  if v_secret_id is null then
    select vault.create_secret(
      p_api_key,
      v_secret_name,
      'Clé Anthropic chiffrée pour Capsule'
    ) into v_secret_id;
  else
    perform vault.update_secret(
      v_secret_id,
      p_api_key,
      v_secret_name,
      'Clé Anthropic chiffrée pour Capsule'
    );
  end if;

  insert into public.user_ai_settings (
    user_id,
    provider,
    model_id,
    vault_secret_id
  )
  values (p_user_id, 'anthropic', p_model_id, v_secret_id)
  on conflict (user_id) do update
  set provider = excluded.provider,
      model_id = excluded.model_id,
      vault_secret_id = excluded.vault_secret_id,
      updated_at = clock_timestamp();
end;
$function$;

create or replace function public.get_user_ai_credential(p_user_id uuid)
returns table(api_key text, model_id text)
language sql
security definer
set search_path = ''
stable
as $function$
  select secrets.decrypted_secret, settings.model_id
  from public.user_ai_settings as settings
  join vault.decrypted_secrets as secrets
    on secrets.id = settings.vault_secret_id
  where settings.user_id = p_user_id
$function$;

create or replace function public.delete_user_ai_credential(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $function$
  delete from public.user_ai_settings where user_id = p_user_id
$function$;

create or replace function public.consume_ai_quota(p_user_id uuid)
returns table(
  allowed boolean,
  remaining_requests integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_window interval := interval '60 seconds';
  v_limit integer := 10;
  v_started_at timestamptz;
  v_count integer;
begin
  if p_user_id is null then
    raise exception 'invalid user';
  end if;

  insert into public.ai_rate_limits (
    user_id,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_user_id, v_now, 0, v_now)
  on conflict (user_id) do nothing;

  select limits.window_started_at, limits.request_count
  into v_started_at, v_count
  from public.ai_rate_limits as limits
  where limits.user_id = p_user_id
  for update;

  if v_started_at <= v_now - v_window then
    v_started_at := v_now;
    v_count := 1;
    update public.ai_rate_limits
    set window_started_at = v_started_at,
        request_count = v_count,
        updated_at = v_now
    where user_id = p_user_id;
    return query select true, v_limit - v_count, v_started_at + v_window;
    return;
  end if;

  if v_count >= v_limit then
    return query select false, 0, v_started_at + v_window;
    return;
  end if;

  v_count := v_count + 1;
  update public.ai_rate_limits
  set request_count = v_count,
      updated_at = v_now
  where user_id = p_user_id;
  return query select true, v_limit - v_count, v_started_at + v_window;
end;
$function$;

revoke all on function public.cleanup_user_ai_vault_secret()
  from public, anon, authenticated, service_role;
revoke all on function public.store_user_ai_credential(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.get_user_ai_credential(uuid)
  from public, anon, authenticated;
revoke all on function public.delete_user_ai_credential(uuid)
  from public, anon, authenticated;
revoke all on function public.consume_ai_quota(uuid)
  from public, anon, authenticated;

grant execute on function public.store_user_ai_credential(uuid, text, text)
  to service_role;
grant execute on function public.get_user_ai_credential(uuid)
  to service_role;
grant execute on function public.delete_user_ai_credential(uuid)
  to service_role;
grant execute on function public.consume_ai_quota(uuid)
  to service_role;

comment on table public.user_ai_settings is
  'Préférence de modèle et référence Vault du secret Anthropic par utilisateur.';
comment on table public.ai_rate_limits is
  'Fenêtre atomique de quota IA, sans contenu de note ni secret.';
