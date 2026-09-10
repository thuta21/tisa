import { adminClient,apiError,catalog } from '@/lib/inventory/server';
export async function GET(request:Request) {
  try {
    const db=await adminClient(); const id=new URL(request.url).searchParams.get('history');
    if(id){const {data,error}=await db.from('inventory_movements').select('*').eq('inventory_id',id).order('created_at',{ascending:false}).limit(100);if(error)throw error;return Response.json(data);}
    return Response.json(await catalog(db),{headers:{'Cache-Control':'no-store'}});
  }catch(e){return apiError(e);}
}
export async function POST(request:Request) {
  try {const db=await adminClient(request);const body=await request.json();const {data,error}=await db.rpc('adjust_inventory',{p_request:body});if(error)throw error;return Response.json(data);}
  catch(e){return apiError(e);}
}
