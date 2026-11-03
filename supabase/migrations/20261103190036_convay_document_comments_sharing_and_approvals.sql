-- Existing document repository also stores comments, access and review steps.
-- Treat them as real server-authorized entity types, not browser-only arrays.
insert into convay_private.registry_types
(entity_key,read_permission,create_permission,update_permission,delete_permission)
values
 ('bms.doc.comments','doc_view','doc_comment','doc_comment','doc_comment'),
 ('bms.doc.access','doc_view','doc_share','doc_share','doc_share'),
 ('bms.doc.approvals','doc_view','doc_review','doc_approve','doc_review')
on conflict (entity_key) do nothing;
