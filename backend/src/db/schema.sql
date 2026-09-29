-- HelloKakinada MySQL schema, Hostinger-ready.
-- USAGE: hPanel > Databases > phpMyAdmin > select YOUR database (left panel) > Import/SQL tab.
-- Do NOT add CREATE DATABASE (shared hosting blocks it). Safe to re-run (idempotent).

-- MySQL schema for HelloKakinada — migrated 1:1 from Postgres/Supabase.
-- Notes on translation choices:
--   * uuid            -> CHAR(36), generated in application code (uuid v4)
--   * text[]          -> JSON (stored as a JSON array of strings)
--   * jsonb           -> JSON
--   * timestamptz     -> DATETIME (UTC), defaulted with CURRENT_TIMESTAMP
--   * ENUM types       -> MySQL ENUM(...)
--   * RLS policies     -> NOT representable in MySQL; re-implemented as
--                         Express middleware/query filters (see src/lib/acl.ts
--                         and src/routes/*). Every policy below is annotated
--                         with the Express-side equivalent that enforces it.
--   * auth.users        -> replaced by our own `users` table (auth is now
--                         handled by the backend with bcrypt + JWT, not Supabase)
--   * SECURITY DEFINER functions (has_role/is_admin/can_manage/record_interaction)
--                         -> reimplemented as plain TS functions in src/lib/acl.ts
--                            and the /api/interactions route

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- users  (replaces Supabase auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  email_confirmed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with users, kept separate to mirror the original schema)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) PRIMARY KEY,
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_user FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
-- Policy "read own or admin" / "update own or master" -> enforced in
-- src/routes/admin.routes.ts (GET/PATCH /api/profiles/:id)

-- ---------------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  role ENUM('master_admin','content_admin','business_admin','jobs_admin','property_admin','explore_admin','moderation_admin','analytics_admin','user') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_role (user_id, role),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
-- Policies "own roles or master reads" / "master assigns roles" / "master removes roles"
-- -> enforced in src/routes/admin.routes.ts + src/lib/acl.ts (requireRole('master_admin'))

-- ---------------------------------------------------------------------------
-- content tables: businesses, jobs, properties, events, food_places, services,
-- videos, photos — identical shape (generated via a loop in the Postgres
-- migration; written out explicitly here since MySQL has no DO $$ blocks).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS businesses (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  description TEXT,
  category VARCHAR(120),
  subcategory VARCHAR(120),
  location VARCHAR(255),
  tags JSON NOT NULL DEFAULT ('[]'),
  image_url TEXT,
  images JSON NOT NULL DEFAULT ('[]'),
  media_url TEXT,
  status ENUM('draft','pending','published','archived','rejected') NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  details JSON NOT NULL DEFAULT ('{}'),
  sort_order INT NOT NULL DEFAULT 0,
  views INT NOT NULL DEFAULT 0,
  likes INT NOT NULL DEFAULT 0,
  shares INT NOT NULL DEFAULT 0,
  published_at DATETIME NULL,
  created_by CHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_businesses_status_created (status, created_at DESC),
  INDEX idx_businesses_category (category),
  INDEX idx_businesses_feed (status, sort_order, published_at DESC),
  INDEX idx_businesses_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS jobs LIKE businesses;
CREATE TABLE IF NOT EXISTS properties LIKE businesses;
CREATE TABLE IF NOT EXISTS events LIKE businesses;
CREATE TABLE IF NOT EXISTS food_places LIKE businesses;
CREATE TABLE IF NOT EXISTS services LIKE businesses;
CREATE TABLE IF NOT EXISTS videos LIKE businesses;
CREATE TABLE IF NOT EXISTS photos LIKE businesses;


-- Policies for every content table above ("public reads published" / "staff
-- reads all" / "staff inserts" / "staff updates" / "staff deletes") are all
-- enforced centrally in src/routes/table.routes.ts and src/lib/acl.ts, keyed
-- by CONTENT_TABLE_SECTION (table -> permission section, e.g. food_places -> 'food').

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  section VARCHAR(40) NOT NULL DEFAULT 'explore',
  icon VARCHAR(80),
  image_url TEXT,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_category (section, name)
) ENGINE=InnoDB;

INSERT IGNORE INTO categories (id, name, icon, display_order) VALUES
 (UUID(),'Places','MapPin',1),(UUID(),'Food','UtensilsCrossed',2),(UUID(),'Events','CalendarDays',3),
 (UUID(),'Business','Store',4),(UUID(),'Nature','Trees',5),(UUID(),'Beaches','Waves',6),
 (UUID(),'Culture','Landmark',7),(UUID(),'Local Life','Users',8),(UUID(),'News / Updates','Newspaper',9);

-- ---------------------------------------------------------------------------
-- locations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  aliases JSON NOT NULL DEFAULT ('[]'),
  description TEXT,
  seo_title VARCHAR(255),
  seo_description TEXT,
  image_url TEXT,
  nearby JSON NOT NULL DEFAULT ('[]'),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO locations (id, name, slug, aliases, description, seo_title, seo_description, nearby, featured, display_order) VALUES
(UUID(),'Kakinada','kakinada','["Kakinada"]','Kakinada is the port city and headquarters of Kakinada district on the Bay of Bengal coast of Andhra Pradesh, known for its planned layout, beach road and Kaja sweets.','Kakinada Local Directory — Businesses, Jobs, Hotels & Homes | HelloKakinada.in','Find verified businesses, hospitals, hotels, jobs, rentals and services across Kakinada city, all in one local directory.','["Bhanugudi","Rama Rao Peta","Sarpavaram","Jagannaickpur","Gandhi Nagar"]',true,1),
(UUID(),'Bhanugudi','bhanugudi','["Bhanugudi"]','Bhanugudi Junction is one of Kakinada''s busiest commercial hubs, surrounded by hospitals, shops, restaurants and residential colonies like Srinagar and Sriram Nagar.','Businesses, Jobs & Services in Bhanugudi, Kakinada | HelloKakinada.in','Explore hospitals, shops, restaurants, jobs and rentals around Bhanugudi Junction, Srinagar and Sriram Nagar in Kakinada.','["Srinagar","Sriram Nagar","Kondayya Palem","Police Quarters","Rama Rao Peta"]',true,2),
(UUID(),'Tuni','tuni','["Tuni"]','Tuni is a busy town in Kakinada district on the Chennai–Kolkata highway, a trading centre for mangoes and cashew and a gateway to Talupulamma Lova.','Businesses, Jobs, Hotels & Services in Tuni | HelloKakinada.in','Your Tuni local directory: shops, hotels, restaurants, jobs, properties and services in Tuni town and nearby villages.','["Talupulamma Lova","Payakaraopeta","Kotananduru"]',true,3),
(UUID(),'Pithapuram','pithapuram','["Pithapuram"]','Pithapuram is an ancient temple town famous for the Kukkuteswara Swamy temple and Puruhutika Shakti Peetham, about 20 km from Kakinada.','Pithapuram Directory — Temples, Shops, Jobs & Services | HelloKakinada.in','Discover businesses, services, jobs and places to stay in Pithapuram, the Shakti Peetham temple town near Kakinada.','["Gollaprolu","Uppada","Kothapalli"]',true,4),
(UUID(),'Samalkota','samalkota','["Samalkota","Samalkot"]','Samalkota is a railway junction town near Kakinada, home to the Kumararama Bhimeswara temple, one of the Pancharama Kshetras.','Samalkota Local Businesses, Jobs & Services | HelloKakinada.in','Find shops, services, jobs and rentals in Samalkota, the railway junction and Pancharama temple town near Kakinada.','["Peddapuram","Vetlapalem","Kakinada"]',true,5),
(UUID(),'Peddapuram','peddapuram','["Peddapuram"]','Peddapuram is a historic town known for its handloom silk weaving and the Maridamma temple, located between Kakinada and Rajahmundry.','Peddapuram Directory — Silk, Shops, Jobs & Services | HelloKakinada.in','Browse businesses, handloom shops, jobs, homes and services in Peddapuram, Kakinada district.','["Samalkota","Jaggampeta","Divili"]',true,6),
(UUID(),'Jaggampeta','jaggampeta','["Jaggampeta","Jaggampet"]','Jaggampeta is a growing town on NH-16 in Kakinada district, a local centre for trade, agriculture and transport.','Jaggampeta Businesses, Jobs & Local Services | HelloKakinada.in','Local shops, services, jobs and properties in Jaggampeta on the NH-16 highway in Kakinada district.','["Gokavaram","Kirlampudi","Peddapuram"]',true,7),
(UUID(),'Yeleswaram','yeleswaram','["Yeleswaram"]','Yeleswaram is a town in Kakinada district at the edge of the Eastern Ghats, close to the Yeleru reservoir.','Yeleswaram Local Directory — Shops, Jobs & Services | HelloKakinada.in','Find businesses, services, jobs and rentals in Yeleswaram near the Yeleru reservoir, Kakinada district.','["Yeleru Reservoir","Prathipadu","Jaggampeta"]',true,8);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id CHAR(36) NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id CHAR(36),
  target_title VARCHAR(255),
  rating INT NOT NULL DEFAULT 5,
  body TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  reporter_id CHAR(36) NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id CHAR(36),
  target_title VARCHAR(255),
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_user FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  image_url TEXT,
  audience VARCHAR(40) NOT NULL DEFAULT 'all',
  category VARCHAR(80),
  scheduled_at DATETIME NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by CHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- site_settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  `key` VARCHAR(120) PRIMARY KEY,
  value JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- media_interactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_interactions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(40) NOT NULL,
  entity_id CHAR(36) NOT NULL,
  kind VARCHAR(20) NOT NULL,
  user_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mi_entity_type_created (entity_type, created_at DESC),
  INDEX idx_mi_entity_id (entity_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- import_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_logs (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  created_by CHAR(36),
  kind ENUM('businesses','jobs') NOT NULL,
  source VARCHAR(255) NOT NULL,
  source_name VARCHAR(255),
  total INT NOT NULL DEFAULT 0,
  imported INT NOT NULL DEFAULT 0,
  updated INT NOT NULL DEFAULT 0,
  skipped INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  failed_rows JSON NOT NULL DEFAULT ('[]'),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
