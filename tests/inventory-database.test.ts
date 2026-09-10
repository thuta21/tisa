import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {vector} from '@electric-sql/pglite-pgvector';
import {readFileSync,readdirSync} from 'node:fs';
let db:PGlite;let product:string;let variant:string;let inventory:string;
const admin='00000000-0000-4000-8000-000000000001';
async function value(sql:string,params:unknown[]=[]){return (await db.query<{v:unknown}>(sql,params)).rows[0]?.v;}
async function adjustment(quantity:number,version:number,key=crypto.randomUUID()){
  return value('select public.adjust_inventory($1::jsonb) as v',[JSON.stringify({inventoryId:inventory,expectedVersion:version,quantity,operation:'set',reason:'Test reconciliation',idempotencyKey:key})]);
}
beforeAll(async()=>{
  db=new PGlite({extensions:{pgcrypto,vector}});
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;create schema extensions;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid,bucket_id text);
    grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
  for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort()){
    try{await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));}catch(e){throw new Error(`${file}: ${(e as Error).message}`);}
  }
  await db.query('insert into auth.users(id) values($1)',[admin]);
  await db.query("update public.profiles set role='admin' where id=$1",[admin]);
  await db.query("select set_config('test.uid',$1,false)",[admin]);
  product=await value("insert into public.products(slug,name,team,category,base_price,status) values('test-spain','Spain Jersey','Spain','Test',60,'active') returning id as v") as string;
  variant=await value("insert into public.product_variants(product_id,kit,name,price) values($1,'home','Spain Home',60) returning id as v",[product]) as string;
  inventory=await value("insert into public.inventory(variant_id,size,quantity) values($1,'S',10) returning id as v",[variant]) as string;
},30000);
afterAll(async()=>{await db?.close();});
describe('real PostgreSQL inventory transactions',()=>{
  it('applies once and rejects stale edits',async()=>{
    const key=crypto.randomUUID();expect(await adjustment(9,1,key)).toMatchObject({quantity:9,version:2});
    expect(await adjustment(9,1,key)).toMatchObject({quantity:9,version:2});
    await expect(adjustment(20,1)).rejects.toThrow('Stock changed');
    expect(await value('select quantity as v from inventory where id=$1',[inventory])).toBe(9);
  });
  it('preserves order deduction, restoration and catalog references',async()=>{
    const order=await value("insert into orders(order_number,customer_name,customer_phone,region,delivery_address,subtotal,total) values('TEST-1','Test','0','Test','Test',60,60) returning id as v") as string;
    await db.query("insert into order_items(order_id,product_id,variant_id,product_name,kit_name,size,quantity,unit_price,line_total) values($1,$2,$3,'Spain','Home','S',2,60,120)",[order,product,variant]);
    expect(await value('select quantity as v from inventory where id=$1',[inventory])).toBe(7);
    await db.query("update orders set status='cancelled' where id=$1",[order]);
    expect(await value('select quantity as v from inventory where id=$1',[inventory])).toBe(9);
    await db.query("update orders set status='paid' where id=$1",[order]);
    expect(await value('select quantity as v from inventory where id=$1',[inventory])).toBe(7);
    await expect(db.query('delete from products where id=$1',[product])).rejects.toThrow('Archive');
    const movements=(await db.query<{before_quantity:number;after_quantity:number;reason:string}>('select before_quantity,after_quantity,reason from inventory_movements where order_id=$1 and inventory_id=$2 order by created_at',[order,inventory])).rows;
    expect(movements.map(row=>[row.before_quantity,row.after_quantity])).toEqual([[9,7],[7,9],[9,7]]);
  });
  it('rolls back the entire import on a stale row',async()=>{
    const v=await value('select version as v from inventory where id=$1',[inventory]);
    const rows=[{row:2,name:'',variantId:variant,inventoryId:inventory,size:'S',quantity:5,expectedVersion:v,before:7},{row:3,name:'',variantId:variant,inventoryId:inventory,size:'S',quantity:1,expectedVersion:0,before:7}];
    const id=await value("insert into inventory_imports(source_hash,file_name,payload) values('rollback','test.xlsx',$1) returning id as v",[JSON.stringify({rows})]);
    await expect(value('select commit_inventory_import($1) as v',[id])).rejects.toThrow('Stock changed');
    expect(await value('select quantity as v from inventory where id=$1',[inventory])).toBe(7);
    expect(await value('select status as v from inventory_imports where id=$1',[id])).toBe('preview');
  });
  it('does not turn generic export labels into conflicting aliases',async()=>{
    const secondProduct=await value("insert into public.products(slug,name,team,category,base_price,status) values('test-france','France Jersey','France','Test',60,'active') returning id as v") as string;
    const secondVariant=await value("insert into public.product_variants(product_id,kit,name,price) values($1,'home','Home Player Version',60) returning id as v",[secondProduct]) as string;
    const secondInventory=await value("insert into public.inventory(variant_id,size,quantity) values($1,'S',0) returning id as v",[secondVariant]) as string;
    const currentVersion=await value('select version as v from inventory where id=$1',[inventory]);
    const rows=[
      {row:2,name:'Home Player Version',variantId:variant,inventoryId:inventory,size:'S',quantity:7,expectedVersion:currentVersion,before:7},
      {row:3,name:'Home Player Version',variantId:secondVariant,inventoryId:secondInventory,size:'S',quantity:4,expectedVersion:1,before:0},
    ];
    const id=await value("insert into inventory_imports(source_hash,file_name,payload) values('stable-export','export.xlsx',$1) returning id as v",[JSON.stringify({rows})]);
    expect(await value('select commit_inventory_import($1) as v',[id])).toMatchObject({count:2});
    expect(await value("select count(*)::int as v from inventory_aliases where source_name='home player version'")).toBe(0);
  });
  it('creates draft missing products atomically and safely reverses quantities',async()=>{
    const rows=['S','M'].map(size=>({row:2,name:'Real Madrid Home',size,quantity:3,expectedVersion:0,before:0,kit:'home',team:'real madrid',sleeve:'short',productSlug:'import-real-madrid'}));
    const id=await value("insert into inventory_imports(source_hash,file_name,payload) values('new','test.xlsx',$1) returning id as v",[JSON.stringify({rows})]);
    expect(await value('select commit_inventory_import($1) as v',[id])).toMatchObject({count:2,createdProducts:1});
    expect(await value("select status as v from products where slug='import-real-madrid'")).toBe('draft');
    expect(await value('select commit_inventory_import($1) as v',[id])).toMatchObject({count:2});
    await value('select reverse_inventory_import($1) as v',[id]);
    expect(await value("select sum(quantity)::int as v from inventory i join product_variants v on i.variant_id=v.id join products p on v.product_id=p.id where p.slug='import-real-madrid'")).toBe(0);
  });
  it('rejects non-admin RPC and direct stock writes',async()=>{
    await db.exec('set role authenticated');
    await expect(db.query('update inventory set quantity=999')).rejects.toThrow('permission denied');
    await db.exec('reset role');await db.exec("select set_config('test.uid','',false)");
    await expect(adjustment(99,1)).rejects.toThrow('Admin access');
    await db.query("select set_config('test.uid',$1,false)",[admin]);
  });
  it('queues catalog text and never serves draft products; returns current stock',async()=>{
    const data=await value("select search_catalog_knowledge('Spain') as v") as {variants:{sizes:{available:number}[]}[]}[];
    expect(data[0].variants[0].sizes[0].available).toBe(7);
    expect(await value("select search_catalog_knowledge('Real Madrid') as v")).toEqual([]);
    const jobs=await value('select claim_knowledge_jobs() as v') as {id:string;hash:string;lease:string}[];
    expect(jobs.length).toBeGreaterThan(0);
    const job=jobs[0];expect(await value('select finish_knowledge_job($1,$2,$3,$4) as v',[job.id,'wrong',job.lease,'[]'])).toBe(false);
  });
  it('saves admin orders atomically when an item fails stock validation',async()=>{
    const order={order_number:'TEST-ATOMIC',customer_name:'Atomic',customer_phone:'0',customer_email:null,country:'UAE',region:'Dubai',delivery_address:'Test',subtotal:60,delivery_fee:0,total:60,status:'paid',delivery_status:'pending',payment_method:'cod',customer_note:null,admin_note:null};
    const item={product_id:product,variant_id:variant,product_name:'Spain',kit_name:'Home',size:'S',custom_name:null,custom_number:null,font_slug:null,arm_badge:null,customization_fee:0,arm_badge_fee:0,quantity:1,unit_price:60,line_total:60};
    const saved=await value('select save_admin_order($1,$2) as v',[JSON.stringify(order),JSON.stringify([item])]) as {id:string};
    expect(await value('select quantity as v from inventory where id=$1',[inventory])).toBe(6);
    await expect(value('select save_admin_order($1,$2) as v',[JSON.stringify({...order,id:saved.id,customer_name:'Should roll back',subtotal:5940,total:5940}),JSON.stringify([{...item,quantity:99,line_total:5940}])])).rejects.toThrow('Insufficient stock');
    expect(await value('select customer_name as v from orders where id=$1',[saved.id])).toBe('Atomic');
    expect(await value('select quantity as v from inventory where id=$1',[inventory])).toBe(6);
    await value('select delete_admin_order($1) as v',[saved.id]);
    expect(await value('select quantity as v from inventory where id=$1',[inventory])).toBe(7);
  });
  it('guards a clean rebuild with a backup and restores orders without double-deducting stock',async()=>{
    const customer='00000000-0000-4000-8000-000000000002';
    await db.query('insert into auth.users(id) values($1)',[customer]);
    const prepared=await value('select prepare_commerce_rebuild() as v') as {id:string;sha256:string;backup:{version:number;counts:{orders:number};catalogReferences:unknown[]}};
    expect(prepared.backup.version).toBe(2);
    expect(prepared.backup.counts.orders).toBe(1);
    expect(prepared.backup.catalogReferences).toHaveLength(1);

    await expect(value('select clean_commerce_data($1,$2) as v',[prepared.id,'wrong-hash'])).rejects.toThrow('matching order backup');
    expect(await value('select clean_commerce_data($1,$2) as v',[prepared.id,prepared.sha256])).toMatchObject({status:'cleaned'});
    expect(await value('select count(*)::int as v from orders')).toBe(0);
    expect(await value('select count(*)::int as v from products')).toBe(0);
    expect(await value('select count(*)::int as v from auth.users')).toBe(1);
    expect(await value('select count(*)::int as v from auth.users where id=$1',[admin])).toBe(1);

    const replacementProduct=await value("insert into products(slug,name,team,category,base_price,status,sleeve) values('test-spain','Spain Jersey','Spain','Test',60,'active','short') returning id as v") as string;
    const replacementVariant=await value("insert into product_variants(product_id,kit,name,price) values($1,'home','Spain Home',60) returning id as v",[replacementProduct]) as string;
    const replacementInventory=await value("insert into inventory(variant_id,size,quantity) values($1,'S',7) returning id as v",[replacementVariant]) as string;

    expect(await value('select restore_rebuild_orders($1) as v',[prepared.id])).toMatchObject({status:'orders_restored',orders:1,items:1,unmappedItems:0});
    expect(await value('select quantity as v from inventory where id=$1',[replacementInventory])).toBe(7);
    expect(await value('select variant_id as v from order_items limit 1')).toBe(replacementVariant);
    await db.query("update orders set status='cancelled'");
    expect(await value('select quantity as v from inventory where id=$1',[replacementInventory])).toBe(9);
  });
});
