-- ============================================================================
-- POLL CITY PRINT PLATFORM — DATA SCHEMA
-- Phase 1: Inventory + Print Packs
-- ============================================================================
-- This file documents the SQL schema for all print platform tables.
-- Source of truth is prisma/schema.prisma — this file is for reference.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EXISTING TABLES (Phase 0 — already live)
-- ----------------------------------------------------------------------------

-- print_shops — registered print vendors
CREATE TABLE print_shops (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  contact_name          TEXT,
  email                 TEXT NOT NULL,
  phone                 TEXT,
  website               TEXT,
  description           TEXT,
  service_areas         TEXT[] DEFAULT '{}',
  specialties           TEXT[] DEFAULT '{}',     -- PrintProductType[]
  rating                FLOAT,
  review_count          INT DEFAULT 0,
  is_verified           BOOLEAN DEFAULT FALSE,
  is_active             BOOLEAN DEFAULT TRUE,
  logo_url              TEXT,
  stripe_account_id     TEXT,
  stripe_onboarded      BOOLEAN DEFAULT FALSE,
  portfolio             TEXT[] DEFAULT '{}',
  provinces_served      TEXT[] DEFAULT '{}',
  average_response_hours INT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- print_jobs — campaign posts a job for vendors to bid on
CREATE TABLE print_jobs (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id           TEXT NOT NULL,
  product_type      TEXT NOT NULL,          -- PrintProductType enum
  title             TEXT NOT NULL,
  quantity          INT NOT NULL,
  description       TEXT,
  specs             JSONB,                   -- {size, material, finish, ...}
  deadline          TIMESTAMPTZ,
  delivery_address  TEXT,
  delivery_city     TEXT,
  delivery_postal   TEXT,
  file_url          TEXT,
  budget_min        FLOAT,
  budget_max        FLOAT,
  status            TEXT DEFAULT 'draft',   -- PrintJobStatus enum
  awarded_bid_id    TEXT,
  payment_intent_id TEXT,
  payment_status    TEXT DEFAULT 'pending', -- pending | paid | released | refunded
  tracking_number   TEXT,
  carrier           TEXT,
  estimated_delivery TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_print_jobs_campaign_status ON print_jobs(campaign_id, status);

-- print_bids — vendor bids on a job
CREATE TABLE print_bids (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      TEXT NOT NULL REFERENCES print_jobs(id) ON DELETE CASCADE,
  shop_id     TEXT NOT NULL REFERENCES print_shops(id),
  price       FLOAT NOT NULL,
  turnaround  INT NOT NULL,                 -- days
  notes       TEXT,
  file_url    TEXT,
  is_accepted BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_print_bids_job ON print_bids(job_id);
CREATE INDEX idx_print_bids_shop ON print_bids(shop_id);

-- print_templates — system-wide HTML design templates
CREATE TABLE print_templates (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,              -- lawn-sign | door-hanger | flyer | ...
  width         FLOAT NOT NULL,             -- inches
  height        FLOAT NOT NULL,             -- inches
  bleed         FLOAT DEFAULT 0.125,        -- inches
  thumbnail     TEXT,
  html_template TEXT NOT NULL,
  is_premium    BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_print_templates_category ON print_templates(category, is_active);

-- print_orders — campaign places an order (tied to template)
CREATE TABLE print_orders (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  template_id    TEXT REFERENCES print_templates(id),
  product_type   TEXT NOT NULL,
  quantity       INT DEFAULT 1,
  status         TEXT DEFAULT 'draft',      -- draft | proof | approved | printing | shipped | delivered | cancelled
  design_data    JSONB,                      -- editor snapshot (locked at submit)
  download_url   TEXT,
  supplier_order TEXT,
  unit_price_cad FLOAT,
  total_price_cad FLOAT,
  shipping_addr  JSONB,                      -- {street, city, province, postal, name}
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_print_orders_campaign ON print_orders(campaign_id, created_at);

-- literature_pieces — named literature items with quantity tracking
CREATE TABLE literature_pieces (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  piece_type       TEXT NOT NULL,            -- LiteraturePieceType enum
  version          TEXT DEFAULT 'v1',
  description      TEXT,
  print_url        TEXT,
  quantity_in_stock INT DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_literature_pieces_campaign ON literature_pieces(campaign_id, is_active);

-- literature_packages — bundle of literature pieces
CREATE TABLE literature_packages (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_literature_packages_campaign ON literature_packages(campaign_id, is_active);

-- literature_package_items — junction: package × piece × qty_per_stop
CREATE TABLE literature_package_items (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id          TEXT NOT NULL REFERENCES literature_packages(id) ON DELETE CASCADE,
  literature_piece_id TEXT NOT NULL REFERENCES literature_pieces(id) ON DELETE CASCADE,
  quantity_per_stop   INT DEFAULT 1,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(package_id, literature_piece_id)
);
CREATE INDEX idx_lit_pkg_items_package ON literature_package_items(package_id);

-- sign_inventory_items — aggregate sign counts per type
CREATE TABLE sign_inventory_items (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  sign_type         TEXT NOT NULL,           -- standard | large | window | road | banner
  total_quantity    INT DEFAULT 0,
  deployed_quantity INT DEFAULT 0,
  storage_location  TEXT,
  condition         TEXT DEFAULT 'good',     -- SignCondition enum
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sign_inventory_campaign ON sign_inventory_items(campaign_id);

-- assignment_resource_packages — links field assignments to literature + signs
CREATE TABLE assignment_resource_packages (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id           TEXT UNIQUE NOT NULL REFERENCES field_assignments(id) ON DELETE CASCADE,
  script_package_id       TEXT,
  literature_package_id   TEXT REFERENCES literature_packages(id),
  planned_literature_qty  INT,
  actual_literature_qty   INT,
  sign_inventory_item_id  TEXT REFERENCES sign_inventory_items(id),
  signs_allocated         INT,
  signs_installed         INT,
  signs_recovered         INT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- PHASE 1 NEW TABLES
-- ----------------------------------------------------------------------------

-- print_inventory — unified inventory tracker (one row per SKU per campaign)
-- Created when a PrintOrder is fulfilled OR manually entered.
CREATE TABLE print_inventory (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  sku               TEXT NOT NULL,           -- auto-generated or manually set
  product_type      TEXT NOT NULL,           -- PrintProductType enum
  description       TEXT,
  order_id          TEXT REFERENCES print_orders(id),  -- source order if fulfilled from print
  total_qty         INT DEFAULT 0,           -- total received (immutable after receive)
  available_qty     INT DEFAULT 0,           -- total_qty - reserved - depleted - wasted
  reserved_qty      INT DEFAULT 0,           -- assigned to packs/volunteers, not yet used
  depleted_qty      INT DEFAULT 0,           -- confirmed used/distributed
  wasted_qty        INT DEFAULT 0,           -- damaged / discarded
  location          TEXT DEFAULT 'hq',       -- hq | storage | event | in_field
  reorder_threshold INT,                     -- trigger alert below this qty
  notes             TEXT,
  received_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, sku)
);
CREATE INDEX idx_print_inventory_campaign_type ON print_inventory(campaign_id, product_type);

-- print_inventory_logs — audit trail: every qty change recorded
-- NEVER update print_inventory.available_qty directly — always via a log entry.
CREATE TABLE print_inventory_logs (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id   TEXT NOT NULL REFERENCES print_inventory(id) ON DELETE CASCADE,
  campaign_id    TEXT NOT NULL,
  action         TEXT NOT NULL,              -- received | assigned | returned | depleted | wasted | adjusted
  qty            INT NOT NULL,               -- positive = stock increase, negative = decrease
  balance        INT NOT NULL,               -- available_qty AFTER this action
  notes          TEXT,
  reference_id   TEXT,                       -- packId | fieldAssignmentId | orderId
  reference_type TEXT,                       -- pack | field_assignment | order | manual
  user_id        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_inv_logs_inventory ON print_inventory_logs(inventory_id);
CREATE INDEX idx_inv_logs_campaign_date ON print_inventory_logs(campaign_id, created_at);

-- print_packs — auto-generated material bundles for specific operations
CREATE TABLE print_packs (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id          TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  pack_type            TEXT NOT NULL,          -- walk_kit | sign_install_kit | lit_drop_kit | event_kit | gotv_kit
  target_count         INT DEFAULT 0,          -- households / stops / doors in target area
  buffer_pct           FLOAT DEFAULT 0.20,     -- 20% extra default
  turf_id              TEXT,                   -- optional turf scope
  poll_number          TEXT,                   -- optional poll number scope
  field_assignment_id  TEXT,                   -- linked field assignment
  event_id             TEXT,                   -- linked event (for event_kit)
  status               TEXT DEFAULT 'draft',   -- draft | fulfilled | distributed | returned
  notes                TEXT,
  generated_at         TIMESTAMPTZ,
  distributed_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_print_packs_campaign_type ON print_packs(campaign_id, pack_type);

-- print_pack_items — individual product lines within a pack
CREATE TABLE print_pack_items (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id        TEXT NOT NULL REFERENCES print_packs(id) ON DELETE CASCADE,
  inventory_id   TEXT REFERENCES print_inventory(id),  -- NULL = not yet assigned from inventory
  product_type   TEXT NOT NULL,              -- PrintProductType enum
  required_qty   INT NOT NULL,               -- calculated required quantity
  fulfilled_qty  INT DEFAULT 0,              -- actually pulled from inventory
  notes          TEXT
);
CREATE INDEX idx_pack_items_pack ON print_pack_items(pack_id);

-- ----------------------------------------------------------------------------
-- COMPUTED VIEW: inventory summary per campaign
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW print_inventory_summary AS
SELECT
  campaign_id,
  COUNT(*) AS sku_count,
  SUM(total_qty) AS total_items,
  SUM(available_qty) AS available_items,
  SUM(reserved_qty) AS reserved_items,
  SUM(depleted_qty) AS depleted_items,
  SUM(wasted_qty) AS wasted_items,
  SUM(total_qty * 0) AS total_cost_cad,    -- populated from linked order in Phase 3
  COUNT(*) FILTER (WHERE reorder_threshold IS NOT NULL AND available_qty <= reorder_threshold) AS reorder_alerts
FROM print_inventory
GROUP BY campaign_id;

-- ----------------------------------------------------------------------------
-- INDEXES for performance
-- ----------------------------------------------------------------------------

-- Already defined inline above.
-- Additional composite indexes for common query patterns:
CREATE INDEX idx_print_packs_field_assignment ON print_packs(field_assignment_id) WHERE field_assignment_id IS NOT NULL;
CREATE INDEX idx_print_packs_turf ON print_packs(turf_id) WHERE turf_id IS NOT NULL;
CREATE INDEX idx_print_inventory_low_stock ON print_inventory(campaign_id, available_qty)
  WHERE reorder_threshold IS NOT NULL;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
