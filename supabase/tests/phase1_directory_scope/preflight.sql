-- Read-only preflight. Require three exact definitions and original ACL before formal activation.
SELECT p.proname, md5(pg_get_functiondef(p.oid)) AS actual_md5, CASE p.proname
 WHEN 'convay_assign_org_member' THEN '82c92c720bf73b812ba6660bd0c6a390'
 WHEN 'convay_member_directory' THEN '482cb620b605b5fc4b04556f049eb462'
 WHEN 'convay_org_member_directory' THEN '76b302b0155c07dbb5d7ed20285a1ce9'
END AS expected_md5,p.proacl::text AS actual_acl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('convay_assign_org_member','convay_member_directory','convay_org_member_directory') ORDER BY p.proname;
