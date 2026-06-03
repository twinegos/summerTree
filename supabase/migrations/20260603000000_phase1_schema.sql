-- Phase 1 Schema Migration
-- summerTree 식물 가게 모바일 웹앱

-- ============================================================
-- updated_at 자동 갱신 트리거 함수
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. categories
-- ============================================================

CREATE TABLE categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(50) NOT NULL UNIQUE,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_name ON categories (name);

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. plants
-- ============================================================

CREATE TABLE plants (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       uuid         NOT NULL REFERENCES categories(id),
  name              varchar(100) NOT NULL,
  short_description text,
  description       text,
  care_guide        text,
  caution           text,
  price             integer      NOT NULL CHECK (price >= 0),
  stock             integer      NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_urls        text[]       NOT NULL DEFAULT '{}',
  is_deleted        boolean      NOT NULL DEFAULT false,
  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_plants_category_id ON plants (category_id);
CREATE INDEX idx_plants_is_deleted  ON plants (is_deleted);
CREATE INDEX idx_plants_created_at  ON plants (created_at DESC);

CREATE TRIGGER plants_updated_at
  BEFORE UPDATE ON plants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. orders
-- ============================================================

CREATE TABLE orders (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  status               varchar(20) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  total_amount         integer     NOT NULL CHECK (total_amount >= 0),
  buyer_name           varchar(100),
  buyer_phone          varchar(20),
  buyer_email          varchar(255),
  shipping_address     text,
  portone_payment_id   varchar(255),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_status     ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. order_items
-- ============================================================

CREATE TABLE order_items (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  plant_id   uuid         REFERENCES plants(id) ON DELETE SET NULL,
  plant_name varchar(100) NOT NULL,
  unit_price integer      NOT NULL CHECK (unit_price >= 0),
  quantity   integer      NOT NULL CHECK (quantity > 0),
  created_at timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_plant_id ON order_items (plant_id);

-- ============================================================
-- 5. cart_items
-- ============================================================

CREATE TABLE cart_items (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id varchar(255) NOT NULL,
  plant_id   uuid         NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  quantity   integer      NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (session_id, plant_id)
);

CREATE INDEX idx_cart_items_session_id ON cart_items (session_id);

CREATE TRIGGER cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
