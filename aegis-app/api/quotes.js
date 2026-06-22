// Vercel 서버리스: 보유종목 실시간 시세(원화 환산) — AI 자동매매 계좌 실시간 평가용.
// GET /api/quotes?tickers=005930.KS,AAPL  → { prices: { "005930.KS": 85000, "AAPL": 372000 }, fx, asOf }
// .KS/.KQ = 원화 그대로, 그 외(미국) = USD×USDKRW 로 원화 환산. (장 마감 시 마지막 종가 반환)
const UA = { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AegisBot/1.0)' } };

async function quote(symbol) {
  try {
    // 프리/정규/애프터 포함(includePrePost) — 타임시리즈 마지막 체결가 = 최신가(정규/시간외 모두)
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m&includePrePost=true`, UA);
    const j = await r.json();
    const res0 = j?.chart?.result?.[0];
    let p = res0?.meta?.regularMarketPrice ?? null;
    const c = res0?.indicators?.quote?.[0]?.close;
    if (Array.isArray(c)) for (let i = c.length - 1; i >= 0; i--) { if (c[i] != null) { p = c[i]; break; } }
    return p;
  } catch { return null; }
}

export default async function handler(req, res) {
  const raw = (req.query.tickers || '').toString();
  const symbols = raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 40);
  if (!symbols.length) return res.status(400).json({ error: 'no tickers' });
  try {
    const needFx = symbols.some(s => !(s.endsWith('.KS') || s.endsWith('.KQ')));
    const fx = needFx ? ((await quote('KRW=X')) || 1380) : 1;
    const vals = await Promise.all(symbols.map(quote));
    const prices = {};
    symbols.forEach((s, i) => {
      const p = vals[i];
      if (p == null) return;
      const isKR = s.endsWith('.KS') || s.endsWith('.KQ');
      prices[s] = isKR ? p : p * fx;   // 원화 환산
    });
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return res.status(200).json({ prices, fx, asOf: Date.now() });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
