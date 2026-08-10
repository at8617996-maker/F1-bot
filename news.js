// news.js
// Pulls real F1 headlines from a public RSS feed at runtime. Only
// headline + link are shown (no article text reproduced) — same as
// any news aggregator.

const fetch = require('node-fetch');

const FEED_URL = 'https://feeds.bbci.co.uk/sport/formula1/rss.xml';

async function fetchF1News(limit = 5) {
  try {
    const res = await fetch(FEED_URL, { timeout: 8000 });
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit);
    return items.map(m => {
      const block = m[1];
      const title = (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'Untitled';
      const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
      return {
        title: title.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
        link: link.trim()
      };
    });
  } catch (err) {
    console.error('News fetch failed:', err.message);
    return [];
  }
}

module.exports = { fetchF1News };
