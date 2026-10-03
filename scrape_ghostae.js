async function scrape() {
  const pages = [
    'https://ghostae.com',
    'https://ghostae.com/products',
    'https://ghostae.com/products/text',
    'https://ghostae.com/products/caption',
    'https://ghostae.com/docs'
  ];

  for (const url of pages) {
    try {
      const res = await fetch(url);
      const html = await res.text();
      console.log('=== URL:', url, '===');
      const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/g)].map(m => m[1]);
      console.log('Images:', imgs);
      const ogImg = html.match(/property="og:image"\s+content="([^"]+)"/);
      if (ogImg) console.log('OG Image:', ogImg[1]);
    } catch (e) {
      console.error(e.message);
    }
  }
}
scrape();
