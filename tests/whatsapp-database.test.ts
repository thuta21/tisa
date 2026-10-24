import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
let db: PGlite;
const admin = "00000000-0000-4000-8000-000000000001", customer = "00000000-0000-4000-8000-000000000002", other = "00000000-0000-4000-8000-000000000003";
async function uid(id: string) { await db.query("select set_config('test.uid',$1,false)", [id]); }
async function scalar(sql: string, args: unknown[] = []) { return (await db.query<{ v: unknown }>(sql, args)).rows[0]?.v; }
beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid,bucket_id text);
    grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
  for (const file of ["20260623163000_initial_commerce_schema.sql", "20260711120000_create_customer_profiles.sql", "20261024120000_customer_whatsapp_ordering.sql"]) await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.query("insert into auth.users(id,raw_user_meta_data) values($1,'{}'),($2,'{\"display_name\":\"Customer\",\"phone\":\"+971501234567\",\"role\":\"admin\"}'),($3,'{}')", [admin, customer, other]);
  await db.query("update profiles set role='admin' where id=$1", [admin]);
}, 30000);
afterAll(async () => { await db?.close(); });
describe("customer profiles and WhatsApp RLS", () => {
  it("creates contact details from signup without trusting role metadata", async () => {
    expect(await scalar("select phone as v from profiles where id=$1", [customer])).toBe("+971501234567");
    expect(await scalar("select role as v from profiles where id=$1", [customer])).toBeNull();
  });
  it("lets a customer change only their own contact details", async () => {
    await uid(customer); await db.exec("set role authenticated");
    try {
      await db.query("select update_customer_profile('Updated Customer','+971509876543')");
      expect(await scalar("select display_name as v from profiles where id=$1", [customer])).toBe("Updated Customer");
      expect(await scalar("select count(*)::int as v from profiles where id=$1", [other])).toBe(0);
      await db.query("update profiles set role='admin' where id=$1", [customer]);
      expect(await scalar("select role as v from profiles where id=$1", [customer])).toBeNull();
      await expect(db.query("select update_customer_profile('X','bad')")).rejects.toThrow("valid name and phone");
    } finally { await db.exec("reset role"); }
  });
  it("allows admin CRUD and lets customers read only available contacts", async () => {
    await uid(admin); await db.exec("set role authenticated");
    await db.exec("insert into whatsapp_contacts(label,phone,is_available,sort_order) values('Available','971501234567',true,1),('Offline','971509876543',false,0)");
    expect(await scalar("select count(*)::int as v from whatsapp_contacts")).toBe(2);
    await db.exec("reset role"); await uid(customer); await db.exec("set role authenticated");
    try {
      expect(await scalar("select count(*)::int as v from whatsapp_contacts")).toBe(1);
      await expect(db.exec("insert into whatsapp_contacts(label,phone) values('Bad','971500000000')")).rejects.toThrow();
      await db.exec("update whatsapp_contacts set is_available=false");
      expect(await scalar("select count(*)::int as v from whatsapp_contacts")).toBe(1);
    } finally { await db.exec("reset role"); }
  });
  it("blocks anonymous access to contact numbers and profile changes", async () => {
    await uid(""); await db.exec("set role anon");
    try {
      await expect(db.query("select * from whatsapp_contacts")).rejects.toThrow("permission denied");
      await expect(db.query("select update_customer_profile('Anonymous','+971501234567')")).rejects.toThrow("permission denied");
    } finally { await db.exec("reset role"); }
  });
});
