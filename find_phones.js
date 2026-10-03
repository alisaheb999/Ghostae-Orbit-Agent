async function findPhoneNumbers() {
  const scripts = ['/assets/text-CW2TPFNf.js', '/assets/caption-BeUizp3B.js', '/assets/index-ZPGXM7dD.js'];
  for (const s of scripts) {
    const res = await fetch('https://ghostae.com' + s);
    const text = await res.text();
    const phones = text.match(/(?:01[3-9]\d{8}|\+880\s?1[3-9]\d{8})/g);
    if (phones) console.log(s, 'phones:', phones);
  }
}
findPhoneNumbers();
