import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Product } from './types';

export async function adminClient(request?:Request) {
  if(request && request.method!=='GET') {
    const origin=request.headers.get('origin');
    if(origin && origin!==new URL(request.url).origin) throw new Error('Forbidden origin');
  }
  const db=await createSupabaseServerClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user) throw new Error('Authentication required');
  const {data}=await db.from('profiles').select('role').eq('id',user.id).single();
  if(data?.role!=='admin') throw new Error('Admin access required');
  return db;
}
export function apiError(error:unknown) {
  const e=error as {message?:string;code?:string};
  const message=e.message??'Request failed';
  return Response.json({error:message},{status:e.code==='40001'||e.code==='23505'?409:/Authentication/.test(message)?401:/Admin access|Forbidden/.test(message)?403:400});
}
export async function catalog(db:Awaited<ReturnType<typeof adminClient>>) {
  const all:Product[]=[];
  for(let offset=0;;offset+=500){
    const {data,error}=await db.from('products').select('*,product_variants(*,inventory(*))').order('id').range(offset,offset+499);
    if(error)throw error;
    all.push(...data as Product[]);if(data.length<500)break;
  }
  return all;
}
