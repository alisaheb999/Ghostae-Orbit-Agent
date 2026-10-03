# Ghostae Hub — Lovable.dev & Supabase Backend Integration Guide

এই ফোল্ডারে আপনার **Lovable.dev** এবং **Supabase**-এর জন্য সম্পূর্ণ প্রোডাকশন কোড প্রস্তুত করে দেওয়া হয়েছে।

---

## ১. সুপাবেস ডাটাবেজ সেটআপ (Supabase Database Setup)

1. আপনার **Supabase Dashboard**-এ লগইন করুন: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. আপনার প্রোজেক্টে প্রবেশ করে বামপাশের মেনু থেকে **SQL Editor**-এ যান।
3. **`New query`** বাটনে ক্লিক করুন।
4. [supabase-schema.sql](file:///C:/Users/Admin/.gemini/antigravity/scratch/creative-suite-hub/lovable-backend/supabase-schema.sql) ফাইলের সমস্ত কোড কপি করে পেস্ট করুন এবং **Run** বাটনে চাপুন।

> **কী কী তৈরি হবে?**
> - `products` টেবিল (Ghostae Text প্রডাক্টের সিড ডেটা সহ)
> - `licenses` টেবিল (HWID বাইন্ডিং ও লাইসেন্স কি সংরক্ষণ)
> - `app_updates` টেবিল (সিইপি এক্সটেনশন আপডেটের জন্য)
> - `desktop_releases` টেবিল (ডেস্কটপ সফটওয়্যারের নিজস্ব সেলফ-আপডেট)
> - `transactions` টেবিল (বিকাশ, নগদ, রকেটের TrxID সাবমিশন)
> - স্টোরেজ বাকেট: `extensions` (প্রাইভেট বাকেট), `desktop-releases` (পাবলিক), `product-images` (পাবলিক)

---

## ২. Lovable.dev-এ অ্যাডমিন প্যানেল যুক্ত করা (Lovable Admin Setup)

আপনার Lovable.dev প্রজেক্টের ব্যাকএন্ডে ডেস্কটপ ক্লায়েন্ট ম্যানেজ করার জন্য:

1. [GhostaeAdminHub.tsx](file:///C:/Users/Admin/.gemini/antigravity/scratch/creative-suite-hub/lovable-backend/GhostaeAdminHub.tsx) ফাইলটি কপি করুন।
2. আপনার Lovable.dev প্রজেক্টের `src/pages/` ডিরেক্টরিতে **`GhostaeAdminHub.tsx`** নামে ফাইল তৈরি করে পেস্ট করুন।
3. আপনার অ্যাপের রাউটারে পেজটি যুক্ত করে দিন (যেমন: `/admin/ghostae-hub` বা আপনার অ্যাডমিন ড্যাশবোর্ডের ভেতরে একটি ট্যাব হিসেবে)।

> **Lovable অ্যাডমিন প্যানেল থেকে আপনি কী কী নিয়ন্ত্রণ করবেন?**
> 1. **Products & Pricing:** এক্সটেনশনের নাম, প্রাইস (BDT), ইমেজ, ডেসক্রিপশন পরিবর্তন।
> 2. **Extension Updates:** নতুন জিপ ফাইল আপলোড করে এক ক্লিকে সব ইউজারের আফটার ইফেক্টসে আপডেট পাঠানো।
> 3. **Desktop App Self-Updates:** পুরো ডেস্কটপ সফটওয়্যারটির নতুন রিলিজ পুশ করা (যা ক্লায়েন্ট ওপেন করলেই নিজে নিজে আপডেট হয়ে যাবে)।
> 4. **MFS Transactions:** বিকাশ/নগদে আসা TrxID দেখে **"Approve & Issue"** করলেই স্বয়ংক্রিয়ভাবে লাইসেন্স কি তৈরি হয়ে যাবে।

---

## ৩. ডেস্কটপ সফটওয়্যার কনফিগারেশন (Desktop Client Config)

ডেস্কটপ সফটওয়্যারটি সম্পূর্ণ ইউজারদের জন্য সাজানো হয়েছে (এখানে কোনো অ্যাডমিন বাটন রাখা হয়নি):
- **রেজিস্ট্রেশন ও লগইন:** ইউজার সফটওয়্যার ওপেন করে সরাসরি অ্যাকাউন্ট খুলতে পারবে, যা আপনার সুপাবেসের `auth.users` টেবিলে জমা হবে।
- **সার্ভার-ড্রিভেন লাইসেন্স:** লগইন করলেই সার্ভার থেকে তার কেনা লাইসেন্স কি ডেস্কটপ সফটওয়্যারে ভেসে উঠবে।
- **সেলফ-আপডেট:** ইউজার যখনই সফটওয়্যার ওপেন করবে বা সাইডবারের "Check for Updates" চাপবে, সার্ভার থেকে নতুন রিলিজ আসলে সফটওয়্যারটি নিজে নিজে আপডেট হয়ে যাবে।
