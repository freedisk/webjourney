-- DATA-001 : archive, corbeille manuelle et nettoyage sérialisé des images.
-- Ajouter les droits protégés avant de livrer le client 1.2.0.
begin;

alter table public.notes
  add column archived_at timestamptz,
  add column deleted_at timestamptz,
  add column purge_started_at timestamptz,
  add column lifecycle_version bigint not null default 0,
  add constraint notes_lifecycle_version_positive check (lifecycle_version >= 0),
  add constraint notes_purge_requires_trash check (purge_started_at is null or deleted_at is not null),
  add constraint notes_trash_is_private check (deleted_at is null or share_token is null);

alter table public.note_images
  add column cleanup_started_at timestamptz,
  add column upload_started_at timestamptz;
create index notes_owner_lifecycle_idx on public.notes (user_id, deleted_at, archived_at);

-- Le navigateur conserve les mutations métier usuelles, jamais le DELETE
-- de note ni l'écriture directe des champs réservés au cycle de vie.
revoke all on public.notes from public, anon, authenticated;
grant select on public.notes to anon, authenticated;
grant insert (id, created_at, user_id, titre, contenu, fait, resume, couleur,
  epinglee, share_token, kanban_colonne, kanban_ordre) on public.notes to authenticated;
grant update (titre, contenu, fait, resume, couleur, epinglee, share_token,
  kanban_colonne, kanban_ordre) on public.notes to authenticated;
revoke all on public.notes_tags from public, anon, authenticated;
grant select, insert, delete on public.notes_tags to authenticated;
grant select on public.notes_tags to anon;

drop policy if exists "Les utilisateurs créent leurs notes" on public.notes;
create policy "Les utilisateurs créent leurs notes" on public.notes
  for insert to authenticated with check (
    user_id = (select auth.uid()) and deleted_at is null and archived_at is null
    and purge_started_at is null and lifecycle_version = 0
  );
drop policy if exists "Les utilisateurs modifient leurs notes" on public.notes;
create policy "Les utilisateurs modifient leurs notes" on public.notes
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and deleted_at is null and purge_started_at is null);
drop policy if exists "Les utilisateurs suppriment leurs notes" on public.notes;
drop policy if exists "notes partageables lisibles par tous" on public.notes;
create policy "notes partageables lisibles par tous" on public.notes for select
  to anon, authenticated using (share_token is not null and deleted_at is null and purge_started_at is null);

revoke all on public.note_images from public, anon, authenticated;
grant select on public.note_images to authenticated;
grant insert (id, note_id, storage_path, original_name, mime_type, size_bytes)
  on public.note_images to authenticated;

create policy note_images_insert_live_note on public.note_images as restrictive
  for insert to authenticated with check (
    exists (select 1 from public.notes n where n.id = note_id
      and n.user_id = (select auth.uid()) and n.deleted_at is null and n.purge_started_at is null)
    and cleanup_started_at is null and upload_started_at is null
  );

create policy notes_tags_insert_live_note on public.notes_tags as restrictive
  for insert to authenticated with check (
    exists (select 1 from public.notes n where n.id = note_id
      and n.user_id = (select auth.uid()) and n.deleted_at is null and n.purge_started_at is null)
    and exists (select 1 from public.tags t where t.id = tag_id and t.user_id = (select auth.uid()))
  );
create policy notes_tags_delete_live_note on public.notes_tags as restrictive
  for delete to authenticated using (
    exists (select 1 from public.notes n where n.id = note_id
      and n.user_id = (select auth.uid()) and n.deleted_at is null and n.purge_started_at is null)
  );

-- Les fichiers attachés sont protégés même contre un ancien client ouvert.
-- Un objet provisoire, sans métadonnée, reste nettoyable en compensation.
create policy note_images_storage_delete_unattached on storage.objects as restrictive
  for delete to authenticated using (
    bucket_id <> 'note-images'
    or not exists (select 1 from public.note_images i where i.storage_path = name)
  );
create policy note_images_storage_insert_live_note on storage.objects as restrictive
  for insert to authenticated with check (
    bucket_id <> 'note-images'
    or exists (select 1 from public.notes n
      where n.id::text = (storage.foldername(name))[2]
        and n.user_id = (select auth.uid()) and n.deleted_at is null and n.purge_started_at is null
        and exists (select 1 from public.note_images i where i.note_id=n.id
          and i.storage_path=name and i.upload_started_at is not null and i.cleanup_started_at is null))
  );

create function public.guard_note_pending_image_cleanup()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
declare image_id text;
begin
  if tg_op = 'INSERT' or new.contenu is distinct from old.contenu then
    for image_id in select (regexp_matches(lower(coalesce(new.contenu,'')),
      '!\[[^]]*\]\(capsule-image/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)','g'))[1]
    loop
      if not exists (select 1 from public.note_images i
        where i.note_id = new.id and i.id = image_id::uuid
          and i.cleanup_started_at is null and i.upload_started_at is null
          and exists (select 1 from storage.objects o where o.bucket_id='note-images' and o.name=i.storage_path))
      then raise exception 'IMAGE_REFERENCE_UNAVAILABLE'; end if;
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_note_pending_image_cleanup() from public, anon, authenticated;
create trigger notes_pending_image_cleanup before insert or update on public.notes
  for each row execute function public.guard_note_pending_image_cleanup();

create function public.transition_note_lifecycle(
  p_note_id uuid, p_action text, p_expected_version bigint
) returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare n public.notes; already_done boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into n from public.notes where id = p_note_id and user_id = auth.uid() for update;
  if not found then raise exception 'NOTE_NOT_FOUND'; end if;
  if p_action is null or p_action not in ('archive', 'unarchive', 'trash', 'restore')
    or p_expected_version is null or p_expected_version < 0 or p_expected_version > 9007199254740991 then
    raise exception 'NOTE_ACTION_INVALID';
  end if;
  if n.purge_started_at is not null then raise exception 'NOTE_PURGE_IN_PROGRESS'; end if;
  if exists (select 1 from public.note_images where note_id = n.id
    and (cleanup_started_at is not null or upload_started_at is not null)) then
    raise exception 'NOTE_IMAGE_OPERATION_IN_PROGRESS';
  end if;
  already_done := case p_action
    when 'archive' then n.deleted_at is null and n.archived_at is not null
    when 'unarchive' then n.deleted_at is null and n.archived_at is null
    when 'trash' then n.deleted_at is not null
    when 'restore' then n.deleted_at is null
  end;
  if n.lifecycle_version <> p_expected_version then
    if not (already_done and n.lifecycle_version = p_expected_version + 1) then
      raise exception 'NOTE_VERSION_CONFLICT';
    end if;
  elsif not already_done then
    if p_action in ('archive', 'unarchive') and n.deleted_at is not null then
      raise exception 'NOTE_READ_ONLY';
    end if;
    update public.notes set
      archived_at = case when p_action = 'archive' then clock_timestamp()
        when p_action = 'unarchive' then null else archived_at end,
      deleted_at = case when p_action = 'trash' then clock_timestamp()
        when p_action = 'restore' then null else deleted_at end,
      share_token = case when p_action in ('trash', 'restore') then null else share_token end,
      lifecycle_version = lifecycle_version + 1
    where id = n.id returning * into n;
  end if;
  return jsonb_build_object('id', n.id, 'archived_at', n.archived_at,
    'deleted_at', n.deleted_at, 'purge_started_at', n.purge_started_at,
    'lifecycle_version', n.lifecycle_version, 'share_token', n.share_token);
end;
$$;
revoke all on function public.transition_note_lifecycle(uuid,text,bigint) from public, anon;
grant execute on function public.transition_note_lifecycle(uuid,text,bigint) to authenticated;

-- Les RPC serveur attendent l'identité déjà vérifiée par Auth, jamais le client.
create function public.begin_note_purge(p_note_id uuid, p_user_id uuid, p_expected_version bigint)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare n public.notes;
begin
  select * into n from public.notes where id = p_note_id and user_id = p_user_id for update;
  if not found then raise exception 'NOTE_NOT_FOUND'; end if;
  if n.deleted_at is null then raise exception 'NOTE_NOT_TRASH'; end if;
  if n.purge_started_at is null then
    if n.lifecycle_version <> p_expected_version or p_expected_version is null then
      raise exception 'NOTE_VERSION_CONFLICT';
    end if;
    if exists (select 1 from public.note_images where note_id = n.id
      and (cleanup_started_at is not null or upload_started_at is not null)) then
      raise exception 'NOTE_IMAGE_OPERATION_IN_PROGRESS';
    end if;
    update public.notes set purge_started_at = clock_timestamp(), lifecycle_version = lifecycle_version + 1
      where id = n.id returning * into n;
  end if;
  return jsonb_build_object('id', n.id, 'user_id', n.user_id, 'lifecycle_version', n.lifecycle_version);
end;
$$;
create function public.finish_note_purge(p_note_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog as $$
declare n public.notes;
begin
  select * into n from public.notes where id = p_note_id and user_id = p_user_id for update;
  if not found then return true; end if;
  if n.deleted_at is null or n.purge_started_at is null then raise exception 'NOTE_NOT_TRASH'; end if;
  delete from public.notes where id = n.id;
  return true;
end;
$$;
revoke all on function public.begin_note_purge(uuid,uuid,bigint) from public, anon, authenticated;
revoke all on function public.finish_note_purge(uuid,uuid) from public, anon, authenticated;
grant execute on function public.begin_note_purge(uuid,uuid,bigint) to service_role;
grant execute on function public.finish_note_purge(uuid,uuid) to service_role;

-- Le verrou de note sérialise le nettoyage et les déplacements interappareils.
create function public.begin_note_image_cleanup(p_note_id uuid, p_user_id uuid, p_image_ids uuid[])
returns setof public.note_images language plpgsql security definer set search_path = pg_catalog as $$
declare n public.notes; image_count integer;
begin
  select * into n from public.notes where id = p_note_id and user_id = p_user_id for update;
  if not found then raise exception 'NOTE_NOT_FOUND'; end if;
  if n.deleted_at is not null or n.purge_started_at is not null then raise exception 'NOTE_READ_ONLY'; end if;
  if coalesce(cardinality(p_image_ids),0) = 0 or cardinality(p_image_ids) > 1000 then
    raise exception 'IMAGE_REQUEST_INVALID';
  end if;
  select count(*) into image_count from public.note_images where note_id = n.id and id = any(p_image_ids);
  if image_count <> cardinality(p_image_ids) then raise exception 'IMAGE_REQUEST_INVALID'; end if;
  if exists (select 1 from public.note_images i where i.note_id = n.id and i.id = any(p_image_ids)
    and position('capsule-image/' || i.id::text in lower(coalesce(n.contenu,''))) > 0) then
    raise exception 'IMAGE_STILL_REFERENCED';
  end if;
  update public.note_images set cleanup_started_at = coalesce(cleanup_started_at,clock_timestamp())
    where note_id = n.id and id = any(p_image_ids);
  return query select * from public.note_images where note_id = n.id and id = any(p_image_ids);
end;
$$;
create function public.finish_note_image_cleanup(p_note_id uuid, p_user_id uuid, p_image_ids uuid[])
returns boolean language plpgsql security definer set search_path = pg_catalog as $$
declare n public.notes;
begin
  select * into n from public.notes where id = p_note_id and user_id = p_user_id for update;
  if not found then raise exception 'NOTE_NOT_FOUND'; end if;
  if n.deleted_at is not null or n.purge_started_at is not null then raise exception 'NOTE_READ_ONLY'; end if;
  if exists (select 1 from public.note_images i where i.note_id = n.id and i.id = any(p_image_ids)
    and (i.cleanup_started_at is null or position('capsule-image/' || i.id::text in lower(coalesce(n.contenu,''))) > 0)) then
    raise exception 'IMAGE_STILL_REFERENCED';
  end if;
  delete from public.note_images where note_id = n.id and id = any(p_image_ids) and cleanup_started_at is not null;
  return true;
end;
$$;
revoke all on function public.begin_note_image_cleanup(uuid,uuid,uuid[]) from public, anon, authenticated;
revoke all on function public.finish_note_image_cleanup(uuid,uuid,uuid[]) from public, anon, authenticated;
grant execute on function public.begin_note_image_cleanup(uuid,uuid,uuid[]) to service_role;
grant execute on function public.finish_note_image_cleanup(uuid,uuid,uuid[]) to service_role;

-- Réserver les images avant tout upload : un déplacement ne peut pas prendre
-- de vitesse une requête Storage encore en cours sur un autre appareil.
create function public.prepare_note_images(p_note_id uuid,p_images jsonb)
returns setof public.note_images language plpgsql security definer set search_path = pg_catalog as $$
declare n public.notes; r jsonb; image_uuid uuid; extension text; existing public.note_images;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into n from public.notes where id=p_note_id and user_id=auth.uid() for update;
  if not found then raise exception 'NOTE_NOT_FOUND'; end if;
  if n.deleted_at is not null or n.purge_started_at is not null then raise exception 'NOTE_READ_ONLY'; end if;
  if p_images is null or jsonb_typeof(p_images) <> 'array' then
    raise exception 'IMAGE_REQUEST_INVALID';
  end if;
  if jsonb_array_length(p_images) < 1 or jsonb_array_length(p_images) > 1000 then
    raise exception 'IMAGE_REQUEST_INVALID';
  end if;
  for r in select * from jsonb_array_elements(p_images) loop
    image_uuid := (r->>'id')::uuid;
    extension := case r->>'mime_type' when 'image/jpeg' then '.jpg'
      when 'image/png' then '.png' when 'image/webp' then '.webp' else null end;
    if extension is null or coalesce(length(r->>'original_name'),0)=0 or length(r->>'original_name')>512 then
      raise exception 'IMAGE_REQUEST_INVALID';
    end if;
    select * into existing from public.note_images where id=image_uuid for update;
    if found then
      if existing.note_id <> n.id or existing.cleanup_started_at is not null
        or existing.mime_type <> r->>'mime_type' or existing.size_bytes <> (r->>'size_bytes')::bigint then
        raise exception 'IMAGE_REQUEST_INVALID';
      end if;
    else
      insert into public.note_images(id,note_id,storage_path,original_name,mime_type,size_bytes,upload_started_at)
      values(image_uuid,n.id,n.user_id::text||'/'||n.id::text||'/'||image_uuid::text||extension,
        r->>'original_name',r->>'mime_type',(r->>'size_bytes')::bigint,clock_timestamp());
    end if;
  end loop;
  return query select * from public.note_images
    where note_id=n.id and id in (select (value->>'id')::uuid from jsonb_array_elements(p_images));
end;
$$;
create function public.finish_note_image_uploads(p_note_id uuid,p_image_ids uuid[])
returns setof public.note_images language plpgsql security definer set search_path = pg_catalog as $$
declare n public.notes; image_count integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into n from public.notes where id=p_note_id and user_id=auth.uid() for update;
  if not found then raise exception 'NOTE_NOT_FOUND'; end if;
  if n.deleted_at is not null or n.purge_started_at is not null then raise exception 'NOTE_READ_ONLY'; end if;
  if coalesce(cardinality(p_image_ids),0) = 0 or cardinality(p_image_ids) > 1000 then
    raise exception 'IMAGE_REQUEST_INVALID';
  end if;
  select count(*) into image_count from public.note_images where note_id=n.id and id=any(p_image_ids);
  if image_count <> cardinality(p_image_ids) then raise exception 'IMAGE_REQUEST_INVALID'; end if;
  if exists(select 1 from public.note_images i where i.note_id=n.id and i.id=any(p_image_ids)
    and (i.cleanup_started_at is not null or not exists(select 1 from storage.objects o
      where o.bucket_id='note-images' and o.name=i.storage_path)))
  then raise exception 'IMAGE_REFERENCE_UNAVAILABLE'; end if;
  update public.note_images set upload_started_at=null where note_id=n.id and id=any(p_image_ids);
  return query select * from public.note_images where note_id=n.id and id=any(p_image_ids);
end;
$$;
revoke all on function public.prepare_note_images(uuid,jsonb) from public,anon;
revoke all on function public.finish_note_image_uploads(uuid,uuid[]) from public,anon;
grant execute on function public.prepare_note_images(uuid,jsonb) to authenticated;
grant execute on function public.finish_note_image_uploads(uuid,uuid[]) to authenticated;

notify pgrst, 'reload schema';
commit;
