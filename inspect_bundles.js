async function inspectBundles() {
  const res = await fetch('https://ghostae.com/products/text');
  const html = await res.text();
  const scripts = [...html.matchAll(/href=["'](\/assets\/[^"']+\.js)["']/g)].map(m => m[1]);
  console.log('Found scripts:', scripts);

  for (const s of scripts) {
    try {
      const sRes = await fetch('https://ghostae.com' + s);
      const text = await sRes.text();
      if (text.includes('supabase') || text.includes('anon') || text.includes('Ghostae') || text.includes('499')) {
        console.log('Script matches in:', s);
        const sbMatches = text.match(/https:\/\/[a-z0-9]+\.supabase\.co/g);
        if (sbMatches) console.log('Supabase URL:', sbMatches);
        const keyMatch = text.match(/eyJhbGciOi[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g);
        if (keyMatch) console.log('Found JWT/Key:', keyMatch[0]);
      }
    } catch(e) {}
  }
}
inspectBundles();
