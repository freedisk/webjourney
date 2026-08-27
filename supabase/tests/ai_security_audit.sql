-- Audit read-only AI-001. Ne retourne jamais de secret ni d'identifiant utilisateur.

with checks(check_name, ok) as (
  values
    (
      'extension supabase_vault',
      exists (select 1 from pg_extension where extname = 'supabase_vault')
    ),
    (
      'tables AI-001',
      to_regclass('public.user_ai_settings') is not null
        and to_regclass('public.ai_rate_limits') is not null
    ),
    (
      'colonnes user_ai_settings',
      (
        select array_agg(column_name::text order by ordinal_position)
        from information_schema.columns
        where table_schema = 'public' and table_name = 'user_ai_settings'
      ) = array[
        'user_id', 'provider', 'model_id', 'vault_secret_id', 'created_at',
        'updated_at'
      ]::text[]
    ),
    (
      'RLS force sur tables IA',
      (
        select count(*) = 2 and bool_and(relrowsecurity) and bool_and(relforcerowsecurity)
        from pg_class
        join pg_namespace on pg_namespace.oid = pg_class.relnamespace
        where pg_namespace.nspname = 'public'
          and pg_class.relname in ('user_ai_settings', 'ai_rate_limits')
      )
    ),
    (
      'aucun grant navigateur sur tables IA',
      not exists (
        select 1
        from information_schema.role_table_grants
        where table_schema = 'public'
          and table_name in ('user_ai_settings', 'ai_rate_limits')
          and grantee in ('anon', 'authenticated', 'PUBLIC')
      )
    ),
    (
      'RPC secrets interdites au navigateur',
      not has_function_privilege('anon', 'public.store_user_ai_credential(uuid,text,text)', 'execute')
        and not has_function_privilege('authenticated', 'public.store_user_ai_credential(uuid,text,text)', 'execute')
        and not has_function_privilege('anon', 'public.get_user_ai_credential(uuid)', 'execute')
        and not has_function_privilege('authenticated', 'public.get_user_ai_credential(uuid)', 'execute')
        and not has_function_privilege('anon', 'public.delete_user_ai_credential(uuid)', 'execute')
        and not has_function_privilege('authenticated', 'public.delete_user_ai_credential(uuid)', 'execute')
    ),
    (
      'RPC serveur disponibles au service_role',
      has_function_privilege('service_role', 'public.store_user_ai_credential(uuid,text,text)', 'execute')
        and has_function_privilege('service_role', 'public.get_user_ai_credential(uuid)', 'execute')
        and has_function_privilege('service_role', 'public.delete_user_ai_credential(uuid)', 'execute')
        and has_function_privilege('service_role', 'public.consume_ai_quota(uuid)', 'execute')
    ),
    (
      'trigger de purge Vault',
      exists (
        select 1
        from pg_trigger
        where tgrelid = 'public.user_ai_settings'::regclass
          and tgname = 'user_ai_settings_cleanup_vault_secret'
          and not tgisinternal
      )
    ),
    (
      'aucune policy navigateur sur tables IA',
      not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename in ('user_ai_settings', 'ai_rate_limits')
      )
    )
)
select check_name, ok
from checks
order by check_name;
