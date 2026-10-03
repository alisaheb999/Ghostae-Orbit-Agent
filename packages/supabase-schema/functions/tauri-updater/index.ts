import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Tauri / Desktop Hub Self-Updater Edge Function
 * Returns update manifest matching client platform and version
 */
serve(async (req) => {
  const url = new URL(req.url);
  const target = url.searchParams.get("target") || "windows-x86_64";
  const currentVersion = url.searchParams.get("current_version") || "1.0.0";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { data: release, error } = await supabase
    .from("desktop_app_releases")
    .select("*")
    .eq("platform", target)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !release) {
    return new Response(null, { status: 204 });
  }

  if (release.version !== currentVersion) {
    const { data: signedData } = await supabase.storage
      .from("desktop-releases")
      .createSignedUrl(release.package_file_path, 3600);

    return new Response(
      JSON.stringify({
        version: release.version,
        pub_date: release.created_at,
        url: signedData?.signedUrl,
        signature: release.signature,
        notes: release.notes,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  }

  return new Response(null, { status: 204 });
});
