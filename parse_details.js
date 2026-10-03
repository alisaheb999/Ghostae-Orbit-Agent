async function parseTextAndCaption() {
  const tRes = await fetch('https://ghostae.com/assets/text-CW2TPFNf.js');
  const tText = await tRes.text();
  console.log('--- Ghostae Text Snippet ---');
  // Look for pricing, features, presets
  const pricingMatches = tText.match(/(?:499|১৭০|৩০০|৩৩|ফ্রি|লাইফটাইম)[^"]{0,100}/g);
  console.log('Text matches:', pricingMatches?.slice(0, 10));

  // Now let's fetch products/caption html to get caption script
  const cRes = await fetch('https://ghostae.com/products/caption');
  const cHtml = await cRes.text();
  const cScripts = [...cHtml.matchAll(/href=["'](\/assets\/[^"']+\.js)["']/g)].map(m => m[1]);
  console.log('Caption scripts:', cScripts);
  for (const s of cScripts) {
    if (s.includes('caption')) {
      const sRes = await fetch('https://ghostae.com' + s);
      const sText = await sRes.text();
      console.log('--- Caption Script Snippet ---');
      const cMatches = sText.match(/(?:199|699|Gemini|ক্যাপশন|মিনিট)[^"]{0,100}/g);
      console.log('Caption matches:', cMatches?.slice(0, 10));
    }
  }
}
parseTextAndCaption();
