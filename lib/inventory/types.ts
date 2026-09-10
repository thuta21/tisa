export type Stock = { id: string; variant_id: string; size: string; quantity: number; reserved: number; version: number; is_active: boolean };
export type Variant = { id: string; product_id: string; kit: 'home'|'away'|'third'; name: string; sku: string|null; price: number; available: boolean; inventory: Stock[] };
export type Product = { id: string; slug: string; name: string; team: string; category: string; season: string|null; sleeve: string; status: string; base_price: number; product_variants: Variant[] };
export type SourceRow = { row: number; name: string; variantId?: string; sku?: string; size: string; quantity: number; expectedVersion?: number; season?: string };
export type ImportTarget = SourceRow & { variantId?: string; productId?: string; inventoryId?: string; expectedVersion: number; before: number; reserved: number; kit: 'home'|'away'|'third'; team: string; sleeve: string; productSlug: string; sourceAlias?: string; action: 'update'|'create'; };
export type ImportPreview = { id: string|null; rows: ImportTarget[]; issues: string[]; fileName: string; duplicate?: boolean };
export const normalize = (value: string) => value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
export const canonicalSize = (value: string) => ['XXL','2XL'].includes(value.trim().toUpperCase()) ? '2XL' : value.trim().toUpperCase();
