import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const h={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
  "Access-Control-Allow-Methods":"POST,OPTIONS",
  "Content-Type":"application/json",
};
const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:h});
const serverUrl=Deno.env.get("SUPABASE_URL") ?? "";
const serverKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
if(!serverUrl||!serverKey) throw new Error("Missing server-side Supabase configuration");
const db=createClient(serverUrl,serverKey,{auth:{autoRefreshToken:false,persistSession:false}});

type Permission={
  id:string; label:string; label_key:string|null; group_id:string; endpoint:string; method:string;
  service_name:string; access_label:string; status:"Active"|"Inactive"; is_custom:boolean;
  created_at:string;updated_at:string;
};
type Role={
  id:string;name:string;description:string;level:string;status:"Active"|"Inactive";
  is_system_role:boolean;created_at:string;updated_at:string;
};
type Input={
  action:string; id?:string;name?:string;description?:string;level?:string;
  status?:string;permission_ids?:string[];role_ids?:string[];user_id?:string;
  label?:string;group_id?:string;endpoint?:string;method?:string;
  service_name?:string;access_label?:string;
};

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const code=/^[a-z][a-z0-9_-]{1,100}$/;
const groups=new Set(["home","meetings","agenda-documents","decisions-followup","governance-org","archive-reports","administration"]);
const methods=new Set(["GET","POST","PUT","PATCH","DELETE"]);
const access=new Set(["PUBLIC","AUTH","AUTHORIZE"]);
const statuses=new Set(["Active","Inactive"]);
const safeErr=(error:unknown)=>error instanceof Error?error.message:"Action failed";
async function audit(actor:string,subject:string|null,action:string,details:Record<string,unknown>={}){
  const {error}=await db.from("user_admin_audit").insert({
    actor_id:actor,subject_id:subject,action,details,
  });
  if(error) console.error("RBAC audit failure",error.message);
}
function validatePermission(input:Input):string|null{
  if(!input.id || !code.test(input.id))return "Permission ID must use letters, numbers, - or _";
  if(!input.label?.trim() || input.label.trim().length>150)return "Permission name is required";
  if(!input.group_id || !groups.has(input.group_id))return "Invalid permission group";
  if(!input.endpoint?.startsWith("/api/v1/") || input.endpoint.length>255)return "Endpoint must start with /api/v1/";
  if(!input.method || !methods.has(input.method))return "Invalid HTTP method";
  if(!input.access_label || !access.has(input.access_label))return "Invalid access type";
  if(!input.status || !statuses.has(input.status))return "Invalid permission status";
  if((input.service_name??"").length>150)return "Service name is too long";
  return null;
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:h});
 if(req.method!=="POST")return reply(405,{error:"POST required"});
 try{
  const bearer=req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if(!bearer)return reply(401,{error:"Sign in required"});
  const {data:auth,error:authError}=await db.auth.getUser(bearer);
  if(authError||!auth.user)return reply(401,{error:"Invalid session"});
  const user=auth.user;
  const {data:profile,error:profileError}=await db.from("user_profiles")
   .select("user_id,account_role,account_status").eq("user_id",user.id).maybeSingle();
  if(profileError || !profile || profile.account_status!=="active"){
   return reply(403,{error:"Account is not active"});
  }
  const isAdmin=profile.account_role==="super_admin";
  const raw=await req.text();
  if(raw.length>25000)return reply(413,{error:"Request too large"});
  let input:Input;
  try{input=JSON.parse(raw) as Input;}catch{return reply(400,{error:"Invalid JSON"});}
  if(!input || typeof input.action!=="string")return reply(400,{error:"Action required"});

  if(input.action==="snapshot"){
   const [rolesResult,permissionsResult,grantsResult,assignmentsResult]=await Promise.all([
    db.from("convay_roles").select("*").order("created_at",{ascending:true}),
    db.from("convay_permissions").select("*").order("created_at",{ascending:true}),
    db.from("convay_role_permissions").select("role_id,permission_id"),
    db.from("convay_user_roles").select("user_id,role_id"),
   ]);
   if(rolesResult.error||permissionsResult.error||grantsResult.error||assignmentsResult.error)
    return reply(500,{error:"Unable to load authorization state"});
   const roles=(rolesResult.data??[]) as Role[];
   const permissions=(permissionsResult.data??[]) as Permission[];
   const grants=grantsResult.data??[];
   const assignments=assignmentsResult.data??[];
   const userRoles=assignments.filter(x=>x.user_id===user.id).map(x=>x.role_id);
   const activeRoles=new Set(roles.filter(r=>r.status==="Active"&&userRoles.includes(r.id)).map(r=>r.id));
   const activeCodes=new Set(grants.filter(g=>activeRoles.has(g.role_id)).map(g=>g.permission_id));
   const effective=isAdmin
     ? permissions.filter(p=>p.status==="Active").map(p=>p.id)
     : permissions.filter(p=>p.status==="Active"&&activeCodes.has(p.id)).map(p=>p.id);
   if(!isAdmin)return reply(200,{is_super_admin:false,effective_permissions:effective,user_role_ids:userRoles});
   const assignedCount=new Map<string,number>();
   for(const a of assignments)assignedCount.set(a.role_id,(assignedCount.get(a.role_id)??0)+1);
   return reply(200,{
    is_super_admin:true,effective_permissions:effective,user_role_ids:userRoles,
    roles:roles.map(r=>({...r,permission_ids:grants.filter(g=>g.role_id===r.id).map(g=>g.permission_id),
     users_count:assignedCount.get(r.id)??0})),
    permissions,
    user_assignments:assignments,
   });
  }

  // All mutations require the same single server-verified Super Admin.
  if(!isAdmin)return reply(403,{error:"Only the Super Admin may modify access"});
  if(input.action==="role_save"){
   if(!input.name?.trim() || input.name.trim().length>100)
    return reply(400,{error:"Role name is required"});
   if(input.id && !uuid.test(input.id))return reply(400,{error:"Invalid role ID"});
   if(!statuses.has(input.status??""))return reply(400,{error:"Invalid status"});
   if(!Array.isArray(input.permission_ids)||input.permission_ids.length>1000||
     input.permission_ids.some(code=>typeof code!=="string"))
    return reply(400,{error:"Invalid permission selection"});
   const {data,error}=await db.rpc("convay_save_role",{
    p_id:input.id??null,p_name:input.name,p_description:input.description??"",
    p_level:input.level??"Custom",p_status:input.status,p_permissions:input.permission_ids,
   });
   if(error)return reply(409,{error:error.message});
   await audit(user.id,null,input.id?"role_updated":"role_created",{role_id:data,name:input.name});
   return reply(200,{id:data});
  }
  if(input.action==="role_delete"){
   if(!input.id||!uuid.test(input.id))return reply(400,{error:"Invalid role ID"});
   const {data:target}=await db.from("convay_roles").select("is_system_role").eq("id",input.id).maybeSingle();
   if(!target)return reply(404,{error:"Role not found"});
   if(target.is_system_role)return reply(403,{error:"The sole Super Admin role cannot be deleted"});
   const {count}=await db.from("convay_user_roles").select("*",{head:true,count:"exact"}).eq("role_id",input.id);
   if(count)return reply(409,{error:"This role is assigned to users. Remove those assignments first."});
   const {error}=await db.from("convay_roles").delete().eq("id",input.id);
   if(error)return reply(409,{error:error.message});
   await audit(user.id,null,"role_deleted",{role_id:input.id});
   return reply(200,{ok:true});
  }
  if(input.action==="permission_create"||input.action==="permission_update"){
   const issue=validatePermission(input);
   if(issue)return reply(400,{error:issue});
   if(input.action==="permission_update"){
    const {data:original}=await db.from("convay_permissions").select("id,is_custom")
      .eq("id",input.id).maybeSingle();
    if(!original)return reply(404,{error:"Permission not found"});
   }
   const value={
    label:input.label!.trim(),group_id:input.group_id!,
    endpoint:input.endpoint!,method:input.method!,
    service_name:input.service_name?.trim()??"",access_label:input.access_label!,
    status:input.status!,updated_at:new Date().toISOString(),
   };
   const {data,error}=input.action==="permission_create"
    ? await db.from("convay_permissions").insert({id:input.id!,...value,is_custom:true})
       .select("id").single()
    : await db.from("convay_permissions").update(value).eq("id",input.id!)
       .select("id").single();
   if(error)return reply(409,{error:error.message});
   await audit(user.id,null,input.action,{permission_id:data.id});
   return reply(200,{id:data.id});
  }
  if(input.action==="permission_delete"){
   if(!input.id||!code.test(input.id))return reply(400,{error:"Invalid permission ID"});
   const {data:target}=await db.from("convay_permissions").select("is_custom")
      .eq("id",input.id).maybeSingle();
   if(!target)return reply(404,{error:"Permission not found"});
   if(!target.is_custom)return reply(403,{error:"Base permissions cannot be deleted; disable them instead"});
   const {error}=await db.from("convay_permissions").delete().eq("id",input.id);
   if(error)return reply(409,{error:error.message});
   await audit(user.id,null,"permission_deleted",{permission_id:input.id});
   return reply(200,{ok:true});
  }
  if(input.action==="assign_roles"){
   if(!input.user_id||!uuid.test(input.user_id))return reply(400,{error:"Invalid user ID"});
   if(!Array.isArray(input.role_ids)||input.role_ids.length>100 ||
     input.role_ids.some(x=>typeof x!=="string"||!uuid.test(x)))
    return reply(400,{error:"Invalid role identifiers"});
   const {error}=await db.rpc("convay_assign_roles",{
    p_user:input.user_id,p_roles:input.role_ids,
   });
   if(error)return reply(409,{error:error.message});
   await audit(user.id,input.user_id,"user_roles_changed",{role_ids:input.role_ids});
   return reply(200,{ok:true});
  }
  return reply(400,{error:"Unsupported action"});
 }catch(error){
  console.error("RBAC request failed",safeErr(error));
  return reply(500,{error:"Unable to process authorization operation"});
 }
});