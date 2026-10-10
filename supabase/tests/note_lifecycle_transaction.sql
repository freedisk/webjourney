-- Recette synthétique uniquement, après la migration dans la même transaction.
-- L'appelant doit terminer par ROLLBACK. Aucun objet Storage réel n'est créé.
create temporary table capsule_lifecycle_results(check_name text, passed boolean);
grant select, insert on capsule_lifecycle_results to authenticated, anon;
insert into auth.users(id,aud,role,email) values
 ('10000000-0000-4000-8000-000000000001','authenticated','authenticated','capsule-lifecycle-test@example.invalid'),
 ('10000000-0000-4000-8000-000000000002','authenticated','authenticated','capsule-lifecycle-other@example.invalid');
insert into public.notes(id,user_id,titre,contenu,epinglee,share_token,kanban_colonne)
 values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
 'Recette synthétique Capsule','Texte de recette',true,'40000000-0000-4000-8000-000000000001','done');
insert into public.note_images(id,note_id,storage_path,original_name,mime_type,size_bytes)
 values ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001',
 '10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000002.webp','test.webp','image/webp',128);
insert into public.tags(id,user_id,nom,couleur) values('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Recette','#8b5cf6');
insert into public.notes_tags(note_id,tag_id) values('20000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$
declare r jsonb; n public.notes; denied boolean;
begin
  r := public.transition_note_lifecycle('20000000-0000-4000-8000-000000000001','archive',0);
  insert into capsule_lifecycle_results values('archive keeps sharing',r->>'archived_at' is not null and r->>'share_token' is not null);
  r := public.transition_note_lifecycle('20000000-0000-4000-8000-000000000001','archive',0);
  insert into capsule_lifecycle_results values('retry is idempotent',(r->>'lifecycle_version')::int=1);
  r := public.transition_note_lifecycle('20000000-0000-4000-8000-000000000001','trash',1);
  select * into n from public.notes where id='20000000-0000-4000-8000-000000000001';
  insert into capsule_lifecycle_results values('trash retains content and position',n.contenu='Texte de recette' and n.epinglee and n.kanban_colonne='done' and n.archived_at is not null and n.share_token is null);
  insert into capsule_lifecycle_results values('trash retains images and tags',exists(select 1 from public.note_images where note_id=n.id) and exists(select 1 from public.notes_tags where note_id=n.id));
  denied := false;
  begin update public.notes set titre='Interdit' where id=n.id; exception when insufficient_privilege then denied := true; end;
  insert into capsule_lifecycle_results values('trash cannot be edited',denied);
  denied := false;
  begin delete from public.notes where id=n.id; exception when insufficient_privilege then denied := true; end;
  insert into capsule_lifecycle_results values('legacy delete forbidden',denied);
  denied := false;
  begin update public.notes set deleted_at=null where id=n.id; exception when insufficient_privilege then denied := true; end;
  insert into capsule_lifecycle_results values('reserved fields protected',denied);
  r := public.transition_note_lifecycle(n.id,'restore',2);
  insert into capsule_lifecycle_results values('restore archive with sharing revoked',r->>'archived_at' is not null and r->>'deleted_at' is null and r->>'share_token' is null);
  denied := false;
  begin perform public.transition_note_lifecycle(n.id,'trash',1); exception when others then denied := sqlerrm='NOTE_VERSION_CONFLICT'; end;
  insert into capsule_lifecycle_results values('stale undo rejected',denied);
  perform public.prepare_note_images(n.id,'[{"id":"30000000-0000-4000-8000-000000000001","original_name":"test.webp","mime_type":"image/webp","size_bytes":128}]');
  denied := false;
  begin perform public.transition_note_lifecycle(n.id,'trash',3); exception when others then denied := sqlerrm='NOTE_IMAGE_OPERATION_IN_PROGRESS'; end;
  insert into capsule_lifecycle_results values('upload blocks transition',denied);
  denied := false;
  begin update public.notes set contenu='![Test](capsule-image/30000000-0000-4000-8000-000000000001)' where id=n.id; exception when others then denied := sqlerrm='IMAGE_REFERENCE_UNAVAILABLE'; end;
  insert into capsule_lifecycle_results values('unfinished upload cannot enter content',denied);
end $$;
reset role;
select public.begin_note_image_cleanup('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',array['30000000-0000-4000-8000-000000000001'::uuid]);
select public.finish_note_image_cleanup('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',array['30000000-0000-4000-8000-000000000001'::uuid]);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ declare denied boolean := false; begin
  begin perform public.transition_note_lifecycle('20000000-0000-4000-8000-000000000001','trash',3); exception when others then denied := sqlerrm='NOTE_NOT_FOUND'; end;
  insert into capsule_lifecycle_results values('other owner isolated',denied);
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.transition_note_lifecycle('20000000-0000-4000-8000-000000000001','trash',3);
reset role;
select public.begin_note_purge('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',4);
set local role authenticated;
do $$ declare denied boolean := false; begin
  begin perform public.transition_note_lifecycle('20000000-0000-4000-8000-000000000001','restore',5); exception when others then denied := sqlerrm='NOTE_PURGE_IN_PROGRESS'; end;
  insert into capsule_lifecycle_results values('purge blocks restore',denied);
end $$;
reset role;
select public.finish_note_purge('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');
insert into capsule_lifecycle_results values('purge completes',not exists(select 1 from public.notes where id='20000000-0000-4000-8000-000000000001'));
insert into capsule_lifecycle_results values('purge RPC server only',not has_function_privilege('authenticated','public.begin_note_purge(uuid,uuid,bigint)','EXECUTE') and has_function_privilege('service_role','public.begin_note_purge(uuid,uuid,bigint)','EXECUTE'));
insert into capsule_lifecycle_results values('metadata delete forbidden',not has_table_privilege('authenticated','public.note_images','DELETE'));
insert into capsule_lifecycle_results values('anonymous transition forbidden',not has_function_privilege('anon','public.transition_note_lifecycle(uuid,text,bigint)','EXECUTE'));
insert into capsule_lifecycle_results values('legacy truncate forbidden',not has_table_privilege('authenticated','public.notes','TRUNCATE') and not has_table_privilege('authenticated','public.notes_tags','TRUNCATE'));
do $$ begin if exists(select 1 from capsule_lifecycle_results where not passed or passed is null) then raise exception 'CAPSULE_LIFECYCLE_TEST_FAILED'; end if; end $$;
select count(*) as checks, bool_and(passed) as all_passed from capsule_lifecycle_results;
