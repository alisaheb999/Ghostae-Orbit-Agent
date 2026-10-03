-- ==============================================================================
-- GHOSTAE HUB: PRODUCTION SUPABASE SQL MIGRATION FOR LOVABLE.DEV
-- ==============================================================================
-- Run this script directly in your Supabase Project -> SQL Editor.
-- It configures all tables, Row Level Security (RLS), and Storage Buckets.

-- 1. PRODUCTS & EXTENSIONS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'official', -- 'official' | 'free_resource'
    price_bdt INTEGER NOT NULL DEFAULT 499,
    is_free BOOLEAN NOT NULL DEFAULT FALSE,
    image_url TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '2.4.0',
    category TEXT NOT NULL DEFAULT 'Text Animation Panel',
    tagline TEXT,
    description TEXT,
    target_host TEXT NOT NULL DEFAULT 'AE', -- 'AE' | 'PPRO' | 'BOTH'
    min_adobe_version INTEGER NOT NULL DEFAULT 2023,
    features JSONB DEFAULT '[]'::jsonb,
    screenshots JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. LICENSES & HWID ACTIVATIONS TABLE
CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    license_key TEXT UNIQUE NOT NULL,
    tier TEXT NOT NULL DEFAULT 'Lifetime License',
    validity_type TEXT NOT NULL DEFAULT 'LIFETIME', -- 'LIFETIME' | 'ANNUAL'
    max_devices INTEGER NOT NULL DEFAULT 1,
    active_hwids JSONB DEFAULT '[]'::jsonb, -- Bound workstation hardware IDs
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. EXTENSION SOFTWARE UPDATES & RELEASES TABLE
CREATE TABLE IF NOT EXISTS public.app_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    version_available TEXT NOT NULL,
    changelog TEXT NOT NULL,
    download_url TEXT NOT NULL, -- Supabase Storage ZIP link
    min_adobe_version INTEGER NOT NULL DEFAULT 2023,
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. DESKTOP SOFTWARE SELF-UPDATE RELEASES TABLE
CREATE TABLE IF NOT EXISTS public.desktop_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT UNIQUE NOT NULL,
    download_url TEXT NOT NULL,
    changelog TEXT NOT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. PAYMENT TRANSACTIONS (bKash / Nagad / Rocket / Upay) TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trx_id TEXT UNIQUE NOT NULL,
    product_id UUID REFERENCES public.products(id),
    user_id UUID REFERENCES auth.users(id),
    amount INTEGER NOT NULL,
    gateway TEXT NOT NULL, -- 'bkash' | 'nagad' | 'rocket' | 'upay'
    customer_email TEXT,
    customer_phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- STORAGE BUCKETS SETUP
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('extensions', 'extensions', false),        -- Private bucket for CEP ZIP files
    ('desktop-releases', 'desktop-releases', true), -- Public bucket for Desktop App EXE/Updates
    ('product-images', 'product-images', true)      -- Public bucket for Thumbnails & Previews
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desktop_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 1. Products: Anyone can read (Desktop Client & Website)
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admin Full Access Products" ON public.products FOR ALL TO authenticated USING (true);

-- 2. Updates & Releases: Anyone can read
CREATE POLICY "Public Read App Updates" ON public.app_updates FOR SELECT USING (true);
CREATE POLICY "Public Read Desktop Releases" ON public.desktop_releases FOR SELECT USING (true);

-- 3. Licenses: User can read their own licenses
CREATE POLICY "User Read Own Licenses" ON public.licenses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin Full Access Licenses" ON public.licenses FOR ALL TO authenticated USING (true);

-- 4. Transactions: Users can insert their payment submissions
CREATE POLICY "Users Insert Transactions" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin Full Access Transactions" ON public.transactions FOR ALL TO authenticated USING (true);

-- ==============================================================================
-- INITIAL SEED DATA: GHOSTAE TEXT (Official Production Data)
-- ==============================================================================
INSERT INTO public.products (
    id,
    slug,
    name,
    type,
    price_bdt,
    is_free,
    image_url,
    version,
    category,
    tagline,
    description,
    target_host,
    min_adobe_version,
    features,
    screenshots
) VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'ghostae-text',
    'Ghostae Text',
    'official',
    499,
    false,
    'https://ghostae.com/assets/product-text-CtLrGwUT.webp',
    '2.4.0',
    'Text Animation Panel',
    'টেক্সট অ্যানিমেশন, এখন এক ক্লিকের ব্যাপার।',
    'After Effects-এর ভেতরেই প্রিমিয়াম টেক্সট অ্যানিমেশন, স্টাইল, ইমোজি ও এক্সপ্রেশন প্যানেল। আফটার ইফেক্টস ও প্রিমিয়ার প্রো ২০২৩ থেকে সর্বশেষ ভার্সন পর্যন্ত কাজ করে। উইন্ডোজ ও macOS দুটোতেই ওয়ান-ক্লিক ইনস্টল।',
    'AE',
    2023,
    '[
        {"title": "১৭০+ প্রিমিয়াম অ্যানিমেশন প্রিসেট", "desc": "ইনস্ট্যান্ট ইন ও আউট অ্যানিমেশন সহ ইলাস্টিক বাউন্স কার্ভ।"},
        {"title": "৩৩টি টেক্সট স্টাইল", "desc": "সিনেমাটিক ও ট্রেন্ডি টাইপোগ্রাফি স্টাইল।"},
        {"title": "২০০+ এক্সপ্রেশন ও ৩০০+ ইমোজি", "desc": "এক ক্লিকেই এক্সপ্রেশন কন্ট্রোল ও ভেক্টর ইমোজি ইনজেকশন।"},
        {"title": "২০২৩ → সর্বশেষ ভার্সন কম্প্যাটিবল", "desc": "Windows ও macOS দুটোতেই ফুল স্পিডে কাজ করে।"}
    ]'::jsonb,
    '[
        {"url": "https://qzpvqycykdqxlwfcawli.supabase.co/storage/v1/object/public/uploads/images/1788570993144-5z4efx.webp", "title": "Ghostae Text Presets"},
        {"url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=80", "title": "Typography Curves"},
        {"url": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80", "title": "Timeline Placement"}
    ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- Initial Desktop Software Release Record (Self-Update Baseline)
INSERT INTO public.desktop_releases (
    version,
    download_url,
    changelog,
    is_mandatory
) VALUES (
    '1.0.0',
    'https://qzpvqycykdqxlwfcawli.supabase.co/storage/v1/object/public/desktop-releases/Ghostae-Setup-1.0.0.exe',
    'Initial Official Release of Ghostae Hub Desktop Client',
    false
) ON CONFLICT (version) DO NOTHING;
