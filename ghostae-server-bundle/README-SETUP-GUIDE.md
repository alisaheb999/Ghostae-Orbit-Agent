# Ghostae Creative Suite Cloud & Desktop Setup Bundle

এই প্যাকেজে আপনার **Ghostae Creative Suite**-এর ইউনিফাইড ক্লাউড আর্কিটেকচার, সুপাবেস ডাটাবেজ, Lovable.dev অ্যাডমিন প্যানেল এবং অ্যাডোবি সিইপি ব্রিজ সার্ভারের সমস্ত ফাইল সাজানো রয়েছে।

---

## প্যাকেজের ফোল্ডার পরিচিতি (Folder Structure)

```
ghostae-server-setup/
├── 1-supabase-database/
│   └── supabase-schema.sql          <-- সুপাবেসের সম্পূর্ণ ডাটাবেজ টেবিল, RLS ও বাকেট স্ক্রিপ্ট
│
├── 2-lovable-admin-dashboard/
│   └── GhostaeAdminHub.tsx          <-- Lovable.dev-এ পেস্ট করার জন্য স্বয়ংসম্পূর্ণ অ্যাডমিন পেজ
│
└── 3-desktop-bridge-server/
    ├── standalone-server.js         <-- অ্যাডোবি সিইপি ও ডেস্কটপের লোকাল হোস্ট ব্রিজ সার্ভার
    ├── bridge-server.js
    ├── adobe-detector.js            <-- অটোমেটিক আফটার ইফেক্টস ও প্রিমিয়ার প্রো ২০২৩+ ডিটেক্টর
    ├── cep-installer.js             <-- %APPDATA%\Adobe\CEP অটো-ইনস্টলার ও রেজিস্ট্রি কনফিগার
    ├── hwid.js                      <-- মাদারবোর্ড ও সিপিইউ ইউনিক হার্ডওয়্যার আইডি জেনারেটর
    └── package.json
```

---

## ইউনিফাইড প্রোডাকশন API এন্ডপয়েন্টসমূহ (ghostae.com)

ডেস্কটপ ক্লায়েন্ট সরাসরি `https://ghostae.com/api/public/v1/desktop`-এর সাথে যুক্ত:

1. **Authentication (Login):** `POST /auth/login`
   - ইমেইল, পাসওয়ার্ড, HWID ও মেশিন নাম দিয়ে ভেরিফিকেশন।
2. **License Synchronization:** `GET /licenses`
   - Bearer Token ব্যবহার করে ইউজারের সমস্ত লাইসেন্স সিংক।
3. **Machine HWID Activation:** `POST /license/activate`
   - প্রতি লাইসেন্সে সর্বোচ্চ ১টি ওয়ার্কস্টেশন বাইন্ডিং (403 Device Limit হ্যান্ডলিং সহ)।
4. **Product Catalog:** `GET /catalog`
   - অফিশিয়াল এক্সটেনশন রিলিজ, BDT প্রাইস, আফটার ইফেক্টস ২০২৩+ কম্প্যাটিবিলিটি ও ডাউনলোড লিংক।
5. **Desktop EXE Updater:** `GET /app/check-update`
   - ডেস্কটপ অ্যাপের অটো-আপডেট চেকার।

---

## সেটআপের নির্দেশিকা

### ধাপ ১: Supabase Database সেটআপ
1. [supabase.com/dashboard](https://supabase.com/dashboard)-এ গিয়ে আপনার প্রোজেক্টে ঢুকুন।
2. বামপাশের মেনু থেকে **SQL Editor**-এ যান।
3. **`1-supabase-database/supabase-schema.sql`** ফাইলের সম্পূর্ণ কোড কপি করে পেস্ট করে **Run** চাপুন।

### ধাপ ২: Lovable.dev অ্যাডমিন প্যানেল
1. Lovable.dev প্রোজেক্টের `src/pages/` ফোল্ডারে **`GhostaeAdminHub.tsx`** যুক্ত করুন।
2. প্রডাক্ট, লাইসেন্স, এক্সটেনশন আপডেট ও ট্রানজেকশন পরিচালনা করুন।
