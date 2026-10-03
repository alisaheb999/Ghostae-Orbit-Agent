import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Signed Package Download Edge Function
 * Validates user license and generates a 5-minute pre-signed download URL
 */
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid user session" }), { status: 401 });
  }

  const { slug } = await req.json();

  // Check product existence
  const { data: product } = await supabase
    .from("products")
    .select("id, slug")
    .eq("slug", slug)
    .single();

  if (!product) {
    return new Response(JSON.stringify({ error: "Product not found" }), { status: 404 });
  }

  // Verify entitlement
  const { data: entitlement } = await supabase
    .from("user_entitlements")
    .select("id, expires_at, is_active")
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .eq("is_active", true)
    .single();

  if (!entitlement) {
    return new Response(JSON.stringify({ error: "No active license for this product" }), { status: 403 });
  }

  // Get latest version
  const { data: version } = await supabase
    .from("product_versions")
    .select("*")
    .eq("product_id", product.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!version) {
    return new Response(JSON.stringify({ error: "No version package available" }), { status: 404 });
  }

  // Create temporary signed URL for 5 minutes
  const { data: signedData, error: signError } = await supabase.storage
    .from("extension-packages")
    .createSignedUrl(version.package_file_path, 300);

  if (signError) {
    return new Response(JSON.stringify({ error: signError.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({
      version: version.version,
      package_checksum: version.package_checksum,
      download_url: signedData.signedUrl,
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }
  );
});
