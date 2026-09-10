import { createHash } from 'node:crypto';
import { adminClient,apiError,catalog } from '@/lib/inventory/server';
import { MAX_FILE_BYTES,parseInventoryWorkbook } from '@/lib/inventory/workbook';
import { matchInventory } from '@/lib/inventory/matching';

export async function POST(request:Request) {
  try {
    const db=await adminClient(request);
    if(Number(request.headers.get('content-length')??0)>MAX_FILE_BYTES+65536)throw new Error('Maximum file size is 10 MB.');
    const form=await request.formData();const file=form.get('file');
    if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.xlsx')||file.size>MAX_FILE_BYTES)throw new Error('Choose an .xlsx file no larger than 10 MB.');
    const bytes=new Uint8Array(await file.arrayBuffer());
    const hash=createHash('sha256').update(bytes).digest('hex');
    const {data:previous,error:previousError}=await db.from('inventory_imports').select('id,result').eq('source_hash',hash).eq('status','committed').maybeSingle();
    if(previousError)throw previousError;
    if(previous)return Response.json({id:previous.id,rows:[],issues:['This workbook has already been committed.'],fileName:file.name,duplicate:true});
    const parsed=parseInventoryWorkbook(bytes);
    const {data:aliases,error}=await db.from('inventory_aliases').select('*');if(error)throw error;
    const matched=matchInventory(parsed.rows,await catalog(db),aliases??[]);
    const issues=[...parsed.issues,...matched.issues];
    let id=null;
    if(!issues.length){
      // Older database functions treated every display name as an alias. Clean
      // exports use repeated labels such as "Home Player Version", so omit that
      // label from the commit payload when a stable ID did the matching.
      const commitRows=matched.rows.map(row=>row.variantId&&!row.sourceAlias?{...row,name:''}:row);
      const result=await db.from('inventory_imports').insert({source_hash:hash,file_name:file.name,payload:{rows:commitRows}}).select('id').single();if(result.error)throw result.error;id=result.data.id;
    }
    return Response.json({id,rows:matched.rows,issues,fileName:file.name});
  }catch(e){return apiError(e);}
}
export async function PUT(request:Request) {
  try {const db=await adminClient(request);const {id,undo}=await request.json();const {data,error}=await db.rpc(undo?'reverse_inventory_import':'commit_inventory_import',{p_id:id});if(error)throw error;return Response.json(data);}
  catch(e){return apiError(e);}
}
