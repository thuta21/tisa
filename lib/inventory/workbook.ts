import * as XLSX from 'xlsx';
import { inflateRawSync } from 'node:zlib';
import { canonicalSize, normalize, type SourceRow } from './types';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_ROWS = 5000;
const text = (v: unknown) => v == null ? '' : String(v).trim();
const whole = (v: unknown) => text(v) !== '' && Number.isSafeInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 2147483647;

// Validate the actual ZIP payload before handing it to SheetJS. Directory sizes
// alone are attacker-controlled and cannot establish a decompression bound.
export function checkWorkbookSize(bytes: Uint8Array) {
  if (bytes.length > MAX_FILE_BYTES) throw new Error('Maximum workbook size is 10 MB.');
  const invalid = () => new Error('Choose a valid, unencrypted .xlsx workbook.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
  }
  if (end < 0) throw invalid();
  const count = view.getUint16(end + 10, true), directorySize = view.getUint32(end + 12, true);
  let cursor = view.getUint32(end + 16, true), expanded = 0;
  if (!count || count > 2000 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 8, true) !== count || cursor + directorySize !== end) throw invalid();
  const directoryEnd = cursor + directorySize;
  for (let entry = 0; entry < count; entry++) {
    if (cursor + 46 > directoryEnd || view.getUint32(cursor, true) !== 0x02014b50) throw invalid();
    const flags = view.getUint16(cursor + 8, true), method = view.getUint16(cursor + 10, true);
    const compressed = view.getUint32(cursor + 20, true), declared = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true), extraLength = view.getUint16(cursor + 30, true), commentLength = view.getUint16(cursor + 32, true);
    const local = view.getUint32(cursor + 42, true);
    if (flags & 1 || ![0, 8].includes(method) || declared > 50 * 1024 * 1024 - expanded || local + 30 > directoryEnd || view.getUint32(local, true) !== 0x04034b50) throw invalid();
    if (view.getUint16(local + 6, true) !== flags || view.getUint16(local + 8, true) !== method || view.getUint16(cursor + 34, true) !== 0) throw invalid();
    if (!(flags & 8) && (view.getUint32(local + 18, true) !== compressed || view.getUint32(local + 22, true) !== declared)) throw invalid();
    const localNameLength = view.getUint16(local + 26, true);
    if (localNameLength !== nameLength || !bytes.subarray(local + 30, local + 30 + nameLength).every((byte, index) => byte === bytes[cursor + 46 + index])) throw invalid();
    const dataOffset = local + 30 + localNameLength + view.getUint16(local + 28, true);
    if (dataOffset + compressed > view.getUint32(end + 16, true) || cursor + 46 + nameLength + extraLength + commentLength > directoryEnd) throw invalid();
    const payload = bytes.subarray(dataOffset, dataOffset + compressed);
    let actual: number;
    try { actual = method === 0 ? payload.length : inflateRawSync(payload, { maxOutputLength: 50 * 1024 * 1024 - expanded }).length; }
    catch { throw new Error('Workbook is corrupt or expands beyond the 50 MB limit.'); }
    if (actual !== declared) throw invalid();
    expanded += actual;
    if (expanded > 50 * 1024 * 1024) throw new Error('Workbook expands beyond the 50 MB limit.');
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor !== directoryEnd) throw invalid();
}

export function parseInventoryWorkbook(bytes: Uint8Array): { rows: SourceRow[]; issues: string[] } {
  checkWorkbookSize(bytes);
  const book = XLSX.read(bytes, { type: 'array', cellFormula: true, sheetRows: 10002 });
  const name = book.SheetNames.find(n=>normalize(n)==='inventory') ?? book.SheetNames.find(n=>normalize(n)==='stock');
  if (!name) throw new Error('Expected an Inventory or Stock worksheet.');
  const sheet = book.Sheets[name];
  const range = XLSX.utils.decode_range(sheet['!fullref'] ?? sheet['!ref'] ?? 'A1');
  if (range.e.r > 10000 || range.e.c > 200) throw new Error('Workbook dimensions exceed import limits.');
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header:1, defval:'', blankrows:true });
  const rows: SourceRow[] = []; const issues: string[] = [];
  const cell = (r:number,c:number) => sheet[XLSX.utils.encode_cell({r,c})];
  if (normalize(name)==='inventory') {
    const headers = (grid[0]??[]).map(v=>normalize(text(v)));
    const get=(row:unknown[],key:string)=>row[headers.indexOf(key)];
    for (const key of ['size','quantity']) if (!headers.includes(key)) issues.push(`Missing ${key} column.`);
    grid.slice(1).forEach((row,i)=>{
      if (row.every(v=>text(v)==='') || text(get(row,'quantity'))==='') return;
      const quantity=get(row,'quantity'); const size=canonicalSize(text(get(row,'size')));
      if (!whole(quantity) || !size) { issues.push(`Row ${i+2}: size and nonnegative whole quantity required.`); return; }
      if (cell(i+1,headers.indexOf('quantity'))?.f) { issues.push(`Row ${i+2}: standard inventory quantities must be values, not formulas.`); return; }
      const version = text(get(row,'version'));
      if (version && !whole(version)) {issues.push(`Row ${i+2}: invalid version.`); return;}
      rows.push({ row:i+2, name:text(get(row,'item_name')), variantId:text(get(row,'variant_id'))||undefined, sku:text(get(row,'sku'))||undefined,
        size, quantity:Number(quantity), expectedVersion:version ? Number(version):undefined, season:text(get(row,'season'))||undefined });
    });
  } else {
    const h = grid.findIndex(row=>row.some(v=>normalize(text(v))==='balance qty') && row.some(v=>normalize(text(v))==='item name'));
    if (h<0) throw new Error('Stock Balance headers not found.');
    const headers=grid[h].map(v=>normalize(text(v)));
    const totalCol=headers.indexOf('balance qty');
    const nameCol=headers.lastIndexOf('item name',totalCol);
    const sizes=['S','M','L','XL','2XL'];
    const sizeCols=sizes.map(s=>headers.findIndex((v,c)=>c>nameCol && c<totalCol && canonicalSize(v)===s));
    if (sizeCols.some(c=>c<0)) throw new Error('Stock Balance must include S, M, L, XL and XXL/2XL.');
    const seen=new Set<string>();
    for (let r=h+1;r<grid.length;r++) {
      const item=text(grid[r][nameCol]); if (!item) continue;
      if (['total','grand total'].includes(normalize(item))) continue;
      if (seen.has(normalize(item))) {issues.push(`Row ${r+1}: duplicate item ${item}.`); continue;}
      seen.add(normalize(item));
      const quantities=sizeCols.map(c=>grid[r][c]);
      if (![...quantities,grid[r][totalCol]].every(whole)) {issues.push(`Row ${r+1}: missing, negative, fractional or invalid balance.`);continue;}
      if (quantities.reduce<number>((a,v)=>a+Number(v),0)!==Number(grid[r][totalCol])) {issues.push(`Row ${r+1}: size total does not equal Balance Qty.`);continue;}
      let valid=true;
      for (const c of [...sizeCols,totalCol]) {
        const formula=cell(r,c)?.f;
        if (!formula) continue;
        // Only the observed local SUMIF(range,item,sumrange)-SUMIF(...) grammar is accepted.
        const match=formula.replace(/\s/g,'').match(/^SUMIF\((\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?\d+),(\$?[A-Z]+\$?\d+),(\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?\d+)\)-SUMIF\((\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?\d+),(\$?[A-Z]+\$?\d+),(\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?\d+)\)$/i);
        if (!match) {issues.push(`${XLSX.utils.encode_cell({r,c})}: unsupported balance formula.`);valid=false;continue;}
        const sum=(ref:string,criterion:string,values:string)=>{
          const a=XLSX.utils.decode_range(ref), b=XLSX.utils.decode_range(values);
          if (a.e.r>range.e.r || b.e.r>range.e.r || a.e.r-a.s.r!==b.e.r-b.s.r || a.s.c!==a.e.c || b.s.c!==b.e.c) throw new Error('Invalid SUMIF ranges.');
          if (text(sheet[criterion.replace(/\$/g,'')]?.v)!==item) throw new Error('SUMIF references a different item.');
          let result=0;
          for(let n=0;n<=a.e.r-a.s.r;n++) if(normalize(text(cell(a.s.r+n,a.s.c)?.v))===normalize(item)) {
            const v=cell(b.s.r+n,b.s.c);
            if(v?.t==='e' || (v?.v!==undefined && text(v.v)!=='' && !whole(v.v))) throw new Error('Invalid source transaction quantity.');
            result+=Number(v?.v||0);
          }
          return result;
        };
        try { if(sum(match[1],match[2],match[3])-sum(match[4],match[5],match[6])!==Number(grid[r][c])) throw new Error('Cached balance differs from source transactions.'); }
        catch(e) {issues.push(`Row ${r+1}: ${(e as Error).message}`);valid=false;}
      }
      if(valid) sizes.forEach((size,i)=>rows.push({row:r+1,name:item,size,quantity:Number(quantities[i])}));
    }
  }
  if(rows.length>MAX_ROWS) issues.push('Maximum 5,000 inventory rows per import.');
  if(!rows.length) issues.push('No inventory quantities found.');
  return {rows,issues};
}

export function makeWorkbook(sheets: Record<string, Record<string, unknown>[]>) {
  const book=XLSX.utils.book_new();
  for(const [name,rows] of Object.entries(sheets)) {
    const sheet=XLSX.utils.json_to_sheet(rows);
    sheet['!cols']=Object.keys(rows[0]??{}).map(key=>({wch:Math.min(45,Math.max(15,key.length+3))}));
    if(sheet['!ref']) sheet['!autofilter']={ref:sheet['!ref']};
    XLSX.utils.book_append_sheet(book,sheet,name);
  }
  return XLSX.write(book,{type:'buffer',bookType:'xlsx'}) as Buffer;
}
