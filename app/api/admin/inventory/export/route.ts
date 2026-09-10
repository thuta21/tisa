import { adminClient,apiError,catalog } from '@/lib/inventory/server';
import { makeWorkbook } from '@/lib/inventory/workbook';
export async function GET(request:Request) {
  try {
    const db=await adminClient();const params=new URL(request.url).searchParams;
    const products=await catalog(db);const q=(params.get('q')??'').toLowerCase();const filter=params.get('filter');const status=params.get('status');const activity=params.get('activity');
    const rows=products.flatMap(p=>p.product_variants.flatMap(v=>v.inventory.map(s=>({inventory_id:s.id,product_id:p.id,variant_id:v.id,sku:v.sku??'',item_name:v.name,product_name:p.name,season:p.season??'',sleeve:p.sleeve,status:p.status,kit:v.kit,size:s.size,quantity:s.quantity,reserved:s.reserved,available:s.is_active&&v.available?Math.max(0,s.quantity-s.reserved):0,version:s.version,is_active:s.is_active,variant_available:v.available,snapshot_at:new Date().toISOString()}))))
      .filter(r=>(!q||`${r.product_name} ${r.item_name} ${r.sku} ${r.size}`.toLowerCase().includes(q))&&(!status||status==='all'||r.status===status)&&(!activity||activity==='all'||(activity==='active'?r.is_active&&r.variant_available:!r.is_active||!r.variant_available))&&(!filter||filter==='all'||(filter==='low'?r.available>0&&r.available<=8:r.available===0)));
    const {data:imports,error}=await db.from('inventory_imports').select('id,file_name,status,created_at,committed_at,result').order('created_at',{ascending:false}).limit(100);if(error)throw error;
    const bytes=makeWorkbook({Inventory:rows.length?rows:[{variant_id:'',sku:'',item_name:'',size:'',quantity:'',version:''}],Products:products.map(p=>({id:p.id,slug:p.slug,product_name:p.name,team:p.team,season:p.season??'',sleeve:p.sleeve,status:p.status,base_price:p.base_price})),Reference:[{field:'quantity',meaning:'Explicit 0 clears stock; blank leaves unchanged. Reserved and available are read-only.'},{field:'version',meaning:'Must match current stock version.'},{field:'XXL',meaning:'Maps to 2XL.'}], 'Import Results':(imports??[]).map(i=>({...i,result:JSON.stringify(i.result)}))});
    return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="TISA_Inventory.xlsx"','Cache-Control':'no-store'}});
  }catch(e){return apiError(e);}
}
