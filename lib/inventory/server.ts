import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Product } from './types';
import { assertSameOrigin, RequestError } from '@/lib/security/request';

export async function adminContext(request?:Request) {
  if(request) assertSameOrigin(request);
  const db=await createSupabaseServerClient();
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError || !user) throw new RequestError('Authentication required',401);
  const {data,error}=await db.from('profiles').select('role').eq('id',user.id).single();
  if(error || data?.role!=='admin') throw new RequestError('Admin access required',403);
  return {db,user};
}
export async function adminClient(request?:Request) { return (await adminContext(request)).db; }
export function apiError(error:unknown) {
  if(error instanceof RequestError) return Response.json({error:error.message},{status:error.status,headers:{'Cache-Control':'private, no-store'}});
  const e=(error??{}) as {message?:string;code?:string};
  const message=e.message??'Request failed';
  const status=e.code==='40001'||e.code==='23505'?409:/Authentication/.test(message)?401:/Admin access|Forbidden/.test(message)?403:400;
  const safeMessage=e.code==='23505'?'This record already exists. Reload and try again.':e.code==='23503'?'This record is linked to another record. Review the selection and try again.':e.code&&e.code!=='40001'&&e.code!=='P0001'&&e.code!=='22023'?'The database request could not be completed. Check that migrations are applied.':message;
  return Response.json({error:safeMessage},{status,headers:{'Cache-Control':'private, no-store'}});
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
