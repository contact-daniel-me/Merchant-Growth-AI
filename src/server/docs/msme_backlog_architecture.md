# MSME Future Expansion Architecture: GST Invoicing & Stock Tracking
**Merchant by GrowIOTA Platform**

---

## 1. GST-Ready Invoicing Engine (Proposed Architecture)

### Core Schema Extension Points:
```sql
CREATE TABLE IF NOT EXISTS gst_invoices (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id),
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_gstin TEXT,
    customer_phone TEXT,
    place_of_supply TEXT NOT NULL, -- State code e.g. '29-Karnataka'
    taxable_amount NUMERIC NOT NULL,
    cgst_amount NUMERIC NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC NOT NULL DEFAULT 0.00,
    cess_amount NUMERIC NOT NULL DEFAULT 0.00,
    total_invoice_value NUMERIC NOT NULL,
    irn_hash TEXT, -- E-invoice IRN when crossing B2B threshold
    qr_code_payload TEXT,
    payment_status TEXT NOT NULL DEFAULT 'UNPAID', -- 'UNPAID', 'PARTIALLY_PAID', 'PAID'
    pdf_storage_uri TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES gst_invoices(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    hsn_sac_code TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit_of_measure TEXT NOT NULL DEFAULT 'NOS', -- 'NOS', 'KG', 'LTR'
    unit_price NUMERIC NOT NULL,
    discount_amount NUMERIC DEFAULT 0.00,
    taxable_value NUMERIC NOT NULL,
    gst_rate_percent NUMERIC NOT NULL, -- 0%, 5%, 12%, 18%, 28%
    cgst_rate NUMERIC NOT NULL,
    sgst_rate NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL
);
```

### Tax Determination Rules:
1. **Intra-State Supply:** `Merchant State Code === Place of Supply State Code` -> Equal split of CGST and SGST (e.g. 9% + 9% for 18% slab).
2. **Inter-State Supply:** `Merchant State Code !== Place of Supply State Code` -> IGST applied (18%).
3. **Threshold Guard:** E-invoicing requirement triggers only when merchant aggregate annual turnover exceeds applicable GST threshold.

---

## 2. Inventory & Stock Tracking Engine (Proposed Architecture)

### Core Schema Extension Points:
```sql
CREATE TABLE IF NOT EXISTS product_inventory (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id),
    sku_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    current_stock NUMERIC NOT NULL DEFAULT 0,
    reorder_level NUMERIC NOT NULL DEFAULT 5,
    unit_purchase_cost NUMERIC NOT NULL,
    retail_selling_price NUMERIC NOT NULL,
    supplier_name TEXT,
    supplier_phone TEXT,
    last_restocked_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(merchant_id, sku_code)
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES product_inventory(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL, -- 'SALE_DEDUCTION', 'RESTOCK_PURCHASE', 'DAMAGE_WRITE_OFF', 'AUDIT_CORRECTION'
    quantity NUMERIC NOT NULL,
    resulting_stock NUMERIC NOT NULL,
    reference_order_id TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Integration Workflow:
- Connected to authoritative Soundbox & POS transactions.
- Sales automatically decrement stock in real time.
- Low-stock alerts triggered proactively when `current_stock <= reorder_level` and included in the Daily Business Brief.

