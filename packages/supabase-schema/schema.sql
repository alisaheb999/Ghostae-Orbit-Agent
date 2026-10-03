-- ==============================================================================
-- GHOSTAE CREATIVE SUITE HUB - SUPABASE & LOVABLE POSTGRESQL SCHEMA
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Hardware ID & Devices Table
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    hwid_hash TEXT NOT NULL,
    device_name TEXT,
    os_platform TEXT CHECK (os_platform IN ('windows', 'macos')) DEFAULT 'windows',
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(hwid_hash)
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_hwid ON public.devices(hwid_hash);

-- 3. Products Catalog (Official Extensions & Free Resources)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    product_type TEXT CHECK (product_type IN ('official', 'free_resource')) DEFAULT 'official',
    category TEXT DEFAULT 'typography',
    price_bdt NUMERIC(10,2) DEFAULT 0 NOT NULL,
    is_free BOOLEAN DEFAULT false NOT NULL,
    target_host TEXT CHECK (target_host IN ('AE', 'PPRO', 'BOTH')) NOT NULL DEFAULT 'AE',
    thumbnail_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- 4. Product Versions Table (Releases, Checksums, and Storage Paths)
CREATE TABLE IF NOT EXISTS public.product_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    version TEXT NOT NULL,
    changelog TEXT,
    package_file_path TEXT NOT NULL, -- Path in Supabase storage or direct download URL
    package_checksum TEXT,           -- SHA-256 Checksum for security verification
    file_size_bytes BIGINT DEFAULT 0,
    is_critical_patch BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(product_id, version)
);

CREATE INDEX IF NOT EXISTS idx_versions_product ON public.product_versions(product_id);

-- 5. User Entitlements / Licensing Table (Play Store Ownership)
CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    license_key TEXT UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    max_devices INT DEFAULT 2 NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL denotes lifetime license
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_licenses_product ON public.licenses(product_id);
CREATE INDEX IF NOT EXISTS idx_licenses_key ON public.licenses(license_key);

-- 6. Orders & Payment Transactions (bKash, Nagad, Rocket, Upay)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
    gateway TEXT CHECK (gateway IN ('bkash', 'nagad', 'rocket', 'upay')) NOT NULL,
    transaction_id TEXT NOT NULL,
    amount_bdt NUMERIC(10,2) NOT NULL,
    coupon_code TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending' NOT NULL,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_trx ON public.orders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- 7. Desktop Application Self-Updater Releases Table
CREATE TABLE IF NOT EXISTS public.desktop_app_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    platform TEXT CHECK (platform IN ('windows-x86_64', 'darwin-aarch64', 'darwin-x86_64')) DEFAULT 'windows-x86_64',
    installer_url TEXT NOT NULL,     -- Direct URL to Ghostae_Setup_x.x.x.exe
    notes TEXT,
    is_mandatory BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desktop_app_releases ENABLE ROW LEVEL SECURITY;

-- Products & Versions: Public read access
CREATE POLICY "Public can read active products"
    ON public.products FOR SELECT
    USING (is_active = true);

CREATE POLICY "Public can read versions"
    ON public.product_versions FOR SELECT
    USING (true);

-- Desktop Releases: Public read access for update checks
CREATE POLICY "Public can view desktop releases"
    ON public.desktop_app_releases FOR SELECT
    USING (true);

-- Orders: Users can insert payment verification requests
CREATE POLICY "Anyone can create order verification"
    ON public.orders FOR INSERT
    WITH CHECK (true);

-- Licenses: Read access by license key or user
CREATE POLICY "Public can query license by key"
    ON public.licenses FOR SELECT
    USING (true);

-- ==============================================================================
-- SEED DATA (INITIAL CATALOG)
-- ==============================================================================
INSERT INTO public.products (slug, name, description, product_type, category, price_bdt, is_free, target_host, thumbnail_url, is_active, display_order)
VALUES 
    ('ghostae-text-v2', 'Ghostae Text V2', 'Kinetic procedural text animation engine for After Effects.', 'official', 'Kinetic Typography', 499, false, 'AE', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80', true, 1),
    ('ghostae-orbit', 'Ghostae Orbit', 'One-click 3D camera orbits and smooth tracking paths.', 'official', '3D Camera Rigging', 399, false, 'AE', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80', true, 2),
    ('ghostae-bridges', 'Ghostae Bridges', 'High-speed local communication bridge between Desktop and Adobe.', 'official', 'Host Interop Bridge', 499, false, 'BOTH', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80', true, 3),
    ('ghostae-tools', 'Ghostae Tools', 'Workflow acceleration utility dock for daily motion tasks.', 'official', 'Productivity Toolkit', 299, false, 'AE', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80', true, 4),
    ('vector-icons-3000', '3,000+ Vector Icons', 'Scalable vector icons organized for After Effects shape layers.', 'free_resource', 'Free Design Assets', 0, true, 'BOTH', 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80', true, 5),
    ('macos-ui-design-kit', 'macOS UI Design Kit', 'macOS authentic UI components & window mockups.', 'free_resource', 'Free MOGRTs & Mockups', 0, true, 'BOTH', 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=600&q=80', true, 6),
    ('color-harmony-tool', 'Color Harmony Tool', 'Harmonious color schemes with instant swatch assignment.', 'free_resource', 'Free Color Generator', 0, true, 'AE', 'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=600&q=80', true, 7),
    ('json-code-formatter', 'JSON & Code Formatter', 'Format, validate, and minify ExtendScript expressions.', 'free_resource', 'Free Developer Utility', 0, true, 'BOTH', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80', true, 8)
ON CONFLICT (slug) DO UPDATE 
SET price_bdt = EXCLUDED.price_bdt, 
    thumbnail_url = EXCLUDED.thumbnail_url,
    name = EXCLUDED.name;
