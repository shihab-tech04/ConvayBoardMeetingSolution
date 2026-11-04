import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const sources = [
 "src/app/data/boardMeetingData.ts",
 "src/app/data/documentWorkspaceData.ts",
 "src/app/data/bmsUsers.ts",
 "src/app/data/bmsRoles.ts",
 "src/app/data/designations.ts",
];
const refs = sources.flatMap(path => {
 const source = readFileSync(path,"utf8");
 return [...source.matchAll(/createEntityRegistry\s*<[^>]*>\s*\(\s*["']([^"']+)["']/g)]
  .map(m => m[1]);
});
const legacy = new Set(["bms.users","bms.roles.canonical"]);
const sqlBacked = refs.filter(name => !legacy.has(name));
const migrations = readdirSync("supabase/migrations")
 .filter(name => name.endsWith(".sql"))
 .map(name => readFileSync(join("supabase/migrations",name),"utf8"))
 .join("\n");

describe("Convay all frontend entity registries versus SQL source contracts",()=>{
 it("keeps all 54 unique SQL-backed frontend registries catalogued",()=>{
   expect(new Set(refs).size).toBe(refs.length);
   expect(sqlBacked).toHaveLength(54);
   expect(refs.filter(name => legacy.has(name)).sort()).toEqual([...legacy].sort());
 });
 it.each(sqlBacked)("%s has a server-side SQL migration contract",name=>{
   expect(migrations).toContain("'"+name+"'");
 });
 it("retains dedicated protected role/user stores rather than allowing generic bypass",()=>{
   const adapter=readFileSync("src/app/hooks/useEntityRegistry.ts","utf8");
   for(const key of legacy) expect(adapter).toContain('"'+key+'"');
 });
});
