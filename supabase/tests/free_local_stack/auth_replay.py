"""Real local GoTrue/Auth + PostgREST test, never a hosted database.
The only bootstrap substitution is the first migration's existing identity binding,
using the new disposable Auth root. All other checked-in migrations run unchanged.
This is a source replay, not a native backup of production data or a release.
"""
from pathlib import Path
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
def sql(source, dbname="postgres", tuples=False):
    assert dbname in ("postgres", "convay_native_fixture")
    args = ["docker", "exec", "-i", db, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", dbname]
    if tuples:
        args += ["-A", "-t"]
    p = subprocess.run(args, input=source, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode:
        raise RuntimeError("Local SQL failed: " + p.stderr[-1600:])
    return p.stdout.strip()

def call(path, token, data=None, method=None, expected=(200, 201, 204), service_call=False):
    assert path.startswith("/") and not path.startswith("//")
    headers = {"apikey": service if service_call else anon, "Authorization": "Bearer " + token, "Content-Type": "application/json"}
    if method == "POST" and path.startswith("/rest/v1/") and "/rpc/" not in path:
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
INSERT INTO public.convay_role_permissions(role_id,permission_id) VALUES ('{role}','admin_templates'),('{role}','mtg_view'),('{role}','gov_org_view');
INSERT INTO public.convay_user_roles(user_id,role_id,assigned_by) SELECT user_id,'{role}','{root['id']}' FROM public.user_profiles WHERE account_role='user';
NOTIFY pgrst,'reload schema';
""")
rt, at, bt, lt = (login(u) for u in (root,a,b,legacy))
# Allow PostgREST to observe the schema cache reload, without replaying writes.
for attempt in range(30):
    try:
        rpc("convay_company_directory",rt,{"p_action":"list"})
        break
    except AssertionError:
        if attempt == 29: raise
        time.sleep(1)

def tenant_action(action, **kw):
    return rpc("convay_tenant_admin",rt,{"p_action":action,"p_request_id":rid(),**kw})
ta = tenant_action("create",p_display_name="Local company A")["tenant_id"]
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
assert call(path,at)==[] and call(path,bt)==[] and len(call(path,lt))==1 and len(call(path,rt))==1
# Same genuine access token after revocation; do not mint a test claim.
rpc("convay_member_directory",at,{},expected=(403,))
print("LOCAL_REAL_AUTH_REST_PASS: company creation, A/B authorization, template publish, partial draft idempotency/readback, revoked membership, legacy registry denial", flush=True)

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
