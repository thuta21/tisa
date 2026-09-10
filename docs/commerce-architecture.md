# TISA commerce architecture

## Domain ownership

| Domain | Source of truth | Write boundary | Import order |
| --- | --- | --- | --- |
| Products | `products`, `product_variants` | Admin API → transactional catalog RPC | 1 |
| Inventory | `inventory` | Admin API/checkout → versioned inventory RPCs and stock triggers | 2 |
| Orders | `orders`, `order_items`, `order_status_history` | Checkout or admin order RPC | 3 |
| Payments | `payment_methods`, `payment_proofs` | Payment review RPC; proof files remain in private Storage | Restored with orders |
| Search knowledge | `knowledge_documents`, `knowledge_chunks`, `knowledge_jobs` | Catalog triggers → asynchronous worker | Derived |

`products.sleeve` identifies `short` or `long`. A product owns at most one Home, Away and Third variant. A long-sleeve jersey is a separate product, so its variant IDs and stock cannot collide with the corresponding short-sleeve product.

## Transaction rules

- Browser code does not mutate product, variant, inventory, order, order-item, payment-proof or status-history rows directly.
- Product metadata writes never change existing stock quantities.
- Inventory updates require `expectedVersion`, a reason and an idempotency key.
- Admin order save replaces the order and its items in one database transaction. Any stock, validation or history failure rolls back the whole save.
- Payment review changes the proof, order status, status history and related stock behavior in one transaction.
- Archived products keep historical IDs. Their variants and inventory rows become inactive.
- Current stock and price are read from transactional tables at request time. Search embeddings never provide these values.

## Clean rebuild

The `commerce_rebuilds` table stores an admin-only order backup, SHA-256 hash and source counts. The clean RPC locks the checkpoint and refuses to run when the supplied hash differs or order-domain counts changed after backup.

The clean transaction removes products, variants, inventory, inventory history/imports, orders, order items, payment-proof records, derived knowledge-index data and every Auth/profile account except the admin running the rebuild. It retains reference settings, fonts, payment-method configuration and Storage objects.

Rebuild order:

1. Prepare and download the JSON order backup.
2. Clean commerce data through the guarded RPC.
3. Import the Products workbook. Draft rows may use unassigned catalog metadata; `sleeve` is always required.
4. Download the Inventory template after product creation so it contains the newly committed variant IDs, then import balances.
5. Restore orders. References match by original ID, SKU, or product slug + sleeve + kit. Item stock-tracking fields are retained when matching succeeds, but initial restoration bypasses deduction because the imported inventory is the authoritative remaining balance.

The backup contains payment-proof metadata and private Storage paths. Back up the `payment-proofs` bucket separately when the binary files are required.

## Rollback and recovery

- Before cleaning, create a fresh checkpoint whenever orders or payments change.
- Inventory import undo uses compensating movements and refuses a blind restore after later stock changes.
- A failed product, inventory, order or payment transaction leaves its domain unchanged.
- Keep the downloaded order backup outside the Supabase project. The in-database checkpoint protects the guided rebuild, while the external copy protects against project loss.
