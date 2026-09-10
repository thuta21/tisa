import { canonicalSize, normalize, type Product, type SourceRow, type ImportTarget } from './types';
const aliases:Record<string,string>={'man u':'manchester united','manu':'manchester united','mancity':'manchester city','sp ur':'tottenham hotspur','spur':'tottenham hotspur','miami':'inter miami','atltie':'atletico madrid','bayern munchen':'bayern munich'};
export function identify(name:string) {
  const n=normalize(name);
  if (n.startsWith('man chester city longsleeve')) {
    return {kit:'home' as const,team:'manchester city',sleeve:'long'};
  }
  const kit=n.match(/\b(home|away|third)\b/)?.[1] as 'home'|'away'|'third'|undefined;
  if(!kit) throw new Error(`Cannot identify kit for ${name}. Supply variant_id or SKU.`);
  const team=n.split(new RegExp(`\\b${kit}\\b`))[0].trim();
  return {kit,team:aliases[team]??team,sleeve:/long\s*sleeve/.test(n)?'long':'short'};
}
export function matchInventory(rows:SourceRow[],products:Product[],savedAliases:{source_name:string;variant_id:string}[]) {
  const targets:ImportTarget[]=[];const issues:string[]=[];const seen=new Set<string>();
  const variants=products.flatMap(p=>p.product_variants.map(v=>({p,v})));
  for(const row of rows) {
    try {
      let found:typeof variants[number]|undefined;
      if(row.variantId) {found=variants.find(x=>x.v.id===row.variantId);if(!found)throw new Error('Unknown variant ID.');}
      if(row.sku) {const sku=variants.filter(x=>normalize(x.v.sku??'')===normalize(row.sku!)); if(sku.length!==1)throw new Error('SKU is unknown or ambiguous.'); if(found&&found.v.id!==sku[0].v.id)throw new Error('ID and SKU disagree.');found=sku[0];}
      if(!found) { const alias=savedAliases.find(a=>a.source_name===normalize(row.name)); if(alias)found=variants.find(x=>x.v.id===alias.variant_id); }
      let identity=found?{kit:found.v.kit,team:found.p.team,sleeve:found.p.sleeve}:identify(row.name);
      let parent=found?.p;
      if(!found) {
        const candidates=products.filter(p=> (aliases[normalize(p.team)]??normalize(p.team))===identity.team && (p.sleeve??'short')===identity.sleeve && (!row.season||normalize(p.season??'')===normalize(row.season)));
        if(candidates.length>1)throw new Error('Multiple seasons/styles match. Supply variant_id or SKU.');
        parent=candidates[0];
        const v=parent?.product_variants.find(v=>v.kit===identity.kit);
        if(parent&&v)found={p:parent,v};
      }
      if(found)identity={kit:found.v.kit,team:found.p.team,sleeve:found.p.sleeve};
      const size=canonicalSize(row.size);
      const inventory=found?.v.inventory.filter(s=>canonicalSize(s.size)===size)??[];
      if(inventory.length>1)throw new Error('Multiple inventory size aliases match.');
      const stock=inventory[0];
      if(row.expectedVersion!==undefined && row.expectedVersion!==(stock?.version??0))throw new Error('Export is stale; stock version changed.');
      if(row.quantity<(stock?.reserved??0))throw new Error('Balance is below reserved quantity.');
      const slug=parent?.slug??('import-'+identity.team+'-'+identity.sleeve+(row.season?'-'+row.season:'-unassigned')).replace(/[^a-z0-9]+/g,'-');
      const key=`${found?.v.id??slug+identity.kit}:${size}`;
      if(seen.has(key))throw new Error('Duplicate target variant/size; distinct source styles need explicit mapping.');
      seen.add(key);
      targets.push({...row,size,variantId:found?.v.id,productId:parent?.id,inventoryId:stock?.id,expectedVersion:stock?.version??0,before:stock?.quantity??0,reserved:stock?.reserved??0,...identity,productSlug:slug,
        sourceAlias:row.variantId||row.sku?undefined:row.name,action:stock?'update':'create'});
    }catch(e){issues.push(`Row ${row.row}: ${(e as Error).message}`);}
  }
  return {rows:targets,issues};
}
