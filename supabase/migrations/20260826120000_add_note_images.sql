-- Images privées intégrées aux notes Capsule.
-- La migration doit être appliquée avant de déployer le code applicatif associé.

create table if not exists public.note_images (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp')
  ),
  size_bytes bigint not null check (
    size_bytes > 0 and size_bytes <= 5242880
  ),
  created_at timestamptz not null default now()
);

create index if not exists note_images_note_id_idx
  on public.note_images(note_id);

alter table public.note_images enable row level security;

revoke all on table public.note_images from anon;
revoke all on table public.note_images from authenticated;
grant select, insert, delete on table public.note_images to authenticated;
grant all on table public.note_images to service_role;

drop policy if exists "note_images_select_owner" on public.note_images;
create policy "note_images_select_owner"
  on public.note_images
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.notes
      where notes.id = note_images.note_id
        and notes.user_id = (select auth.uid())
    )
  );

drop policy if exists "note_images_insert_owner" on public.note_images;
create policy "note_images_insert_owner"
  on public.note_images
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.notes
      where notes.id = note_images.note_id
        and notes.user_id = (select auth.uid())
    )
    and storage_path = (
      (select auth.uid()::text)
      || '/' || note_id::text
      || '/' || id::text
      || case mime_type
           when 'image/jpeg' then '.jpg'
           when 'image/png' then '.png'
           when 'image/webp' then '.webp'
         end
    )
  );

drop policy if exists "note_images_delete_owner" on public.note_images;
create policy "note_images_delete_owner"
  on public.note_images
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.notes
      where notes.id = note_images.note_id
        and notes.user_id = (select auth.uid())
    )
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'note-images',
  'note-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "note_images_storage_select_owner" on storage.objects;
create policy "note_images_storage_select_owner"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1
      from public.notes
      where notes.id::text = (storage.foldername(name))[2]
        and notes.user_id = (select auth.uid())
    )
  );

drop policy if exists "note_images_storage_insert_owner" on storage.objects;
create policy "note_images_storage_insert_owner"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1
      from public.notes
      where notes.id::text = (storage.foldername(name))[2]
        and notes.user_id = (select auth.uid())
    )
  );

drop policy if exists "note_images_storage_delete_owner" on storage.objects;
create policy "note_images_storage_delete_owner"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1
      from public.notes
      where notes.id::text = (storage.foldername(name))[2]
        and notes.user_id = (select auth.uid())
    )
  );

comment on table public.note_images is
  'Métadonnées des images privées intégrées au contenu Markdown des notes.';
