import {describe,it,expect} from 'vitest';
import * as XLSX from 'xlsx';
import {parseInventoryWorkbook,makeWorkbook} from '../lib/inventory/workbook';
import {matchInventory,identify} from '../lib/inventory/matching';
import type {Product} from '../lib/inventory/types';
const workbook=(rows:unknown[][])=>{const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),'Stock');return XLSX.write(book,{type:'buffer',bookType:'xlsx'});};
describe('inventory workbook',()=>{
  it('reads balance only and normalizes XXL',()=>{
    const result=parseInventoryWorkbook(workbook([['Stock Balance'],['Item Name','S','M','L','XL','XXL','Balance Qty'],['Real Madrid Home',1,2,3,4,5,15]]));
    expect(result.issues).toEqual([]);expect(result.rows).toHaveLength(5);expect(result.rows[4]).toMatchObject({size:'2XL',quantity:5});
  });
  it('rejects inconsistent and blank source sizes',()=>{
    expect(parseInventoryWorkbook(workbook([['Item Name','S','M','L','XL','XXL','Balance Qty'],['Spain Home',1,1,1,1,1,9]])).issues[0]).toContain('total');
    expect(parseInventoryWorkbook(workbook([['Item Name','S','M','L','XL','XXL','Balance Qty'],['Spain Home','',1,1,1,1,4]])).issues[0]).toContain('missing');
  });
  it('round trips zeros and omits blank quantities',()=>{
    const result=parseInventoryWorkbook(makeWorkbook({Inventory:[{variant_id:'test',item_name:'Spain Home',size:'XXL',quantity:0,version:3},{variant_id:'test',item_name:'Spain Home',size:'S',quantity:'',version:3}]}));
    expect(result.issues).toEqual([]);expect(result.rows).toEqual([{row:2,variantId:'test',sku:undefined,name:'Spain Home',size:'2XL',quantity:0,expectedVersion:3,season:undefined}]);
  });
  it('keeps longsleeve separate and resolves aliases',()=>{
    expect(identify('Man U Home (Red)')).toMatchObject({team:'manchester united',kit:'home',sleeve:'short'});
    expect(identify('Real Madrid Home Longsleeve (White)')).toMatchObject({team:'real madrid',sleeve:'long'});
    expect(identify('Man Chester City Longsleeve (Skyblue)')).toMatchObject({team:'manchester city',kit:'home',sleeve:'long'});
  });
  it('does not silently match ambiguous seasons or overwrite stale exports',()=>{
    const product={id:'p',slug:'spain',name:'Spain',team:'Spain',sleeve:'short',season:'2026',product_variants:[{id:'v',kit:'home',inventory:[{id:'i',size:'S',quantity:5,reserved:0,version:2}]}]} as Product;
    const row={row:2,name:'Spain Home',size:'S',quantity:3};
    expect(matchInventory([row],[product,{...product,id:'p2',season:'2025'}],[]).issues[0]).toContain('Multiple');
    expect(matchInventory([{...row,variantId:'v',expectedVersion:1}],[product],[]).issues[0]).toContain('stale');
  });
  it('only persists aliases discovered from source names',()=>{
    const product={id:'p',slug:'spain',name:'Spain',team:'Spain',sleeve:'short',season:'2026',product_variants:[{id:'v',kit:'home',inventory:[{id:'i',size:'S',quantity:5,reserved:0,version:2}]}]} as Product;
    expect(matchInventory([{row:2,name:'Home Player Version',variantId:'v',size:'S',quantity:3,expectedVersion:2}],[product],[]).rows[0].sourceAlias).toBeUndefined();
    expect(matchInventory([{row:2,name:'Spain Home',size:'S',quantity:3}],[product],[]).rows[0].sourceAlias).toBe('Spain Home');
  });
});
