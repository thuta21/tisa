import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const model=new Supabase.ai.Session('gte-small');
const embed=async(content:string):Promise<number[]>=>await model.run(content,{mean_pool:true,normalize:true});
Deno.serve(async(request:Request)=>{
  const secret=Deno.env.get('RAG_WORKER_SECRET');
  if(!secret||request.headers.get('x-worker-secret')!==secret)return new Response('Unauthorized',{status:401});
  try{
    const body=await request.json();
    if(body.action==='search'){
      if(typeof body.query!=='string'||!body.query.trim()||body.query.length>500)return new Response('Invalid query',{status:400});
      const vector=await embed(body.query);
      const {data,error}=await db.rpc('search_catalog_knowledge',{p_query:body.query,p_embedding:JSON.stringify(vector),p_team:body.team??null});
      if(error)throw error;return Response.json(data);
    }
    const {data:jobs,error}=await db.rpc('claim_knowledge_jobs');if(error)throw error;
    for(const job of jobs){
      try{
        const words=job.content.split(/\s+/);const chunks=[];
        for(let i=0;i<words.length;i+=160){const content=words.slice(i,i+200).join(' ');chunks.push({index:chunks.length,content,embedding:JSON.stringify(await embed(content))});}
        const result=await db.rpc('finish_knowledge_job',{p_id:job.id,p_hash:job.hash,p_lease:job.lease,p_chunks:chunks});if(result.error)throw result.error;
      }catch(e){await db.rpc('finish_knowledge_job',{p_id:job.id,p_hash:job.hash,p_lease:job.lease,p_chunks:[],p_error:String(e)});}
    }
    return Response.json({processed:jobs.length});
  }catch{return Response.json({error:'Knowledge processing failed'},{status:500});}
});
