import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { vector } from "@electric-sql/pglite-pgvector";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
let db: PGlite;
const admin = "00000000-0000-4000-8000-000000000001", customer = "00000000-0000-4000-8000-000000000002";
async function value<T = unknown>(sql: string, args: unknown[] = []) { return (await db.query<{ v: T }>(sql, args)).rows[0]?.v as T; }
async function uid(id: string) { await db.query("select set_config('test.uid',$1,false)", [id]); }
beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto, vector } });
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create schema storage; create schema extensions;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid,bucket_id text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant select,insert,update,delete on storage.objects to anon,authenticated;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
    -- Model hosted Supabase defaults, not just vanilla Postgres PUBLIC grants.
    alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  for (const file of readdirSync("supabase/migrations").filter(f => f.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.query("insert into auth.users(id) values($1),($2)", [admin, customer]);
  await db.query("update profiles set role='admin' where id=$1", [admin]);
}, 30000);
afterAll(async () => { await db?.close(); });
describe("Supabase hardening under hosted default grants", () => {
  it("removes direct anonymous/authenticated grants from worker and checkout RPCs", async () => {
    for (const role of ["anon", "authenticated"]) for (const signature of ["public.claim_knowledge_jobs()", "public.finish_knowledge_job(uuid,text,uuid,jsonb,text)", "public.create_checkout_order(uuid,text,text,text,text,text,text,text,text,jsonb)"])
      expect(await value("select has_function_privilege($1,$2,'execute') as v", [role, signature])).toBe(false);
    expect(await value("select has_function_privilege('service_role','public.claim_knowledge_jobs()','execute') as v")).toBe(true);
    expect(await value("select has_schema_privilege('authenticated','public','CREATE') as v")).toBe(false);
    expect(await value("select has_function_privilege('authenticated','private.apply_inventory_delta(uuid,text,integer)','execute') as v")).toBe(false);
  });
  it("keeps RLS admin predicates and public search usable", async () => {
    await uid(customer); await db.exec("set role authenticated");
    try {
      expect(await value("select count(*)::int as v from profiles")).toBe(1);
      expect(await value("select private.is_admin() as v")).toBe(false);
      await expect(db.query("select export_order_records()")).rejects.toThrow("Admin access");
      await expect(db.query("select private.apply_inventory_delta(null,'M',10)")).rejects.toThrow("permission denied");
    } finally { await db.exec("reset role"); }
    await db.exec("set role anon");
    try { expect(await value("select search_catalog_knowledge('test') as v")).toEqual([]); }
    finally { await db.exec("reset role"); }
  });
  it("hides internal order notes and staff history while preserving admin access", async () => {
    const order = await value<string>("insert into orders(order_number,customer_name,customer_phone,country,region,delivery_address,subtotal,total,customer_id,admin_note,checkout_token) values('PRIVATE-1','Customer','+971501234567','UAE','Dubai','Test',65,65,$1,'Internal staff note',gen_random_uuid()) returning id as v", [customer]);
    await db.query("insert into order_status_history(order_id,to_status,note,changed_by) values($1,'awaiting_payment','Staff-only history',$2)", [order,admin]);
    await uid(customer); await db.exec("set role authenticated");
    try {
      expect(await value("select order_number as v from orders where id=$1", [order])).toBe("PRIVATE-1");
      await expect(db.query("select admin_note from orders where id=$1", [order])).rejects.toThrow("permission denied");
      await expect(db.query("select checkout_token from orders where id=$1", [order])).rejects.toThrow("permission denied");
      await expect(db.query("select note from order_status_history where order_id=$1", [order])).rejects.toThrow("permission denied");
      await expect(db.query("select list_admin_orders()")).rejects.toThrow("Admin access");
    } finally { await db.exec("reset role"); }
    await uid(admin); await db.exec("set role authenticated");
    try {
      const rows = await value<{admin_note:string;order_status_history:{note:string}[]}[]>("select list_admin_orders() as v");
      expect(rows[0].admin_note).toBe("Internal staff note");
      expect(rows[0].order_status_history[0].note).toBe("Staff-only history");
    } finally { await db.exec("reset role"); }
  });
  it("keeps private buckets and denies customer/anonymous storage writes", async () => {
    expect(await value("select bool_and(not public) as v from storage.buckets where id in ('payment-proofs','fonts','marketing-assets')")).toBe(true);
    await uid(admin); await db.exec("set role authenticated");
    await db.exec("insert into storage.objects(id,bucket_id) values(gen_random_uuid(),'payment-proofs')");
    await db.exec("reset role"); await uid(customer); await db.exec("set role authenticated");
    try {
      expect(await value("select count(*)::int as v from storage.objects")).toBe(0);
      await expect(db.exec("insert into storage.objects(id,bucket_id) values(gen_random_uuid(),'product-images')")).rejects.toThrow();
      await expect(db.query("select list_admin_fonts()")).rejects.toThrow("Admin access");
    } finally { await db.exec("reset role"); }
    await db.exec("set role anon");
    try { expect(await value("select count(*)::int as v from storage.objects")).toBe(0); }
    finally { await db.exec("reset role"); }
  });
  it("enforces a shared per-account WhatsApp quota that customers cannot reset", async () => {
    await uid(customer); await db.exec("set role authenticated");
    try {
      for (let i = 0; i < 10; i++) expect(await value("select consume_whatsapp_order_quota() as v")).toBe(true);
      expect(await value("select consume_whatsapp_order_quota() as v")).toBe(false);
      await expect(db.query("delete from private.customer_request_quotas")).rejects.toThrow("permission denied");
      await expect(db.query("select private.take_customer_quota('whatsapp',9999)")).rejects.toThrow("permission denied");
    } finally { await db.exec("reset role"); }
  });
  it("persists product size choices without losing quantities or movement history", async () => {
    await uid(admin);
    const product = await value<string>("insert into products(slug,name,team,category,base_price,status) values('size-save','Size save','Test','Test',65,'draft') returning id as v");
    const variant = await value<string>("insert into product_variants(product_id,kit,name,price) values($1,'home','Home',65) returning id as v", [product]);
    await db.query("insert into inventory(variant_id,size,quantity,is_active) values($1,'S',3,true),($1,'M',4,false)", [variant]);
    const updatedAt = await value<string>("select updated_at::text as v from products where id=$1", [product]);
    await db.exec("set role authenticated");
    try {
      await db.query("select save_catalog($1,false)", [JSON.stringify([{ id: product, expectedUpdatedAt: updatedAt, metadata: { name: "Size save", slug: "size-save" }, variants: [{ kit: "home", name: "Home", available: true, price: 65, stock: [{ size: "M" }] }] }])]);
      expect((await db.query("select size,quantity,is_active from inventory where variant_id=$1 order by size", [variant])).rows).toEqual([{ size: "M", quantity: 4, is_active: true }, { size: "S", quantity: 3, is_active: false }]);
      expect(await value<number>("select count(*)::int as v from inventory_movements where variant_id=$1 and reason='Product size availability updated'", [variant])).toBe(2);
    } finally { await db.exec("reset role"); }
  });
  it("requires explicit access for future RPCs", async () => {
    await db.exec("create function public.future_private_operation() returns integer language sql as $$select 1$$; create table public.future_private_table(secret text)");
    expect(await value("select has_table_privilege('anon','public.future_private_table','select') as v")).toBe(false);
    expect(await value("select has_function_privilege('anon','public.future_private_operation()','execute') as v")).toBe(false);
    expect(await value("select has_function_privilege('authenticated','public.future_private_operation()','execute') as v")).toBe(false);
  });
});
