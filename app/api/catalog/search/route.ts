import {createSupabaseServerClient} from '@/lib/supabase/server';
export async function GET(request:Request){
  const params=new URL(request.url).searchParams;const query=params.get('q')?.trim();const team=params.get('team');
  if(!query||query.length>500)return Response.json({error:'Query must contain 1–500 characters'},{status:400});
  const secret=process.env.RAG_WORKER_SECRET;
  if(secret){try{const response=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/catalog-knowledge`,{method:'POST',headers:{'Content-Type':'application/json','x-worker-secret':secret},body:JSON.stringify({action:'search',query,team}),signal:AbortSignal.timeout(8000)});if(response.ok)return Response.json({mode:'hybrid',results:await response.json()},{headers:{'Cache-Control':'no-store'}});}catch{/* Exact/keyword fallback remains available during worker outages. */}}
  const db=await createSupabaseServerClient();const {data,error}=await db.rpc('search_catalog_knowledge',{p_query:query,p_team:team});
  if(error)return Response.json({error:'Catalog search unavailable'},{status:503});
  return Response.json({mode:'keyword',results:data},{headers:{'Cache-Control':'no-store'}});
}
