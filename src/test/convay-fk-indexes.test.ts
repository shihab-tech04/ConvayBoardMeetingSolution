import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20261104081645_convay_foreign_key_lookup_indexes.sql", "utf8");
const keys = [
  {
    "schema": "convay_private",
    "table": "registry_types",
    "column": "create_permission",
    "index": "convay_registry_types_create_permission_fk_idx"
  },
  {
    "schema": "convay_private",
    "table": "registry_types",
    "column": "delete_permission",
    "index": "convay_registry_types_delete_permission_fk_idx"
  },
  {
    "schema": "convay_private",
    "table": "registry_types",
    "column": "read_permission",
    "index": "convay_registry_types_read_permission_fk_idx"
  },
  {
    "schema": "convay_private",
    "table": "registry_types",
    "column": "update_permission",
    "index": "convay_registry_types_update_permission_fk_idx"
  },
  {
    "schema": "convay_private",
    "table": "storage_cleanup_queue",
    "column": "initiated_by",
    "index": "convay_storage_cleanup_queue_initiated_by_fk_idx"
  },
  {
    "schema": "public",
    "table": "convay_document_content",
    "column": "created_by",
    "index": "convay_convay_document_content_created_by_fk_idx"
  },
  {
    "schema": "public",
    "table": "convay_document_content",
    "column": "updated_by",
    "index": "convay_convay_document_content_updated_by_fk_idx"
  },
  {
    "schema": "public",
    "table": "convay_entity_records",
    "column": "created_by",
    "index": "convay_convay_entity_records_created_by_fk_idx"
  },
  {
    "schema": "public",
    "table": "convay_entity_records",
    "column": "updated_by",
    "index": "convay_convay_entity_records_updated_by_fk_idx"
  },
  {
    "schema": "public",
    "table": "convay_user_roles",
    "column": "assigned_by",
    "index": "convay_convay_user_roles_assigned_by_fk_idx"
  }
];

describe("Convay foreign-key lookup indexes", () => {
  it.each(keys)("$schema.$table.$column has its own safe lookup index", ({ schema, table, column, index }) => {
    expect(migration).toContain(
      `create index if not exists ${index} on ${schema}.${table} (${column});`
    );
  });
  it("is non-destructive and does not weaken permissions", () => {
    expect(migration.match(/create index if not exists/g)).toHaveLength(10);
    expect(migration).not.toMatch(/drop table|truncate|delete from|alter table.*disable row level security|grant all/i);
  });
});
