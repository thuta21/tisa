import {createHash} from 'node:crypto';
import {adminClient,apiError,catalog} from '@/lib/inventory/server';
import {parseProductImportFile,type ProductImportReference} from '@/lib/product-import';
import {checkWorkbookSize} from '@/lib/inventory/workbook';
export async function POST(request:Request){try{
  const db=await adminClient(request);
  if(Number(request.headers.get('content-length')??0)>10*1024*1024+65536)throw new Error('Maximum file size is 10 MB.');
  const form=await request.formData();const file=form.get('file');if(!(file instanceof File)||file.size>10*1024*1024)throw new Error('Choose an Excel file up to 10 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer());checkWorkbookSize(bytes);
  const results=await Promise.all([db.from('leagues').select('*'),db.from('teams').select('*,leagues(name)'),db.from('seasons').select('*'),db.from('jersey_sizes').select('*')]);
  for(const result of results)if(result.error)throw result.error;
  const reference:ProductImportReference={leagues:results[0].data!,teams:results[1].data!,seasons:results[2].data!,sizes:results[3].data!};
  const products=await catalog(db);
  const preview=await parseProductImportFile(file,reference,products);
  if(preview.totalRows>500)throw new Error('Maximum 500 products per import.');
  let id=null;
  if(!preview.issues.length){
    const records=preview.rows.map(row=>{
      const current=products.find(p=>p.id===row.existingProductId);
      const league=reference.leagues.find(l=>l.name.toLowerCase()===row.leagueName.toLowerCase());
      const team=reference.teams.find(t=>t.league_id===league?.id&&t.name.toLowerCase()===row.teamName.toLowerCase());
      const season=reference.seasons.find(s=>s.name.toLowerCase()===row.seasonName.toLowerCase());
      return {id:row.existingProductId,expectedUpdatedAt:(current as unknown as {updated_at:string})?.updated_at,metadata:{slug:row.slug,name:row.name,sleeve:row.sleeve,league_id:league?.id??null,team_id:team?.id??null,season_id:season?.id??null,team:team?.name??(row.teamName||'Unassigned'),category:league?.name??(row.leagueName||'Unassigned'),season:season?.name??null,base_price:row.basePrice,status:row.status,...(row.collection?{collection:row.collection}:{}),...(row.description?{description:row.description}:{}),...(row.fabric?{fabric:row.fabric}:{}),...(current?{}:{featured:row.featured})},variants:Object.values(row.variants).filter(v=>v.available||Boolean(v.name||v.sku||v.image_front_path||v.image_back_path||v.image_arm_path||v.price!==null)).map(v=>({kit:v.kit,name:v.name||v.kit,sku:v.sku,price:v.price??row.basePrice,available:v.available,...(v.image_front_path?{image_front_path:v.image_front_path}:{}),...(v.image_back_path?{image_back_path:v.image_back_path}:{}),...(v.image_arm_path?{image_arm_path:v.image_arm_path}:{}),stock:[]}))};
    });
    const hash=createHash('sha256').update(bytes).digest('hex');
    const {data:prior,error:priorError}=await db.from('inventory_imports').select('id').eq('source_hash',hash).eq('status','committed').maybeSingle();if(priorError)throw priorError;if(prior)throw new Error('This workbook has already been imported.');
    const {data,error}=await db.from('inventory_imports').insert({source_hash:hash,file_name:file.name,payload:{products:records}}).select('id').single();if(error)throw error;id=data.id;
  }
  return Response.json({...preview,id});
}catch(e){return apiError(e);}}
export async function PUT(request:Request){try{const db=await adminClient(request);const {id}=await request.json();const {data,error}=await db.rpc('commit_catalog_import',{p_id:id});if(error)throw error;return Response.json(data);}catch(e){return apiError(e);}}
