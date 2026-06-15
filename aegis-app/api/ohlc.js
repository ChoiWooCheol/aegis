// Vercel 서버리스 함수: 종목 OHLC 캔들을 야후 차트 API에서 실시간 프록시.
//   GET /api/ohlc?id=005930&tf=1d   →  { symbol, tf, candles:[{t,o,h,l,c,v}, ...] }
// 서버사이드 fetch라 CORS 없음. git에 캔들 파일을 두지 않아도 됨(항상 최신).
//
// id: 프론트의 clean code. 숫자면 KOSPI(.KS), 알파벳이면 미국 티커 그대로.
// tf: 4h | 1d | 1wk | 1mo

const TF_MAP = {
  '4h':  { interval: '60m', range: '1mo', resample: 4 }, // 야후엔 4h 없음 → 1h 받아 4개씩 묶음
  '1d':  { interval: '1d',  range: '1y' },
  '1wk': { interval: '1wk', range: '2y' },
  '1mo': { interval: '1mo', range: '5y' },
};

function resample(candles, n) {
  const out = [];
  for (let i = 0; i < candles.length; i += n) {
    const g = candles.slice(i, i + n);
    if (!g.length) continue;
    out.push({
      t: g[0].t,
      o: g[0].o,
      h: Math.max(...g.map((x) => x.h)),
      l: Math.min(...g.map((x) => x.l)),
      c: g[g.length - 1].c,
      v: g.reduce((s, x) => s + (x.v || 0), 0),
    });
  }
  return out;
}

export default async function handler(req, res) {
  const id = String(req.query.id || '').trim();
  const tf = String(req.query.tf || '1d');
  if (!id) return res.status(400).json({ error: 'id required' });

  const symbol = /^\d+$/.test(id) ? `${id}.KS` : id;   // 숫자코드 → KOSPI
  const cfg = TF_MAP[tf] || TF_MAP['1d'];
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=${cfg.interval}&range=${cfg.range}`;

  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return res.status(502).json({ error: `yahoo ${r.status}` });
    const j = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result || !result.timestamp) return res.status(404).json({ error: 'no data', symbol });

    const ts = result.timestamp;
    const q = result.indicators?.quote?.[0] || {};
    const round2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
    let candles = ts
      .map((t, i) => ({
        t,
        o: round2(q.open?.[i]),
        h: round2(q.high?.[i]),
        l: round2(q.low?.[i]),
        c: round2(q.close?.[i]),
        v: q.volume?.[i] ?? 0,
      }))
      .filter((c) => c.o != null && c.c != null && c.h != null && c.l != null);

    if (cfg.resample) candles = resample(candles, cfg.resample);

    // Vercel 엣지 캐시: 5분 신선, 그 뒤 10분 stale-while-revalidate
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ symbol, tf, candles });
  } catch (e) {
    return res.status(502).json({ error: String(e) });
  }
}
