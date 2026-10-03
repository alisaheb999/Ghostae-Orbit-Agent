async function extractFull() {
  const tRes = await fetch('https://ghostae.com/assets/text-CW2TPFNf.js');
  const tText = await tRes.text();
  console.log('=== GHOSTAE TEXT FULL FAQS & DETAILS ===');
  const tFaqs = [...tText.matchAll(/\{q:`([^`]+)`,a:`([^`]+)`\}/g)];
  tFaqs.forEach(f => console.log('Q:', f[1], '\nA:', f[2], '\n'));

  const cRes = await fetch('https://ghostae.com/assets/caption-BeUizp3B.js');
  const cText = await cRes.text();
  console.log('=== GHOSTAE CAPTION FULL FAQS & DETAILS ===');
  const cFaqs = [...cText.matchAll(/<h3[^>]*>([^<]+)<\/h3>[\s\S]*?<p[^>]*>([^<]+)<\/p>/g)];
  cFaqs.forEach(f => console.log('Q:', f[1].trim(), '\nA:', f[2].trim(), '\n'));

  // Also pricing boxes in Caption
  const cPricing = [...cText.matchAll(/<h3[^>]*>([^<]+)<\/h3>[\s\S]*?class="[^"]*font-bold[^"]*">([^<]+)<\/span>/g)];
  console.log('Caption Pricing:');
  cPricing.forEach(p => console.log(p[1].trim(), ':', p[2].trim()));
}
extractFull();
