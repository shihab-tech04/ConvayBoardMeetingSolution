"""Real local GoTrue/Auth + PostgREST test, never a hosted database.
The only bootstrap substitution is the first migration's existing identity binding,
using the new disposable Auth root. All other checked-in migrations run unchanged.
This is a source replay, not a native backup of production data or a release.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json
import re
import secrets
import shlex
import subprocess
import sys
import time
import uuid
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[3]
env = {}
for line in Path(sys.argv[1]).read_text().splitlines():
    if re.fullmatch(r'[A-Z_][A-Z0-9_]*=.*', line):
        k, v = line.split("=", 1)
        values = shlex.split(v)
        if len(values) == 1:
            env[k] = values[0]
base = env.get("API_URL", "").rstrip("/")
parsed = urlparse(base)
assert parsed.scheme == "http" and parsed.hostname in ("127.0.0.1", "localhost") and parsed.port == 54321 and not parsed.username and not parsed.path, "Nonlocal API refused"
anon = env.get("ANON_KEY") or env.get("PUBLISHABLE_KEY")
service = env.get("SERVICE_ROLE_KEY") or env.get("SECRET_KEY")
assert anon and service, "Missing disposable local credentials"
db = "supabase_db_convay-free-rehearsal"
subprocess.run(["docker", "inspect", db], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def sql(source, dbname="postgres", tuples=False, local_restore_admin=False):
    assert dbname in ("postgres", "convay_native_fixture")
    # Use the existing administrator only in the disposable local container.
    # Do not grant memberships, alter roles or use this for hosted databases.
    role = "supabase_admin" if local_restore_admin else "postgres"
    args = ["docker", "exec", "-i", db, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", role, "-d", dbname]
    if tuples:
        args += ["-A", "-t"]
    p = subprocess.run(args, input=source, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode:
        raise RuntimeError("Local SQL failed: " + p.stderr[-1600:])
    return p.stdout.strip()

def call(path, token, data=None, method=None, expected=(200, 201, 204), service_call=False):
    assert path.startswith("/") and not path.startswith("//")
    headers = {"apikey": service if service_call else anon, "Authorization": "Bearer " + token, "Content-Type": "application/json"}
    if method in ("POST","PATCH","DELETE") and path.startswith("/rest/v1/") and "/rpc/" not in path:
        headers["Prefer"] = "return=representation"
    req = Request(base + path, json.dumps(data).encode() if data is not None else None, headers, method=method)
    try:
        with urlopen(req, timeout=30) as response:
            status, raw = response.status, response.read()
    except HTTPError as e:
        status, raw = e.code, e.read()
    if status not in expected:
        # Never emit passwords, credentials, session tokens or Auth responses.
        code = ""
        try:
            code = str(json.loads(raw).get("code", ""))
        except Exception:
            pass
        raise AssertionError(f"{method or 'GET'} {path.split('?')[0]}: unexpected HTTP {status} / {code}")
    return json.loads(raw) if raw else None

def principal(label):
    email = f"convay-local-{label}@example.com"
    password = secrets.token_urlsafe(24) + "aA1!"
    user = call("/auth/v1/admin/users", service, {"email":email,"password":password,"email_confirm":True}, service_call=True)
    uid = str(uuid.UUID(user["id"]))
    return {"id":uid, "email":email, "password":password}

def login(user):
    r = call("/auth/v1/token?grant_type=password", anon, {"email":user["email"],"password":user["password"]})
    assert r["user"]["id"] == user["id"]
    token = r["access_token"]
    assert call("/auth/v1/user", token)["id"] == user["id"]
    return token

def rpc(name, token, data, expected=(200,)):
    return call("/rest/v1/rpc/" + name, token, data, expected=expected)
def rid():
    return str(uuid.uuid4())
root = principal("root")
a = principal("company-a")
b = principal("company-b")
legacy = principal("legacy")

# Supabase dashboard-created projects may have a platform RLS event trigger
# before application migrations. If missing, reproduce the same local-only
# behavior (public table creation enables RLS), not a no-op bypass.
if sql("SELECT to_regprocedure('public.rls_auto_enable()') IS NOT NULL;", tuples=True) == "f":
    sql("""
CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='pg_catalog' AS $$
DECLARE cmd record; tbl name;
BEGIN
 FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  WHERE command_tag IN ('CREATE TABLE','CREATE TABLE AS','SELECT INTO')
    AND object_type IN ('table','partitioned table')
 LOOP
  IF cmd.schema_name='public' THEN
   SELECT relname INTO tbl FROM pg_class WHERE oid=cmd.objid;
   EXECUTE format('ALTER TABLE IF EXISTS %I.%I ENABLE ROW LEVEL SECURITY',cmd.schema_name,tbl);
  END IF;
 END LOOP;
END $$;
CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
 WHEN TAG IN ('CREATE TABLE','CREATE TABLE AS','SELECT INTO')
 EXECUTE FUNCTION public.rls_auto_enable();
""")
migrations = sorted((ROOT / "supabase/migrations").glob("*.sql"))
assert migrations and migrations[0].name == "20261103170409_bootstrap_single_super_admin_profile.sql"
for index, file in enumerate(migrations):
    source = file.read_text()
    if index == 0:
        pattern = r"where id = '[0-9a-f-]{36}'::uuid\s+and lower\(email\) = '[^']+'"
        source, n = re.subn(pattern, "where id = '" + root["id"] + "'::uuid\n    and lower(email) = '" + root["email"] + "'", source)
        assert n == 1, "Bootstrap binding changed; do not weaken original identity verification"
    print("Applying local source migration", file.name, flush=True)
    sql(source)
print("SOURCE_MIGRATION_REPLAY_PASS", len(migrations), flush=True)

# Apply exact reviewed candidate files only on the disposable local stack.
for rel in [
    "supabase/tests/phase1_directory_scope/migration_candidate.sql",
    "supabase/tests/phase2_draft_resume/candidate.sql",
    "supabase/release-candidates/ni01_notification_draft_lifecycle.sql",
    "supabase/tests/phase1_directory_scope/document_create_candidate.sql",
]:
    print("Applying local staged candidate", rel, flush=True)
    sql((ROOT / rel).read_text())

# Trusted fixture setup only: create application profiles and minimal role
# permission for actual GoTrue users. No direct tenant or draft fixture rows.
role = rid()
profiles = ",\n".join(f"('{u['id']}','fixture-{i}','Fixture {i}','user','active','{u['email']}')" for i,u in enumerate([a,b,legacy]))
sql(f"""
INSERT INTO public.user_profiles(user_id,username,display_name,account_role,account_status,email) VALUES {profiles};
INSERT INTO public.convay_roles(id,name,description) VALUES ('{role}','Local fixture role','Disposable Auth REST test');
INSERT INTO public.convay_role_permissions(role_id,permission_id) VALUES ('{role}','admin_templates'),('{role}','mtg_view'),('{role}','gov_org_view'),('{role}','doc_view'),('{role}','doc_upload'),('{role}','doc_edit'),('{role}','doc_archive'),('{role}','admin_notifications'),('{role}','admin_integrations');
INSERT INTO public.convay_user_roles(user_id,role_id,assigned_by) SELECT user_id,'{role}','{root['id']}' FROM public.user_profiles WHERE account_role='user';
NOTIFY pgrst,'reload schema';
""")
rt, at, bt, lt = (login(u) for u in (root,a,b,legacy))
# Allow PostgREST to observe the schema cache reload, without replaying writes.
for attempt in range(30):
    try:
        rpc("convay_company_directory",rt,{"p_action":"list"})
        # Inspect OpenAPI, never retry a document mutation to wait for cache.
        assert "/rpc/convay_create_document_record" in call("/rest/v1/",rt).get("paths",{}), "Document RPC schema cache not ready"
        break
    except AssertionError:
        if attempt == 29: raise
        time.sleep(1)

def tenant_action(action, **kw):
    return rpc("convay_tenant_admin",rt,{"p_action":action,"p_request_id":rid(),**kw})
# TEN-01: real Auth denial, validation, idempotency and uniqueness.
for token in (at, bt, lt, anon):
    rpc("convay_tenant_admin",token,{"p_action":"create","p_request_id":rid(),"p_display_name":"Denied company"},expected=(401,403))
rpc("convay_tenant_admin",rt,{"p_action":"create","p_request_id":rid(),"p_display_name":"  "},expected=(400,))
create_a={"p_action":"create","p_request_id":rid(),"p_display_name":"Local company A"}
created_a=rpc("convay_tenant_admin",rt,create_a)
assert rpc("convay_tenant_admin",rt,create_a)==created_a
rpc("convay_tenant_admin",rt,{**create_a,"p_display_name":"Conflicting company"},expected=(409,))
rpc("convay_tenant_admin",rt,{**create_a,"p_request_id":rid(),"p_display_name":" local COMPANY a "},expected=(409,))
ta=created_a["tenant_id"]
assert created_a["lifecycle_state"]=="provisioning" and created_a["tenant_active"] is False
tb = tenant_action("create",p_display_name="Local company B")["tenant_id"]
assert ta != tb
tenant_action("add_member",p_tenant_id=ta,p_member_user_id=a["id"],p_member_role="tenant_admin")
tenant_action("add_member",p_tenant_id=tb,p_member_user_id=b["id"],p_member_role="tenant_admin")
def companies(token):
    return {r["id"] for r in rpc("convay_company_directory",token,{"p_action":"list"})["companies"]}
assert companies(at)=={ta} and companies(bt)=={tb}
assert companies(rt)=={ta,tb}
rpc("convay_company_directory",at,{"p_action":"read","p_tenant_id":tb},expected=(403,))
rpc("convay_company_directory",bt,{"p_action":"read","p_tenant_id":ta},expected=(403,))
rpc("convay_member_directory",at,{},expected=(403,))
rpc("convay_member_directory",bt,{},expected=(403,))

definition={"steps":[{"id":"details","title":"Meeting details","fields":[{"id":"purpose","label":"Purpose","type":"text","required":True}]},{"id":"review","title":"Review","fields":[]}]}
template=rpc("convay_meeting_template_manage",at,{"p_action":"create","p_payload":{"tenant_id":ta,"title":"Local board template","template_key":"local_board","definition":definition,"request_id":rid()}})["template_id"]
rpc("convay_meeting_template_manage",at,{"p_action":"publish","p_payload":{"template_id":template,"expected_revision":1,"request_id":rid()}})
rpc("convay_meeting_template_manage",bt,{"p_action":"read","p_payload":{"template_id":template,"revision":1}},expected=(403,))
intent={"request_id":rid(),"template_id":template,"template_revision":1,"meeting_title":"Local board draft","values":{"purpose":"Budget"},"wizard_step_id":"review","partial_save":True}
saved=rpc("convay_company_meeting_drafts",at,{"p_action":"create","p_tenant_id":ta,"p_payload":intent})
replay=rpc("convay_company_meeting_drafts",at,{"p_action":"create","p_tenant_id":ta,"p_payload":intent})
assert saved==replay
draft_id=saved["draft_id"]
def read_draft(token,tenant,expected=(200,)):
    return rpc("convay_company_draft_lifecycle",token,{"p_action":"read","p_tenant_id":tenant,"p_payload":{"draft_id":draft_id}},expected=expected)
draft=read_draft(at,ta)["draft"]
assert draft["wizard_step_id"]=="review" and draft["values"]==intent["values"] and draft["definition"]==definition
read_draft(bt,ta,expected=(403,))
rpc("convay_company_draft_lifecycle",anon,{"p_action":"list","p_tenant_id":ta,"p_payload":{}},expected=(401,403))

# TEN-06/07: separate genuine sessions, scoped audit, lifecycle denial,
# retained staged data and restoration with the original access token.
def tenant_audit(token,tenant,expected=(200,)):
    return rpc("convay_tenant_audit",token,{"p_tenant_id":tenant},expected=expected)
before_audit=tenant_audit(at,ta)
assert tenant_audit(rt,ta)==before_audit
assert any(e["request_id"]==create_a["p_request_id"] and e["actor_id"]==root["id"] and e["action"]=="create" for e in before_audit)
assert sum(e["request_id"]==create_a["p_request_id"] for e in before_audit)==1
tenant_audit(bt,ta,expected=(403,))
tenant_audit(at,tb,expected=(403,))
tenant_audit(lt,ta,expected=(403,))
tenant_audit(anon,ta,expected=(401,403))
for token in (at,bt,lt):
    rpc("convay_tenant_admin",token,{"p_action":"suspend","p_request_id":rid(),"p_tenant_id":ta},expected=(403,))
suspension=tenant_action("suspend",p_tenant_id=ta)
assert suspension["lifecycle_state"]=="suspended"
assert rpc("convay_company_directory",rt,{"p_action":"read","p_tenant_id":ta})["company"]["lifecycle_state"]=="suspended"
read_draft(at,ta,expected=(403,))
rpc("convay_tenant_admin",rt,{"p_action":"suspend","p_request_id":rid(),"p_tenant_id":ta},expected=(400,))
resumption=tenant_action("resume",p_tenant_id=ta)
assert resumption["lifecycle_state"]=="provisioning" and resumption["tenant_active"] is False
assert read_draft(at,ta)["draft"]==draft
after_audit=tenant_audit(rt,ta)
assert all(e in after_audit for e in before_audit)
assert {e["id"] for e in after_audit}-{e["id"] for e in before_audit}=={suspension["audit_event_id"],resumption["audit_event_id"]}
assert tenant_audit(at,ta)==after_audit
assert companies(bt)=={tb}
print("LOCAL_TENANT_LIFECYCLE_AUDIT_PASS: root-only creation, duplicate and replay handling, tenant audit isolation, suspend denial and non-destructive resume",flush=True)

# Reproduce global fallback through real API, not a fabricated JWT.
record={"entity_key":"bms.templates","record_id":"local-legacy-template","payload":{"id":"local-legacy-template","title":"Legacy fixture"}}
call("/rest/v1/convay_entity_records",rt,record,method="POST")
path="/rest/v1/convay_entity_records?select=record_id&entity_key=eq.bms.templates&record_id=eq.local-legacy-template"
assert len(call(path,lt))==1 and call(path,at)==[]
tenant_action("revoke_member",p_tenant_id=ta,p_member_user_id=a["id"])
assert companies(at)==set()
read_draft(at,ta,expected=(403,))
assert len(call(path,at))==1, "Existing fallback was not reproduced"
sql((ROOT/"supabase/tests/phase1_directory_scope/legacy_scope_candidate.sql").read_text())
sql((ROOT/"supabase/tests/phase1_directory_scope/document_scope_candidate.sql").read_text())
assert call(path,at)==[] and call(path,bt)==[] and len(call(path,lt))==1 and len(call(path,rt))==1
# Same genuine access token after revocation; do not mint a test claim.
rpc("convay_member_directory",at,{},expected=(403,))
print("LOCAL_REAL_AUTH_REST_PASS: company creation, A/B authorization, template publish, partial draft idempotency/readback, revoked membership, legacy registry denial", flush=True)

# Actual authenticated PostgREST and Storage operations with synthetic data.
# Root and delegated users have the module permission; the scope boundary
# must independently reject tenant B and the revoked A account.
doc_id = "local-legacy-doc-" + rid()
doc = {"entity_key":"bms.documents","record_id":doc_id,"payload":{"id":doc_id,"doc_id":doc_id,"title":"Local fixture document","confidentiality":"Public"}}
receipt=rpc("convay_create_document_record",rt,{"p_record":doc["payload"]})
assert receipt==[{"record_id":doc_id,"revision":1}]
rpc("convay_create_document_record",rt,{"p_record":doc["payload"]},expected=(409,))
for token in (at,bt,anon):
    denied_doc_id="denied-"+rid()
    rpc("convay_create_document_record",token,{"p_record":{"id":denied_doc_id,"doc_id":denied_doc_id,"title":"Denied","confidentiality":"Public"}},expected=(401,403))
    assert sql("SELECT count(*) FROM public.convay_entity_records WHERE record_id='"+denied_doc_id+"';",tuples=True)=="0"
print("LOCAL_ATOMIC_DOCUMENT_CREATE_PASS: authorized receipt, duplicate identity rejected, revoked/foreign/anonymous writes denied and rolled back",flush=True)
content_id = "local-content-" + rid()
content = {"id":content_id,"document_id":doc_id,"content_type":"editor_json","content":"{\"type\":\"doc\",\"content\":[]}"}
call("/rest/v1/convay_document_content",rt,content,method="POST")
content_path = "/rest/v1/convay_document_content?select=id,document_id,content&id=eq." + content_id
assert len(call(content_path,rt)) == 1 and len(call(content_path,lt)) == 1
assert call(content_path,at) == [] and call(content_path,bt) == []
assert call(content_path,at,{"content":"denied"},method="PATCH") == []
assert call(content_path,bt,method="DELETE") == []
assert call(content_path,rt)[0]["content"] == content["content"]
call("/rest/v1/convay_document_content",at,{**content,"id":"denied-"+rid()},method="POST",expected=(403,))
object_bytes=b"Disposable Convay document content"
object_path="/storage/v1/object/convay-documents/"+doc_id+"/fixture.txt"
def storage(path,token,method="GET",data=None,expected=(200,201)):
    req=Request(base+path,data,{"apikey":anon,"Authorization":"Bearer "+token,"Content-Type":"text/plain"},method=method)
    try:
        with urlopen(req,timeout=30) as resp:
            status,raw=resp.status,resp.read()
    except HTTPError as exc:
        status,raw=exc.code,exc.read()
    assert status in expected, f"Storage {method}: unexpected HTTP {status}"
    return raw
storage(object_path,rt,"POST",object_bytes)
assert storage(object_path,rt)==object_bytes and storage(object_path,lt)==object_bytes
storage(object_path,at,expected=(400,403,404))
storage(object_path,bt,expected=(400,403,404))
storage("/storage/v1/object/convay-documents/"+doc_id+"/denied.txt",at,"POST",object_bytes,expected=(400,403))
print("LOCAL_DOCUMENT_REST_STORAGE_PASS: real upload/readback, legitimate legacy access, revoked and foreign tenant read/write denial",flush=True)

# DC-21/23/24: staged link guard on the disposable full schema, real Auth/PostgREST.
# Production migration/activation is not authorized by this local rehearsal.
sql((ROOT/"supabase/release-candidates/dc21_board_pack_link_integrity.sql").read_text())
pack_registry="/rest/v1/convay_entity_records"
pack_id="local-pack-"+rid(); version_id="local-version-"+rid(); link_id="local-link-"+rid()
pack_ref="BPK-local-"+rid()
pack_payload={"id":pack_id,"pack_id":pack_ref,"pack_title":"Local draft","approval_status":"Draft","version":"V1"}
call(pack_registry,rt,{"entity_key":"bms.boardpacks","record_id":pack_id,"payload":pack_payload},method="POST")
version_payload={"id":version_id,"version_id":version_id,"document_id":doc_id,"version_number":"1.0","approval_status":"Draft"}
call(pack_registry,rt,{"entity_key":"bms.docversions","record_id":version_id,"payload":version_payload},method="POST")
link_payload={"id":link_id,"link_id":link_id,"board_pack_id":pack_id,"document_id":doc_id,"linked_version_id":version_id,"link_status":"active"}
link_body={"entity_key":"bms.doc.pack_links","record_id":link_id,"payload":link_payload}
link_path=pack_registry+"?entity_key=eq.bms.doc.pack_links&record_id=eq."+link_id
for bad_pin in ("1.0","latest","missing"):
    call(pack_registry,rt,{**link_body,"payload":{**link_payload,"linked_version_id":bad_pin}},method="POST",expected=(400,409))
    assert call(link_path,rt)==[]
call(pack_registry,rt,{**link_body,"payload":{**link_payload,"board_pack_id":"unknown-pack"}},method="POST",expected=(403,))
for token in (at,bt,lt,anon):
    call(pack_registry,token,link_body,method="POST",expected=(401,403))
call(pack_registry,rt,link_body,method="POST")
assert call(link_path,rt)[0]["payload"]==link_payload
# Both record and display aliases identify the same pack. A second current
# link must fail even when its ID and board-pack reference differ.
for alias in (pack_id,pack_ref):
    duplicate_id="local-duplicate-"+rid()
    duplicate={**link_payload,"id":duplicate_id,"link_id":duplicate_id,"board_pack_id":alias}
    call(pack_registry,rt,{**link_body,"record_id":duplicate_id,"payload":duplicate},method="POST",expected=(400,409))
    assert call(pack_registry+"?record_id=eq."+duplicate_id,rt)==[]
# Remove/re-add is allowed, but reactivating the previous row would duplicate
# the current membership. Keep the original fixture active for later tests.
call(link_path,rt,{"payload":{**link_payload,"link_status":"removed"}},method="PATCH")
replacement_id="local-replacement-"+rid()
replacement={**link_payload,"id":replacement_id,"link_id":replacement_id,"board_pack_id":pack_ref}
replacement_path=pack_registry+"?record_id=eq."+replacement_id
call(pack_registry,rt,{**link_body,"record_id":replacement_id,"payload":replacement},method="POST")
call(link_path,rt,{"payload":link_payload},method="PATCH",expected=(400,409))
call(replacement_path,rt,method="DELETE")
call(link_path,rt,{"payload":link_payload},method="PATCH")
# Two authenticated requests race for the same new pack/document pair.
# Only one current membership may commit, including mixed aliases.
race_pack="local-race-pack-"+rid(); race_ref="BPK-race-"+rid()
call(pack_registry,rt,{"entity_key":"bms.boardpacks","record_id":race_pack,"payload":{**pack_payload,"id":race_pack,"pack_id":race_ref}},method="POST")
race_ids=["local-race-link-"+rid(),"local-race-link-"+rid()]
def race_link(pair):
    identity,alias=pair
    return call(pack_registry,rt,{**link_body,"record_id":identity,"payload":{**link_payload,"id":identity,"link_id":identity,"board_pack_id":alias}},method="POST",expected=(201,400,409))
with ThreadPoolExecutor(max_workers=2) as pool:
    list(pool.map(race_link,zip(race_ids,(race_pack,race_ref))))
assert sum(len(call(pack_registry+"?record_id=eq."+i,rt)) for i in race_ids)==1
print("LOCAL_BOARD_PACK_MEMBERSHIP_UNIQUENESS_PASS: alias duplicate, removal/re-add, reactivation denial and concurrent insertion",flush=True)
call(link_path,rt,{"payload":{**link_payload,"board_pack_id":"other-pack"}},method="PATCH",expected=(400,409))
assert call(link_path,rt)[0]["payload"]==link_payload
pack_path=pack_registry+"?entity_key=eq.bms.boardpacks&record_id=eq."+pack_id
# Reproduce an existing non-draft pack without claiming the publish journey works.
call(pack_path,rt,{"payload":{**pack_payload,"approval_status":"Approved"}},method="PATCH")
call(link_path,rt,{"payload":{**link_payload,"link_status":"removed"}},method="PATCH",expected=(400,409))
call(link_path,rt,method="DELETE",expected=(400,409))
assert call(link_path,rt)[0]["payload"]==link_payload
print("LOCAL_BOARD_PACK_LINK_INTEGRITY_PASS: exact version, valid draft, invalid alias, unauthorized actor, reparent and non-draft mutation denial",flush=True)

# NI-01: real authenticated create/read/update with immutable lifecycle.
# This is draft-only, no provider send or notification delivery.
rule_id=rid()
payload={"id":rule_id,"rule_id":"LOCAL-QA","rule_name":"Local notification draft","trigger_event":"Test","channels":"In-App","recipients":"Nobody","timing":"None","template":"Test","entity_type":"Meeting","status":"Draft"}
rule={"entity_key":"bms.notifyrules","record_id":rule_id,"payload":payload}
registry="/rest/v1/convay_entity_records"
rule_path=registry+"?entity_key=eq.bms.notifyrules&record_id=eq."+rule_id
call(registry,rt,rule,method="POST")
assert call(rule_path,rt)[0]["payload"]["status"]=="Draft"
updated={**payload,"rule_name":"Revised local draft"}
call(rule_path,rt,{"payload":updated},method="PATCH")
assert call(rule_path,rt)[0]["payload"]==updated
call(rule_path,rt,{"payload":{**updated,"status":"Active"}},method="PATCH",expected=(400,409))
call(rule_path,rt,method="DELETE",expected=(400,409))
assert call(rule_path,lt)==[] and call(rule_path,bt)==[]
assert call(rule_path,lt,{"payload":{**updated,"rule_name":"Denied"}},method="PATCH")==[]
denied_id=rid()
call(registry,lt,{"entity_key":"bms.notifyrules","record_id":denied_id,"payload":{**payload,"id":denied_id}},method="POST",expected=(403,))
assert call(rule_path,rt)[0]["payload"]==updated
print("LOCAL_NOTIFICATION_REST_PASS: draft create/edit/readback, activation/deletion denied, delegated module permission cannot bypass root boundary",flush=True)

# NI-15: trusted fixture writes Pending Setup, never fabricated Connected
# provider evidence. Verify real browser-role PostgREST reads and denials.
sql("INSERT INTO public.convay_provider_connections(provider_id,status) VALUES ('smtp-email','Pending Setup');")
provider_path="/rest/v1/convay_provider_connections?select=provider_id,status,verified_at&provider_id=eq.smtp-email"
assert call(provider_path,rt)==[{"provider_id":"smtp-email","status":"Pending Setup","verified_at":None}]
assert call(provider_path,lt)==[] and call(provider_path,bt)==[]
call(provider_path,rt,{"status":"Disconnected"},method="PATCH",expected=(403,))
assert call(provider_path,rt)[0]["status"]=="Pending Setup"
print("LOCAL_PROVIDER_REST_PASS: root read, nonroot denial and browser-write denial; actual provider connectivity not tested",flush=True)

# Deny-by-default and public privileged-function catalog audit. Do not add
# policies or remove intentional RPC privileges merely to silence advisors.
assert sql("""SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('public','convay_private') AND c.relkind IN ('r','p')
AND c.relrowsecurity AND NOT EXISTS(SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid)
AND (has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
OR has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'));""",tuples=True)=="0"
assert sql("""SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prosecdef AND has_function_privilege('anon',p.oid,'EXECUTE');""",tuples=True)=="0"
print("LOCAL_DENY_DEFAULT_CATALOG_PASS: policyless RLS tables have no direct browser-role grants; no anonymous public privileged RPC execution",flush=True)


# A native PostgreSQL archive of the local synthetic app schemas.
# This does not back up hosted data or Storage object bytes.
# Verify the local archive table of contents is readable; actual production
# restoration remains a distinct mandatory gate.
dump = subprocess.run(["docker","exec",db,"pg_dump","-U","postgres","-d","postgres","-Fc","-n","public","-n","convay_private","-n","auth","-n","storage"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True).stdout
assert dump.startswith(b"PGDMP") and len(dump)>1024
toc = subprocess.run(["docker","exec","-i",db,"pg_restore","-l"],input=dump,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True).stdout
assert b"TABLE DATA auth users" in toc and b"TABLE DATA convay_private company_meeting_draft_staging" in toc and b"TABLE DATA storage objects" in toc
import hashlib
print("LOCAL_SYNTHETIC_NATIVE_ARCHIVE_PASS",len(dump),hashlib.sha256(dump).hexdigest(),flush=True)

# Restore the actual archive into a newly created database in the same
# disposable PostgreSQL cluster. No production DSN, managed project, external
# Storage objects, or public artifact is involved. Keep ownership and ACLs.
restore_db = "convay_native_fixture"
assert sql("SELECT current_user='supabase_admin' AND rolsuper FROM pg_roles WHERE rolname=current_user;",tuples=True,local_restore_admin=True)=="t", "Disposable native restore administrator unavailable"
subprocess.run(["docker","exec",db,"createdb","-U","supabase_admin","-T","template0",restore_db],check=True)
# pg_dump -n does not include external extension dependencies. Recreate the
# compatible local extension baseline explicitly before restoring the archive.
extensions = json.loads(sql("""
SELECT COALESCE(json_agg(json_build_object('name',e.extname,'version',e.extversion,'schema',n.nspname)),'[]')
FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
WHERE e.extname IN ('pgcrypto','uuid-ossp','pg_trgm','citext','pgjwt')
 AND n.nspname NOT IN ('public','convay_private','auth','storage')
""",tuples=True))
def ident(s):
    return '"' + s.replace('"','""') + '"'
def lit(s):
    return "'" + s.replace("'","''") + "'"
for ext in extensions:
    sql("CREATE SCHEMA IF NOT EXISTS " + ident(ext["schema"]) + "; CREATE EXTENSION IF NOT EXISTS "
        + ident(ext["name"]) + " WITH SCHEMA " + ident(ext["schema"]) + " VERSION " + lit(ext["version"]) + ";",
        dbname=restore_db,local_restore_admin=True)
# The target was created from template0, not restored over an existing app.
# pg_restore --clean still tries DROP POLICY on nonexistent tables; remove
# only the template's default public schema if the archive creates it.
if re.search(rb"(?m)^\d+;.* SCHEMA - public ",toc):
    sql("DROP SCHEMA public;",dbname=restore_db,local_restore_admin=True)
restore = subprocess.run(["docker","exec","-i",db,"pg_restore","-U","supabase_admin","-d",restore_db,
                          "--exit-on-error"],
                         input=dump,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
if restore.returncode:
    raise RuntimeError("Local native restore failed: " + restore.stderr.decode(errors="replace")[-2200:])
# Compare every table's row count and deterministic row-content digest, plus
# RLS flags, table owners, normalized table grants, function owners/grants
# and the actual RLS policy definitions. Only counts and the final PASS are
# logged; never emit Auth rows, password hashes, or tokens.
scope="'public','convay_private','auth','storage'"
table_names=json.loads(sql("SELECT COALESCE(json_agg(json_build_array(n.nspname,c.relname) ORDER BY n.nspname,c.relname),'[]') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ("+scope+") AND c.relkind IN ('r','p')",tuples=True))
assert table_names
digest_query=" UNION ALL ".join("SELECT "+lit(schema+"."+table)+" AS relation, count(*)::bigint AS rows, md5(COALESCE(string_agg(md5(to_jsonb(t)::text),',' ORDER BY md5(to_jsonb(t)::text)),'')) AS digest FROM "+ident(schema)+"."+ident(table)+" t" for schema,table in table_names)
digest_query="SELECT COALESCE(json_agg(x ORDER BY relation),'[]') FROM ("+digest_query+") x;"
assert json.loads(sql(digest_query,tuples=True,local_restore_admin=True))==json.loads(sql(digest_query,dbname=restore_db,tuples=True,local_restore_admin=True)), "Restored row counts/content differ"
print("LOCAL_SYNTHETIC_NATIVE_ROWS_PASS",len(table_names),"tables restored with identical row counts and content",flush=True)
# Roles are cluster-level and are already present in the same disposable
# cluster. Compare granted privileges including default ACL semantics.
catalog_queries=[
"SELECT COALESCE(json_agg(x ORDER BY nspname,relname),'[]') FROM (SELECT n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) AS owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ("+scope+") AND c.relkind IN ('r','p','v','m','S')) x",
"SELECT COALESCE(json_agg(x ORDER BY nspname,relname,grantor,grantee,privilege_type,is_grantable),'[]') FROM (SELECT n.nspname,c.relname,pg_get_userbyid(a.grantor) AS grantor,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type,a.is_grantable FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault((CASE WHEN c.relkind='S' THEN 's' ELSE 'r' END)::\"char\",c.relowner))) a WHERE n.nspname IN ("+scope+") AND c.relkind IN ('r','p','v','m','S')) x",
"SELECT COALESCE(json_agg(x ORDER BY schemaname,tablename,policyname),'[]') FROM (SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ("+scope+")) x",
"SELECT COALESCE(json_agg(x ORDER BY nspname,proname,args),'[]') FROM (SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ("+scope+") AND p.prokind IN ('f','p')) x",
"SELECT COALESCE(json_agg(x ORDER BY nspname,proname,args,grantor,grantee,privilege_type,is_grantable),'[]') FROM (SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args,pg_get_userbyid(a.grantor) AS grantor,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type,a.is_grantable FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname IN ("+scope+") AND p.prokind IN ('f','p')) x",
]
for index,q in enumerate(catalog_queries,1):
    assert json.loads(sql(q,tuples=True,local_restore_admin=True))==json.loads(sql(q,dbname=restore_db,tuples=True,local_restore_admin=True)), "Restored security catalog mismatch "+str(index)
print("LOCAL_SYNTHETIC_NATIVE_RESTORE_PASS",len(table_names),"tables and five security catalogs",flush=True)
