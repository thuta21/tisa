'use client';
import { useEffect,useMemo,useState } from 'react';
import type { Product,Stock,Variant,ImportPreview } from '@/lib/inventory/types';

async function api(url:string,options?:RequestInit){const response=await fetch(url,options);const data=await response.json();if(!response.ok)throw new Error(data.error??'Request failed');return data;}
const button='inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors hover:border-primary/50 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40';
const input='h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary';
type Row={p:Product;v:Variant;s:Stock};
type VariantGroup={v:Variant;rows:Row[]};
type ProductGroup={p:Product;variants:Map<string,VariantGroup>;quantity:number;reserved:number;available:number};
type Movement={id:string;before_quantity:number;after_quantity:number;reason:string;created_at:string;order_id:string|null};
const sizesOrder=new Map(['S','M','L','XL','2XL'].map((size,index)=>[size,index]));
const available=({v,s}:Row)=>v.available&&s.is_active?Math.max(0,s.quantity-s.reserved):0;
export default function InventoryWorkspace(){
  const [products,setProducts]=useState<Product[]>([]);const [error,setError]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState('');const [filter,setFilter]=useState('all');const [status,setStatus]=useState('all');const [activity,setActivity]=useState('all');const [page,setPage]=useState(0);
  const [selected,setSelected]=useState<Row|null>(null);const [quantity,setQuantity]=useState('');const [operation,setOperation]=useState('set');const [reason,setReason]=useState('');const [history,setHistory]=useState<Movement[]>([]);
  const [preview,setPreview]=useState<ImportPreview|null>(null);const [lastImport,setLastImport]=useState<string|null>(null);
  const [indexStatus,setIndexStatus]=useState<{status:string;count:number}[]>([]);
  const load=async()=>{const data=await api('/api/admin/inventory');setProducts(data);};
  useEffect(()=>{let active=true;api('/api/admin/inventory').then(data=>{if(active)setProducts(data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});api('/api/admin/knowledge').then(data=>{if(active)setIndexStatus(data);}).catch(()=>{});return()=>{active=false;};},[]);
  const rows=useMemo(()=>products.flatMap(p=>p.product_variants.flatMap(v=>v.inventory.map(s=>({p,v,s})))),[products]);
  const filtered=useMemo(()=>rows.filter(r=>(!query||`${r.p.name} ${r.v.name} ${r.v.sku??''} ${r.s.size}`.toLowerCase().includes(query.toLowerCase()))&&(status==='all'||r.p.status===status)&&(activity==='all'||(activity==='active'?r.s.is_active&&r.v.available:!r.s.is_active||!r.v.available))&&(filter==='all'||(filter==='low'?available(r)>0&&available(r)<=8:available(r)===0))),[activity,filter,query,rows,status]);
  const groups=useMemo(()=>{
    const grouped=new Map<string,ProductGroup>();
    for(const row of filtered){
      let productGroup=grouped.get(row.p.id);
      if(!productGroup){productGroup={p:row.p,variants:new Map(),quantity:0,reserved:0,available:0};grouped.set(row.p.id,productGroup);}
      let variantGroup=productGroup.variants.get(row.v.id);
      if(!variantGroup){variantGroup={v:row.v,rows:[]};productGroup.variants.set(row.v.id,variantGroup);}
      variantGroup.rows.push(row);productGroup.quantity+=row.s.quantity;productGroup.reserved+=row.s.reserved;productGroup.available+=available(row);
    }
    for(const group of grouped.values())for(const variant of group.variants.values())variant.rows.sort((a,b)=>(sizesOrder.get(a.s.size)??99)-(sizesOrder.get(b.s.size)??99));
    return Array.from(grouped.values());
  },[filtered]);
  const pages=Math.max(1,Math.ceil(groups.length/10));const currentPage=Math.min(page,pages-1);const visibleGroups=groups.slice(currentPage*10,currentPage*10+10);
  async function edit(row:Row){setSelected(row);setQuantity(String(row.s.quantity));setReason('');setOperation('set');setHistory([]);setError('');try{setHistory(await api(`/api/admin/inventory?history=${row.s.id}`));}catch(e){setError((e as Error).message);}}
  async function save(){if(!selected)return;setBusy(true);setError('');try{await api('/api/admin/inventory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({inventoryId:selected.s.id,expectedVersion:selected.s.version,operation,quantity:Number(quantity),reason,idempotencyKey:crypto.randomUUID()})});await load();setSelected(null);setMessage('Stock adjustment saved.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function upload(file:File){setBusy(true);setError('');setMessage('');setPreview(null);try{const form=new FormData();form.set('file',file);setPreview(await api('/api/admin/inventory/import',{method:'POST',body:form}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function commit(undo=false){const id=undo?lastImport:preview?.id;if(!id)return;setBusy(true);setError('');try{const result=await api('/api/admin/inventory/import',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,undo})});await load();setMessage(undo?'Import reversed through audited adjustments.':`Imported ${result.count} size balances. New products remain drafts; new kits remain disabled until priced.`);setLastImport(undo?null:id);setPreview(null);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const exportUrl='/api/admin/inventory/export?'+new URLSearchParams({q:query,filter,status,activity});
  if(loading)return <section aria-busy="true" aria-live="polite" className="space-y-5"><span className="sr-only">Loading inventory</span><div className="flex items-center justify-between"><div className="h-14 w-56 animate-pulse rounded-xl bg-neutral-200"/><div className="h-11 w-40 animate-pulse rounded-xl bg-neutral-200"/></div><div className="grid gap-2 sm:grid-cols-4">{[0,1,2,3].map(item=><div key={item} className="h-11 animate-pulse rounded-lg bg-neutral-200"/>)}</div><div className="h-[28rem] animate-pulse rounded-xl bg-neutral-200"/></section>;
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Inventory</h2><p className="text-sm text-muted-foreground">{rows.reduce((n,r)=>n+available(r),0)} available units · {products.length} products</p></div><div className="flex flex-wrap gap-2"><a className={button} href="/api/admin/inventory/template">Clean import template</a><a className={button} href="/api/admin/inventory/export">Export all Excel</a><a className={button} href={exportUrl}>Export filtered</a><label className={button}>Import Excel<input aria-label="Import inventory Excel" type="file" accept=".xlsx" disabled={busy} className="sr-only" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}}/></label></div></div>
    {error&&<p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message&&<p role="status" className="rounded-lg border p-3 text-sm">{message}</p>}
    <div className="grid gap-2 sm:grid-cols-4"><input aria-label="Search inventory" placeholder="Search product, SKU or size" className={input} value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/><select aria-label="Stock filter" className={input} value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}}><option value="all">All stock</option><option value="low">Low stock (1–8)</option><option value="out">Out of stock</option></select><select aria-label="Product status" className={input} value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="all">All statuses</option><option value="active">Active products</option><option value="draft">Draft products</option><option value="archived">Archived products</option></select><select aria-label="Inventory activity" className={input} value={activity} onChange={e=>{setActivity(e.target.value);setPage(0);}}><option value="all">All availability</option><option value="active">Enabled sizes</option><option value="inactive">Disabled sizes</option></select></div>
    {visibleGroups.length?(
      <div className="space-y-4">
        {visibleGroups.map(group=><article key={group.p.id} className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          <header className="flex flex-col gap-4 border-b border-border bg-muted/25 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-bold sm:text-lg">{group.p.name}</h3>
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{group.p.sleeve} sleeve</span>
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{group.p.status}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{group.variants.size} kit{group.variants.size===1?'':'s'} · {Array.from(group.variants.values()).reduce((count,variant)=>count+variant.rows.length,0)} sizes</p>
            </div>
            <dl className="grid grid-cols-3 gap-2 sm:min-w-[330px]">
              {[['Quantity',group.quantity],['Reserved',group.reserved],['Available',group.available]].map(([label,value])=><div key={String(label)} className="rounded-xl border border-border bg-background px-3 py-2"><dt className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt><dd className="mt-0.5 text-lg font-bold">{value}</dd></div>)}
            </dl>
          </header>
          <div className="divide-y divide-border">
            {Array.from(group.variants.values()).map(({v,rows:variantRows})=><section key={v.id} className="p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{v.kit} kit</p><h4 className="mt-0.5 font-semibold">{v.name}</h4></div>
                <p className="text-xs text-muted-foreground">{v.sku??'No SKU'}{!v.available?' · Variant inactive':''}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                {variantRows.map(row=>{const count=available(row);const inactive=!row.v.available||!row.s.is_active;return <div key={row.s.id} className={`rounded-xl border p-3 ${inactive?'border-dashed bg-muted/20':count===0?'border-red-200 bg-red-50/50':'border-border bg-background'}`}>
                  <div className="flex items-start justify-between gap-2"><div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Size</p><strong className="text-base">{row.s.size}</strong></div><div className="text-right"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Available</p><strong className={count===0?'text-red-700':'text-foreground'}>{count}</strong></div></div>
                  <div className="mt-3 flex items-end justify-between gap-2 border-t border-border pt-2"><p className="text-[10px] leading-5 text-muted-foreground">Qty {row.s.quantity}<br/>Reserved {row.s.reserved}</p><button className="rounded-full border border-border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] hover:border-primary/50" onClick={()=>void edit(row)}>Edit</button></div>
                </div>;})}
              </div>
            </section>)}
          </div>
        </article>)}
      </div>
    ):<div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center"><h3 className="font-bold">No matching inventory</h3><p className="mt-1 text-sm text-muted-foreground">Change the search or filters to see other product groups.</p></div>}
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"><button className={button} disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Previous</button><span className="text-center text-xs font-medium text-muted-foreground">Page {currentPage+1} of {pages} · {groups.length} products · {filtered.length} sizes</span><button className={button} disabled={currentPage+1>=pages} onClick={()=>setPage(currentPage+1)}>Next</button></div>
    {preview&&<section className="rounded-xl border p-4 space-y-3"><h3 className="font-bold">Import preview · {preview.fileName}</h3><p className="text-sm">{preview.rows.length} size balances. Only listed quantities change. Missing products are drafts; reserved stock stays unchanged.</p>{preview.issues.map((issue,i)=><p key={i} className="text-sm text-red-700">{issue}</p>)}<div className="max-h-80 overflow-auto"><table className="w-full text-sm text-left"><thead><tr>{['Source row','Item','Size','Before','After','Action'].map(h=><th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{preview.rows.map((r,i)=><tr key={i}><td className="p-2">{r.row}</td><td>{r.name}</td><td>{r.size}</td><td>{r.before}</td><td>{r.quantity}</td><td>{r.action}</td></tr>)}</tbody></table></div><div className="flex gap-2"><button className={button} disabled={busy||!preview.id||preview.issues.length>0} onClick={()=>void commit()}>Commit import</button><button className={button} disabled={busy} onClick={()=>setPreview(null)}>Close</button></div></section>}
    {lastImport&&<button className={button} disabled={busy} onClick={()=>void commit(true)}>Undo last import (only unchanged stock)</button>}
    <section className="rounded-xl border p-4"><h3 className="font-bold">Knowledge index</h3><p className="text-sm">{indexStatus.length?indexStatus.map(s=>`${s.status}: ${s.count}`).join(' · '):'No indexing status available. Apply migrations and deploy the worker.'}</p><button className={button} disabled={busy} onClick={async()=>{setBusy(true);try{await api('/api/admin/knowledge',{method:'POST'});setMessage('Catalog queued for indexing.');setIndexStatus(await api('/api/admin/knowledge'));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Reindex catalog</button></section>
    {selected&&<div className="fixed inset-0 z-50 flex justify-end bg-black/40" onKeyDown={e=>{if(e.key==='Escape'&&!busy)setSelected(null);}}><section role="dialog" aria-modal="true" aria-label="Edit stock" className="w-full max-w-lg overflow-auto bg-background p-6 shadow-xl"><div className="flex justify-between"><h3 className="font-bold">{selected.p.name}</h3><button className={button} disabled={busy} onClick={()=>setSelected(null)}>Close</button></div><p className="my-3">{selected.v.name} · {selected.s.size} · Reserved: {selected.s.reserved}</p><label className="block my-3">Operation<select className={input} value={operation} onChange={e=>setOperation(e.target.value)}><option value="set">Set balance</option><option value="add">Add stock</option><option value="remove">Remove stock</option></select></label><label className="block my-3">Quantity<input autoFocus type="number" min="0" step="1" className={input} value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label className="block my-3">Reason<input className={input} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>{error&&<p role="alert" className="text-red-700 my-2">{error}</p>}<button className={button} disabled={busy||!reason.trim()||quantity===''||!Number.isInteger(Number(quantity))||Number(quantity)<0} onClick={()=>void save()}>Save adjustment</button><button className={button} disabled={busy} onClick={async()=>{try{const updated:Product[]=await api('/api/admin/inventory');setProducts(updated);const s=updated.flatMap(p=>p.product_variants.flatMap(v=>v.inventory)).find(s=>s.id===selected.s.id);if(s)setSelected({...selected,s});setError('');}catch(e){setError((e as Error).message);}}}>Refresh version</button><h4 className="font-bold mt-6 mb-3">Recent movements</h4>{history.map(h=><article className="border-t py-3 text-sm" key={h.id}><p>{h.before_quantity} → {h.after_quantity} · {h.reason}</p><p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}{h.order_id?` · Order ${h.order_id}`:''}</p></article>)}</section></div>}
  </section>;
}
