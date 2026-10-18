import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { vector } from "@electric-sql/pglite-pgvector";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
let db: PGlite;
let product: string;
let draft: string;
const admin = "00000000-0000-4000-8000-000000000001",
  customer = "00000000-0000-4000-8000-000000000002";
async function value<T = unknown>(sql: string, args: unknown[] = []) {
  return (await db.query<{ v: T }>(sql, args)).rows[0]?.v as T;
}
async function start(kind = "poster", revision = 1, limit = 20) {
  return value<{ id: string }>(
    "select row_to_json(public.start_marketing_job($1,$2,$3,$4)) as v",
    [draft, revision, kind, limit],
  );
}
beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto, vector } });
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;create schema extensions;
  create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid,bucket_id text);
  grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.query("insert into auth.users(id) values($1),($2)", [
    admin,
    customer,
  ]);
  await db.query("update profiles set role='admin' where id=$1", [admin]);
  await db.query("select set_config('test.uid',$1,false)", [admin]);
  product = await value<string>(
    "insert into products(slug,name,team,category,base_price,status) values('marketing-test','Arsenal','Arsenal','Test',60,'active') returning id as v",
  );
  draft = await value<string>(
    "insert into marketing_drafts(product_id,snapshot,selected_images,caption) values($1,'{\"images\":[]}','[\"front\"]','Test preview') returning id as v",
    [product],
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("marketing database transactions and permissions", () => {
  it("blocks customers from drafts, assets and publishing jobs", async () => {
    await db.query("select set_config('test.uid',$1,false)", [customer]);
    await db.exec("set role authenticated");
    try {
      expect(
        await value<number>("select count(*)::int as v from marketing_drafts"),
      ).toBe(0);
      expect(
        await value<number>("select count(*)::int as v from marketing_assets"),
      ).toBe(0);
      await expect(start()).rejects.toThrow("Admin access required");
      await expect(
        db.query(
          "insert into marketing_drafts(snapshot,selected_images,caption) values('{}','[\"a\"]','x')",
        ),
      ).rejects.toThrow();
    } finally {
      await db.exec("reset role");
      await db.query("select set_config('test.uid',$1,false)", [admin]);
    }
    await db.exec("set role anon");
    try {
      await expect(db.query("select * from marketing_drafts")).rejects.toThrow(
        "permission denied",
      );
    } finally {
      await db.exec("reset role");
    }
  });
  it("requires review and grants only one active job per draft", async () => {
    await expect(start()).rejects.toThrow("mark the draft ready");
    await db.query("update marketing_drafts set status='ready' where id=$1", [
      draft,
    ]);
    const job = await start();
    await expect(start()).rejects.toThrow("Another operation");
    await db.query(
      "select finish_marketing_job($1,null,null,'simulated failure')",
      [job.id],
    );
  });
  it("invalidates late exports when the content revision changes", async () => {
    const job = await start();
    expect(
      await value<number>(
        "update marketing_drafts set caption='Changed preview' where id=$1 returning revision as v",
        [draft],
      ),
    ).toBe(2);
    expect(
      await value<string>(
        "select status as v from marketing_drafts where id=$1",
        [draft],
      ),
    ).toBe("draft");
    const result = await value("select finish_marketing_job($1,$2) as v", [
      job.id,
      JSON.stringify({
        path: `${draft}/exports/${job.id}.png`,
        mime: "image/png",
        bytes: 10,
      }),
    ]);
    expect(result).toBeNull();
    expect(
      await value<number>("select count(*)::int as v from marketing_assets"),
    ).toBe(0);
    await expect(start("poster", 1)).rejects.toThrow("Draft changed");
  });
  it("exports a reviewed revision without incrementing its revision", async () => {
    await db.query("update marketing_drafts set status='ready' where id=$1", [
      draft,
    ]);
    const job = await start("poster", 2);
    await value("select finish_marketing_job($1,$2) as v", [
      job.id,
      JSON.stringify({
        path: `${draft}/exports/${job.id}.png`,
        mime: "image/png",
        bytes: 100,
      }),
    ]);
    expect(
      await value("select status as v from marketing_drafts where id=$1", [
        draft,
      ]),
    ).toBe("exported");
    expect(
      await value("select revision as v from marketing_drafts where id=$1", [
        draft,
      ]),
    ).toBe(2);
  });
  it("reserves daily AI quota including failed attempts", async () => {
    const job = await start("ai", 2, 1);
    await db.query(
      "select finish_marketing_job($1,null,null,'provider unavailable')",
      [job.id],
    );
    await expect(start("ai", 2, 1)).rejects.toThrow("Daily AI");
  });
  it("expires stuck jobs, supports retry and rejects completion by the old lease", async () => {
    const old = await start("video", 2);
    await db.query(
      "update marketing_jobs set expires_at=now()-interval '1 second' where id=$1",
      [old.id],
    );
    const retry = await start("video", 2);
    expect(retry.id).not.toBe(old.id);
    await expect(
      db.query("select finish_marketing_job($1,null,null,'old request')", [
        old.id,
      ]),
    ).rejects.toThrow("no longer running");
    await db.query(
      "select finish_marketing_job($1,null,null,'test complete')",
      [retry.id],
    );
  });
  it("preserves old exports but blocks new work for archived products", async () => {
    await db.query("update products set status='archived' where id=$1", [
      product,
    ]);
    await expect(start("poster", 2)).rejects.toThrow("no longer active");
    expect(
      await value<number>("select count(*)::int as v from marketing_assets"),
    ).toBe(1);
    expect(
      await value<boolean>(
        "select public as v from storage.buckets where id='marketing-assets'",
      ),
    ).toBe(false);
  });
});
