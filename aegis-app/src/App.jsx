"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  Search, TrendingUp, TrendingDown, ChevronRight, BrainCircuit, 
  ArrowLeft, Loader2, Activity, Clock, AlertTriangle, 
  Target, BarChart2, Zap, Bookmark, Home, Check, Globe,
  Calendar, ChevronDown, History, BookOpen, X
} from 'lucide-react';

// ==========================================
// 💰 시장/통화 포맷 헬퍼
// ==========================================
function formatPrice(price, market) {
  const p = Number(price) || 0;
  const isKR = typeof market === 'string' && market.includes('KOSPI');
  if (isKR) return '₩' + p.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  return '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 축 라벨용 짧은 가격 표기 (KOSPI: 229만 / 미국: $292)
function compactPrice(v, market) {
  const isKR = typeof market === 'string' && market.includes('KOSPI');
  if (isKR) return new Intl.NumberFormat('ko', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  return '$' + new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(v);
}

// ==========================================
// 📈 [순수 SVG 차트] 20일 기대 궤적 + 분위수 팬차트(p10~p90)
// ==========================================
function PredictiveChart({ data, bands }) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  const median = data.map(d => parseFloat(d) || 0);
  const n = median.length;

  // 분위수 밴드(있으면): 최저 분위수=하단, 최고 분위수=상단
  let lower = null, upper = null;
  if (bands && Array.isArray(bands.paths) && bands.paths.length >= 2) {
    const paths = bands.paths.map(p => p.map(v => parseFloat(v) || 0));
    lower = paths[0];
    upper = paths[paths.length - 1];
  }

  const allVals = [...median, ...(lower || []), ...(upper || [])];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const safeMin = minVal === maxVal ? minVal - 1 : minVal;
  const safeMax = minVal === maxVal ? maxVal + 1 : maxVal;
  const range = safeMax - safeMin;

  const toXY = (arr) => arr.map((val, i) => {
    const x = (i / (n - 1)) * 100;
    const y = 100 - ((val - safeMin) / range) * 100;
    return `${x},${y}`;
  });

  const medianPts = toXY(median);
  const medianLine = `M ${medianPts.join(' L ')}`;
  const zeroY = 100 - ((0 - safeMin) / range) * 100;

  let bandPath = null;
  if (lower && upper) {
    const up = toXY(upper);
    const lo = toXY(lower).reverse();
    bandPath = `M ${up.join(' L ')} L ${lo.join(' L ')} Z`;
  }
  const fillPath = bandPath ? null : `${medianLine} L 100,100 L 0,100 Z`;
  const lastVal = median[n - 1];
  const lastYpct = 100 - ((lastVal - safeMin) / range) * 100;   // 끝점(p50) 세로 위치 %

  return (
    <div className="w-full h-full relative">
      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="medGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0" />
          </linearGradient>
        </defs>
        {safeMin < 0 && safeMax > 0 && (
          <line x1="0" y1={zeroY} x2="100" y2={zeroY} stroke="#475569" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
        )}
        {/* 분위수 밴드는 옅게(맥락만), median 이 눈에 띄도록 */}
        {bandPath && <path d={bandPath} fill="#6366f1" fillOpacity="0.12" />}
        {bandPath
          ? <path d={`${medianLine} L 100,100 L 0,100 Z`} fill="url(#medGrad)" opacity="0.6" />
          : <path d={fillPath} fill="url(#medGrad)" />}
        {/* median(p50) — 밝고 굵게 */}
        <path d={medianLine} fill="none" stroke="#c7d2fe" strokeWidth="2.3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {/* y축 % 라벨 + 끝값 강조 */}
      <div className="absolute inset-0 pointer-events-none">
        <span className="absolute top-0.5 left-1 text-[9px] font-mono text-slate-500">{maxVal >= 0 ? '+' : ''}{maxVal.toFixed(1)}%</span>
        <span className="absolute bottom-4 left-1 text-[9px] font-mono text-slate-500">{minVal >= 0 ? '+' : ''}{minVal.toFixed(1)}%</span>
        {safeMin < 0 && safeMax > 0 && (
          <span className="absolute left-1 text-[9px] font-mono text-slate-600 bg-slate-900/60 px-0.5 rounded" style={{ top: `${zeroY}%`, transform: 'translateY(-50%)' }}>0%</span>
        )}
        <div className="absolute right-0.5" style={{ top: `${lastYpct}%`, transform: 'translateY(-50%)' }}>
          <span className={`text-[10px] font-mono font-bold px-1 rounded text-white ${lastVal >= 0 ? 'bg-indigo-500/90' : 'bg-rose-500/90'}`}>
            {lastVal > 0 ? '+' : ''}{lastVal.toFixed(1)}%{bandPath ? ' p50' : ''}
          </span>
        </div>
        <span className="absolute bottom-0.5 left-1 text-[10px] font-mono text-slate-500">D+1</span>
        <span className="absolute bottom-0.5 right-1 text-[10px] font-mono text-slate-500">D+20</span>
      </div>
    </div>
  );
}

// ==========================================
// 🕯️ [순수 SVG 캔들차트] 4시간/일/주/월
// ==========================================
function CandleSVG({ candles, market }) {
  if (!candles || candles.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm">
        해당 주기 데이터가 없습니다.
      </div>
    );
  }
  const maxP = Math.max(...candles.map(c => c.h));
  const minP = Math.min(...candles.map(c => c.l));
  const range = (maxP - minP) || 1;
  const step = 6, bodyW = 3.6;
  const W = candles.length * step;
  const y = (p) => 100 - ((p - minP) / range) * 100;
  const last = candles[candles.length - 1];
  const lastUp = last.c >= last.o;
  const lastYpct = 100 - ((last.c - minP) / range) * 100;

  return (
    <div className="relative w-full h-full">
      <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${W} 100`}>
        {[0, 50, 100].map(gy => (
          <line key={gy} x1="0" x2={W} y1={gy} y2={gy} stroke="#1e293b" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        ))}
        {/* 마지막 종가 기준 가로선 */}
        <line x1="0" x2={W} y1={y(last.c)} y2={y(last.c)} stroke="#64748b" strokeWidth="0.8" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
        {candles.map((c, i) => {
          const xc = i * step + step / 2;
          const up = c.c >= c.o;
          const color = up ? '#10b981' : '#f43f5e';
          const yO = y(c.o), yC = y(c.c);
          const bodyY = Math.min(yO, yC);
          const bodyH = Math.max(Math.abs(yC - yO), 0.4);
          return (
            <g key={i}>
              <line x1={xc} x2={xc} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <rect x={xc - bodyW / 2} y={bodyY} width={bodyW} height={bodyH} fill={color} />
            </g>
          );
        })}
      </svg>
      {/* 우측 가격 축 (고가 / 중간 / 저가) */}
      <div className="absolute inset-y-0 right-0 flex flex-col justify-between py-0.5 pointer-events-none text-[9px] font-mono">
        <span className="bg-slate-900/80 text-slate-400 px-1 rounded leading-tight">{compactPrice(maxP, market)}</span>
        <span className="bg-slate-900/80 text-slate-500 px-1 rounded leading-tight">{compactPrice((maxP + minP) / 2, market)}</span>
        <span className="bg-slate-900/80 text-slate-400 px-1 rounded leading-tight">{compactPrice(minP, market)}</span>
      </div>
      {/* 마지막 종가 라벨 (가로선 위치) */}
      <div className="absolute right-0" style={{ top: `${lastYpct}%`, transform: 'translateY(-50%)' }}>
        <span className={`text-[9px] font-mono font-bold px-1 rounded text-white ${lastUp ? 'bg-emerald-500/90' : 'bg-rose-500/90'}`}>
          {compactPrice(last.c, market)}
        </span>
      </div>
    </div>
  );
}

function CandleChart({ tickerId, market }) {
  const TIMEFRAMES = [
    { key: '4h', label: '4시간' },
    { key: '1d', label: '일봉' },
    { key: '1wk', label: '주봉' },
    { key: '1mo', label: '월봉' },
  ];
  const [tf, setTf] = useState('1d');
  const [candles, setCandles] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | error

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setCandles([]);
    // 서버리스 함수가 야후에서 실시간 프록시 → git에 캔들 파일 불필요
    fetch(`/api/ohlc?id=${encodeURIComponent(tickerId)}&tf=${tf}`)
      .then(r => { if (!r.ok) throw new Error('no data'); return r.json(); })
      .then(d => { if (alive) { setCandles(Array.isArray(d.candles) ? d.candles : []); setStatus('ok'); } })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [tickerId, tf]);

  const last = candles.length ? candles[candles.length - 1] : null;
  const prev = candles.length > 1 ? candles[candles.length - 2] : null;
  const changePct = last && prev && prev.c ? ((last.c / prev.c) - 1) * 100 : null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h4 className="text-white font-bold text-base md:text-lg flex items-center gap-2">
            <BarChart2 size={18} className="text-indigo-400" /> 가격 차트
          </h4>
          {last && (
            <div className="flex items-baseline gap-2">
              <span className="text-lg md:text-xl font-bold text-white font-mono">{formatPrice(last.c, market)}</span>
              {changePct !== null && (
                <span className={`text-xs md:text-sm font-mono font-bold ${changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 w-fit">
          {TIMEFRAMES.map(t => (
            <button
              key={t.key}
              onClick={() => setTf(t.key)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                tf === t.key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full h-48 md:h-64 bg-slate-950/60 rounded-xl border border-slate-800/50 p-2">
        {status === 'loading' && (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            <Loader2 size={28} className="animate-spin" />
          </div>
        )}
        {status === 'error' && (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm text-center px-4">
            차트를 불러올 수 없습니다.<br />(로컬 dev에선 `vercel dev`로 /api 함수 실행 필요)
          </div>
        )}
        {status === 'ok' && <CandleSVG candles={candles} market={market} />}
      </div>
    </div>
  );
}

// ==========================================
// 📖 사용법 모달 (엔진 가동 후 1회 자동 + 헤더 '사용법' 버튼)
// ==========================================
function GuideModal({ onClose }) {
  const Section = ({ icon, title, children }) => (
    <div className="mb-5">
      <h3 className="flex items-center gap-2 text-white font-bold text-sm mb-2">{icon}{title}</h3>
      <div className="text-slate-300 text-[13px] leading-relaxed">{children}</div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto custom-scrollbar p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-white flex items-center gap-2"><BookOpen className="text-indigo-400" size={22}/> 사용법</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={22}/></button>
        </div>

        <Section icon={<Activity size={15} className="text-indigo-400"/>} title="이 앱은?">
          KOSPI·NASDAQ 종목을 <b className="text-white">횡단면 모멘텀 + AI</b>로 분석해 보여주는 <b className="text-white">참고용 대시보드</b>입니다. 미래를 예측하는 도구가 아니라, 의사결정을 돕는 정보입니다.
        </Section>

        <Section icon={<Target size={15} className="text-emerald-400"/>} title="시그널 (Buy · Wait · Sell)">
          같은 시장 종목들 사이의 <b className="text-white">상대 모멘텀 순위</b>입니다. 상위 1/3 = <span className="text-emerald-400 font-bold">Buy</span>, 중간 = <span className="text-amber-400 font-bold">Wait</span>, 하위 1/3 = <span className="text-rose-400 font-bold">Sell</span>. <b className="text-white">절대적인 등락 예측이 아닙니다.</b>
        </Section>

        <Section icon={<BarChart2 size={15} className="text-indigo-400"/>} title="보조 지표">
          · <b className="text-white">모멘텀 점수(0~100)</b> — 시장 내 상대 순위<br/>
          · <b className="text-white">리스크 등급</b> — 변동성(높을수록 가격이 크게 출렁임)<br/>
          · <b className="text-white">진입 타이밍</b> — 단기 진입 적합도 참고치
        </Section>

        <Section icon={<BrainCircuit size={15} className="text-indigo-400"/>} title="AI 자동매매 & 브리핑">
          AI가 자체 규칙으로 운용하는 <b className="text-white">가상(페이퍼) 계좌</b>입니다. 매매는 <b className="text-white">다음날 시가 체결</b>, 잔고는 실시간 시세로 평가됩니다. AI 브리핑은 LLM이 생성한 <b className="text-white">참고용 해설</b>로 부정확할 수 있습니다.
        </Section>

        <Section icon={<Clock size={15} className="text-indigo-400"/>} title="데이터 갱신 시점 (한국시간)">
          매일 <b className="text-white">밤 12시 30분경</b> 자동 갱신이 시작되어, 분석·빌드·배포에 약 2시간이 걸립니다. → <b className="text-white">새벽 2~3시경</b> 최신 데이터로 업데이트됩니다. 데이터는 <b className="text-white">전 거래일 종가</b> 기준입니다.
        </Section>

        <Section icon={<Calendar size={15} className="text-indigo-400"/>} title="과거 이력 보기">
          상단 <b className="text-white">날짜 선택기</b>로 과거 날짜의 리포트를 볼 수 있습니다. 종목 상세에서도 날짜를 바꿔 그 종목의 과거 평가를 확인할 수 있습니다.
        </Section>

        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200/90 text-[12px] leading-relaxed flex gap-2">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5"/>
          <div><b className="text-amber-300">투자 유의</b> — 본 서비스의 모든 정보(시그널·AI 브리핑·자동매매 포함)는 <b>투자 권유가 아닌 참고용</b>입니다. 투자 판단과 그 결과에 대한 책임은 <b>전적으로 이용자 본인</b>에게 있습니다.</div>
        </div>

        <button onClick={onClose} className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors">확인했습니다</button>
      </div>
    </div>
  );
}

export default function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [masterUniverse, setMasterUniverse] = useState([]);
  const [availableDates, setAvailableDates] = useState([]); 
  const [currentDate, setCurrentDate] = useState(""); 
  const [isLoading, setIsLoading] = useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false); 
  
  const [activeTab, setActiveTab] = useState('home'); 
  const [signalFilter, setSignalFilter] = useState('All'); 
  const [marketFilter, setMarketFilter] = useState('All'); 
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [watchlistIds, setWatchlistIds] = useState([]); 
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const dateRef = useRef(null);
  const detDateRef = useRef(null);
  const [detDateOpen, setDetDateOpen] = useState(false);   // 상세화면 날짜 선택기
  const [visitors, setVisitors] = useState(null);          // 오늘 방문자 수
  const [showGuide, setShowGuide] = useState(false);       // 사용법 모달

  useEffect(() => {
    if (isStarted) {
      fetchAvailableDates();
      if (!localStorage.getItem('aegis_guide_seen')) {     // 첫 가동 시 사용법 1회 자동 표시
        setShowGuide(true);
        localStorage.setItem('aegis_guide_seen', '1');
      }
    }
  }, [isStarted]);

  // 오늘 방문자 카운트 (브라우저당 1일 1회만 증가 → 대략 순방문자). 무료 카운터, 실패 시 표시 생략.
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });  // YYYY-MM-DD(KST)
    const flag = `aegis_v_${today}`;
    const seen = localStorage.getItem(flag);
    fetch(`https://abacus.jasoncameron.dev/${seen ? 'get' : 'hit'}/aegis-stock/visit-${today}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j && typeof j.value === 'number') { setVisitors(j.value); if (!seen) localStorage.setItem(flag, '1'); } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsSearchFocused(false);
      if (dateRef.current && !dateRef.current.contains(e.target)) setIsDateMenuOpen(false);
      if (detDateRef.current && !detDateRef.current.contains(e.target)) setDetDateOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔙 브라우저 뒤로가기: 상세화면 → 대시보드 (사이트 이탈 방지)
  const detailPushedRef = useRef(false);
  useEffect(() => {
    const onPop = () => { detailPushedRef.current = false; setSelectedTicker(null); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (selectedTicker && !detailPushedRef.current) {
      detailPushedRef.current = true;            // 대시보드 → 상세 진입 시 히스토리 1개 추가
      window.history.pushState({ aegisDetail: true }, "");
    } else if (!selectedTicker) {
      detailPushedRef.current = false;
    }
  }, [selectedTicker]);
  // 상세 닫고 대시보드(또는 탭)로 — 푸시했던 히스토리를 소비해 뒤로가기와 동기화
  const goDashboard = (tab) => {
    if (tab) setActiveTab(tab);
    if (detailPushedRef.current) window.history.back();
    else setSelectedTicker(null);
  };

  const fetchAvailableDates = async () => {
    try {
      const res = await fetch("/available_dates.json");
      const dates = await res.json();
      setAvailableDates(dates);
      if (dates.length > 0) {
        const latest = dates[dates.length - 1];
        setCurrentDate(latest);
        fetchMarketData(latest);
      }
    } catch (e) {
      console.error("날짜 목록 로드 실패:", e);
      fetchMarketData(); 
    }
  };

  const fetchMarketData = async (date) => {
    setIsLoading(true);
    const keepId = selectedTicker?.id;   // 상세화면에서 날짜를 바꾸면 같은 종목을 유지하기 위함
    try {
      const targetPath = date ? `/aegis_data_${date}.json` : "/aegis_data.json";
      const res = await fetch(targetPath);
      const data = await res.json();
      setMasterUniverse(data);
      // 상세화면이면 같은 종목의 '그 날짜' 데이터로 유지(과거 이력 조회), 없으면 대시보드로
      setSelectedTicker(keepId ? (data.find(t => t.id === keepId) || null) : null);
    } catch (e) {
      alert(`${date} 데이터를 불러올 수 없습니다.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    const results = masterUniverse.filter(t => 
      String(t.name || '').toLowerCase().includes(query.toLowerCase()) || 
      String(t.id || '').toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);
    setSearchResults(results);
  };

  const toggleWatchlist = (e, tickerId) => {
    e.stopPropagation();
    setWatchlistIds(prev => prev.includes(tickerId) ? prev.filter(id => id !== tickerId) : [...prev, tickerId]);
  };

  const displayData = masterUniverse.filter(t => {
    if (activeTab === 'watchlist' && !watchlistIds.includes(t.id)) return false;
    if (marketFilter !== 'All' && t.market !== marketFilter) return false;
    if (signalFilter !== 'All' && t.signal !== signalFilter) return false;
    return true;
  });

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-6 text-center relative">
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* 📱 반응형 폰트 사이즈 적용 */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-in zoom-in duration-700">
            Aegis <span className="text-indigo-500">AI</span> V2
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
            거시 경제 자금 흐름과 딥러닝 위험도 분석을 결합하여<br className="hidden md:block"/> 최고의 퀀트 추론(Reasoning)을 제공합니다.
          </p>
          <button onClick={() => setIsStarted(true)} className="flex items-center gap-3 bg-white text-slate-900 px-6 py-4 md:px-8 rounded-full text-base md:text-lg font-bold shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:scale-105 transition-all">
            <BrainCircuit size={24} className="text-indigo-600" />
            엔진 가동 <ChevronRight />
          </button>
        </div>

        {/* ⚖️ 법적 면책 조항 (Disclaimer) */}
        <div className="w-full max-w-3xl pb-8 md:pb-12 mt-12">
          <p className="text-[10px] md:text-xs text-slate-600 leading-relaxed text-center break-keep">
            <span className="font-bold text-slate-500">⚠️ 투자 유의사항 (Disclaimer):</span> 본 서비스에서 제공하는 AI 퀀트 분석 및 주가 예상 궤적은 투자 판단을 돕기 위한 참고자료일 뿐이며, 특정 종목에 대한 매수/매도 권유를 목적으로 하지 않습니다. 알고리즘 기반의 예측은 과거 데이터를 바탕으로 산출되므로 미래의 수익을 절대 보장하지 않으며, 거시 경제 및 시장 상황에 따라 실제 주가와 크게 다를 수 있습니다. 모든 투자의 최종 결정과 그에 따른 법적·재무적 책임은 전적으로 투자자 본인에게 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col">
      {/* 📱 모바일에서는 헤더 아이템들이 아래로 접히도록 flex-col 적용 */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-4 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-2xl">
        
        {/* 상단: 로고 및 날짜 선택기 */}
        <div className="flex items-center justify-between w-full lg:w-auto gap-4">
          <h2 className="text-xl md:text-2xl font-bold text-white cursor-pointer shrink-0" onClick={() => goDashboard('home')}>
            Aegis <span className="text-indigo-500">Terminal</span>
          </h2>
          {visitors != null && (
            <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 md:px-2.5 py-1 rounded-full shrink-0" title="오늘 방문자 수">
              <Activity size={12} className="text-emerald-400" /> 오늘 {visitors.toLocaleString()}명
            </span>
          )}

          <div className="relative shrink-0" ref={dateRef}>
            <button 
              onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
              className="flex items-center gap-2 md:gap-3 bg-slate-900 border border-slate-700 px-3 py-2 md:px-4 rounded-xl hover:border-indigo-500 transition-all group"
            >
              <Calendar size={16} className="text-indigo-400" />
              <div className="text-left hidden sm:block">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Reporting Date</p>
                <p className="text-sm font-bold text-white font-mono">{currentDate || "Loading..."}</p>
              </div>
              <ChevronDown size={16} className={`text-slate-500 transition-transform ${isDateMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDateMenuOpen && (
              <div className="absolute top-14 right-0 lg:left-0 w-56 md:w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                <p className="text-[10px] font-bold text-slate-500 p-3 uppercase tracking-widest border-b border-slate-800 mb-2 flex items-center gap-2">
                  <History size={12}/> Available Reports
                </p>
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                  {availableDates.map(date => (
                    <button 
                      key={date}
                      onClick={() => { setCurrentDate(date); fetchMarketData(date); setIsDateMenuOpen(false); }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-mono flex items-center justify-between hover:bg-slate-800 transition-colors ${currentDate === date ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-300'}`}
                    >
                      {date}
                      {currentDate === date && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 하단: 메뉴 버튼 및 검색창 */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <nav className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800 w-full sm:w-auto">
            <button onClick={() => goDashboard('home')} className={`flex-1 sm:flex-none px-1.5 sm:px-4 py-2 rounded-md flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Home size={16} className="hidden sm:block"/> 마켓 홈
            </button>
            <button onClick={() => goDashboard('watchlist')} className={`flex-1 sm:flex-none px-1.5 sm:px-4 py-2 rounded-md flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'watchlist' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Bookmark size={16} className="hidden sm:block"/> 관심종목
            </button>
            <button onClick={() => goDashboard('autotrade')} className={`flex-1 sm:flex-none px-1.5 sm:px-4 py-2 rounded-md flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'autotrade' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <BrainCircuit size={16} className="hidden sm:block"/> AI 자동매매
            </button>
            <button onClick={() => setShowGuide(true)} className="flex-1 sm:flex-none px-1.5 sm:px-4 py-2 rounded-md flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm font-bold whitespace-nowrap text-slate-400 hover:text-white hover:bg-slate-800 transition-all" title="사용법">
              <BookOpen size={16} className="hidden sm:block"/> 사용법
            </button>
          </nav>

          <div className="relative w-full sm:w-80" ref={searchRef}>
            <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
            <input 
              type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} onFocus={() => setIsSearchFocused(true)}
              placeholder="Search Tickers..." 
              className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-full focus:outline-none focus:border-indigo-500 transition-all"
            />
            {isSearchFocused && searchQuery && (
              <div className="absolute top-12 left-0 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                {searchResults.length > 0 ? (
                  <ul className="max-h-60 overflow-y-auto custom-scrollbar">
                    {searchResults.map(t => (
                      <li key={t.id} onClick={() => {setSelectedTicker(t); setIsSearchFocused(false); setSearchQuery("");}} className="px-4 py-3 hover:bg-slate-700 cursor-pointer flex items-center justify-between border-b border-slate-700/50">
                        <div>
                          <div className="font-bold text-white text-sm">{t.name}</div>
                          <div className="text-xs text-slate-400">{t.id}</div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-500/10 text-indigo-400">{t.signal}</span>
                      </li>
                    ))}
                  </ul>
                ) : <div className="p-4 text-center text-sm text-slate-400">No results found.</div>}
              </div>
            )}
          </div>
        </div>
      </header>

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

      {/* 📱 모바일 여백(padding) 조정: p-4 */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar relative bg-slate-950">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <Loader2 size={48} className="animate-spin text-indigo-500 mb-6" />
            <p className="text-slate-400 animate-pulse font-bold tracking-widest uppercase text-sm md:text-base">Fetching {currentDate} Data...</p>
          </div>
        ) : activeTab === 'autotrade' ? (
          <AutoTradeView />
        ) : selectedTicker ? (
          
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
              <button onClick={() => goDashboard()} className="flex items-center justify-center gap-2 text-slate-400 hover:text-white bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 transition-colors w-full sm:w-auto">
                <ArrowLeft size={18} /> 대시보드로 돌아가기
              </button>
              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
                <div className="relative" ref={detDateRef}>
                  <button onClick={() => setDetDateOpen(o => !o)} title="날짜를 바꿔 이 종목의 과거 이력 보기"
                    className="text-[10px] sm:text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors">
                    <Calendar size={14}/> {currentDate} <ChevronDown size={13} className={`transition-transform ${detDateOpen ? 'rotate-180' : ''}`}/>
                  </button>
                  {detDateOpen && (
                    <div className="absolute right-0 top-12 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden min-w-[160px]">
                      <div className="px-3 py-2 text-[10px] text-slate-500 font-bold border-b border-slate-700/50">과거 이력 조회</div>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {[...availableDates].reverse().map(date => (
                          <button key={date} onClick={() => { setCurrentDate(date); fetchMarketData(date); setDetDateOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-mono transition-colors ${date === currentDate ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300 hover:bg-slate-700'}`}>
                            {date}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={(e) => toggleWatchlist(e, selectedTicker.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all border ${watchlistIds.includes(selectedTicker.id) ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}>
                  {watchlistIds.includes(selectedTicker.id) ? <Check size={18}/> : <Bookmark size={18}/>}
                </button>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-10 border-b border-slate-800 pb-6 md:pb-8">
              <div>
                {/* 📱 긴 종목 이름 모바일 사이즈 대응 */}
                <h2 className="text-4xl md:text-6xl font-bold text-white mb-2 leading-tight">
                  {selectedTicker.name} <span className="block md:inline text-2xl md:text-3xl text-slate-600 font-light mt-1 md:mt-0 md:ml-4">{selectedTicker.id}</span>
                </h2>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-4 md:mt-0">
                  <span className="text-indigo-400 font-bold tracking-widest uppercase text-xs md:text-sm">Aegis AI Quant</span>
                  <span className="hidden md:block w-1 h-1 bg-slate-700 rounded-full"></span>
                  <span className="text-slate-500 text-xs md:text-sm font-mono">{selectedTicker.market}</span>
                </div>
                {selectedTicker.price ? (
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl md:text-4xl font-bold text-white font-mono">{formatPrice(selectedTicker.price, selectedTicker.market)}</span>
                    <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-widest font-bold">종가 · Close</span>
                  </div>
                ) : null}
                {selectedTicker.momentumScore != null ? (
                  <div className="mt-2 flex items-center gap-2 flex-wrap text-xs md:text-sm font-mono font-bold">
                    <span className="text-indigo-400">모멘텀 {selectedTicker.momentumScore}/100</span>
                    <span className="text-sky-400">리스크 {selectedTicker.riskGrade}</span>
                    <span className="text-amber-400">진입 {selectedTicker.entryTiming}</span>
                    <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-widest font-bold">신호 근거</span>
                  </div>
                ) : null}
              </div>
              <div className={`text-2xl md:text-4xl font-black px-8 py-3 md:py-4 rounded-2xl md:rounded-3xl border shadow-2xl text-center ${
                selectedTicker.signal === 'Buy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                selectedTicker.signal === 'Sell' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {selectedTicker.signal || 'WAIT'}
              </div>
            </div>

            {/* 📱 핵심 지표 모바일 2열(grid-cols-2), 데스크탑 4열(lg:grid-cols-4) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-10">
              <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-lg">
                <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><TrendingUp size={14}/> 모멘텀 점수</p>
                <p className="text-xl md:text-3xl font-mono font-bold text-indigo-400">{selectedTicker.momentumScore != null ? selectedTicker.momentumScore : '—'}<span className="text-xs md:text-sm font-normal text-slate-500"> /100</span></p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-lg">
                <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><Zap size={14}/> 리스크 등급</p>
                <p className={`text-xl md:text-3xl font-mono font-bold ${selectedTicker.riskGrade === '높음' ? 'text-rose-400' : selectedTicker.riskGrade === '낮음' ? 'text-emerald-400' : 'text-amber-400'}`}>{selectedTicker.riskGrade || '—'}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-lg">
                <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><BarChart2 size={14}/> 진입 타이밍</p>
                <p className={`text-xl md:text-3xl font-mono font-bold ${selectedTicker.entryTiming === '양호' ? 'text-emerald-400' : selectedTicker.entryTiming === '주의' ? 'text-rose-400' : 'text-amber-400'}`}>{selectedTicker.entryTiming || '—'}</p>
              </div>
              <div className="bg-indigo-900/30 border border-indigo-500/40 p-4 md:p-6 rounded-2xl md:rounded-3xl relative overflow-hidden shadow-2xl col-span-2 lg:col-span-1">
                <p className="text-indigo-300 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><Zap size={14}/> Aegis Score</p>
                <p className="text-2xl md:text-3xl text-indigo-400 font-black">{selectedTicker.positiveScore} <span className="text-xs md:text-sm font-normal text-indigo-500/50">/ 100</span></p>
                <div className="absolute bottom-0 left-0 h-1 bg-indigo-500" style={{ width: `${selectedTicker.positiveScore}%` }}></div>
              </div>
            </div>

            {/* 🕯️ 종목별 캔들차트 (4시간/일/주/월) + 시장 종가 */}
            <div className="bg-slate-900/50 border border-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl mb-4">
              <CandleChart tickerId={selectedTicker.id} market={selectedTicker.market} />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 p-6 md:p-8 rounded-2xl md:rounded-3xl border-l-4 border-l-indigo-600">
                <h4 className="text-indigo-400 font-bold mb-3 text-[10px] md:text-xs tracking-widest uppercase flex items-center gap-2">01. Macro & Momentum</h4>
                <p className="text-slate-200 leading-relaxed text-base md:text-xl font-medium">{selectedTicker.reason1}</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-6 md:p-8 rounded-2xl md:rounded-3xl">
                <h4 className="text-slate-500 font-bold mb-3 text-[10px] md:text-xs tracking-widest uppercase">02. Deep Learning Risk</h4>
                <p className="text-slate-300 leading-relaxed text-sm md:text-lg">{selectedTicker.reason2}</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-6 md:p-8 rounded-2xl md:rounded-3xl">
                <h4 className="text-slate-500 font-bold mb-3 text-[10px] md:text-xs tracking-widest uppercase">03. Final Strategy</h4>
                <p className="text-white leading-relaxed text-base md:text-xl font-bold">{selectedTicker.reason3}</p>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-indigo-950/50 border border-indigo-500/30 p-6 md:p-10 rounded-3xl md:rounded-[40px] mt-6 relative overflow-hidden shadow-2xl">
                <Activity size={120} className="absolute -top-10 -right-10 text-indigo-500/10 hidden sm:block" />
                <h4 className="text-white font-bold mb-6 md:mb-8 text-base md:text-lg flex items-center gap-2 md:gap-3 relative z-10">
                  <BrainCircuit size={20} className="text-indigo-400 md:w-6 md:h-6"/> Executive Briefing
                </h4>
                <ul className="space-y-4 md:space-y-6 relative z-10">
                  {Array.isArray(selectedTicker.briefing) && selectedTicker.briefing.map((line, idx) => (
                    <li key={idx} className="flex gap-4 md:gap-6 items-start group">
                      <span className="shrink-0 flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-lg md:rounded-2xl bg-indigo-500/20 text-indigo-400 text-xs md:text-sm font-bold mt-0.5 border border-indigo-500/30 group-hover:bg-indigo-500 group-hover:text-white transition-colors">{idx + 1}</span>
                      <span className="text-slate-200 text-base md:text-lg leading-relaxed">{line}</span>
                    </li>
                  ))}
                </ul>

                {Array.isArray(selectedTicker.expectedPath) && selectedTicker.expectedPath.length > 0 && (
                  <div className="mt-8 md:mt-12 pt-8 md:pt-10 border-t border-slate-800/50">
                    <h5 className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 md:mb-6 flex items-center gap-2">
                      <TrendingUp size={14} className="text-emerald-500 md:w-4 md:h-4" /> 20-Day Estimated Return
                      {selectedTicker.expectedBands ? <span className="text-indigo-400/70 normal-case tracking-normal">· 팬차트 p10~p90</span> : null}
                    </h5>
                    <div className="w-full h-32 md:h-48">
                      <PredictiveChart data={selectedTicker.expectedPath} bands={selectedTicker.expectedBands} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
        ) : (
          /* ==========================================
             [뷰 B] 오리지널 대시보드 UI (모바일 반응형 완벽 대응)
             ========================================== */
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {activeTab === 'home' && (
              <div className="mb-8 md:mb-10 space-y-4 md:space-y-6 bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-800 shadow-sm">
                
                <div>
                  <h3 className="text-xs md:text-sm font-bold text-slate-500 mb-2 md:mb-3 uppercase tracking-wider">시장 선택</h3>
                  {/* 📱 모바일에서는 스크롤 가능하게 flex-wrap 해제 또는 gap 조절 */}
                  <div className="flex flex-wrap gap-2">
                    {['All', 'KOSPI 100', 'KOSPI 200', 'NASDAQ 100', 'NASDAQ 500'].map(market => (
                      <button 
                        key={market} 
                        onClick={() => setMarketFilter(market)}
                        className={`px-3 py-2 md:px-4 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-1 md:gap-2 border ${
                          marketFilter === market 
                            ? 'bg-slate-700 text-white border-slate-600 shadow-inner' 
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {market === 'All' ? <Globe size={14} className="hidden sm:block" /> : null}
                        {market === 'All' ? '전체 시장' : market}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs md:text-sm font-bold text-slate-500 mb-2 md:mb-3 uppercase tracking-wider">AI 시그널</h3>
                  <div className="flex flex-wrap gap-2 md:gap-3">
                    {['All', 'Buy', 'Wait', 'Sell'].map(sig => (
                      <button 
                        key={sig} onClick={() => setSignalFilter(sig)}
                        className={`px-4 py-2 md:px-6 md:py-2.5 rounded-full text-xs md:text-sm font-bold transition-all flex items-center gap-1 md:gap-2 border ${
                          signalFilter === sig 
                            ? (sig === 'Buy' ? 'bg-emerald-600 text-white border-emerald-500' : sig === 'Sell' ? 'bg-rose-600 text-white border-rose-500' : sig === 'Wait' ? 'bg-amber-600 text-white border-amber-500' : 'bg-indigo-600 text-white border-indigo-500')
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {sig === 'Buy' && <TrendingUp size={14} />}
                        {sig === 'Sell' && <TrendingDown size={14} />}
                        {sig === 'Wait' && <Clock size={14} />}
                        {sig === 'All' && <Activity size={14} />}
                        {sig === 'All' ? '전체 보기' : sig}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 border-b border-slate-800 pb-4 gap-2">
              <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                {activeTab === 'watchlist' ? <Bookmark className="text-indigo-400 w-5 h-5"/> : <Activity className="text-indigo-400 w-5 h-5"/>}
                {activeTab === 'watchlist' ? '내 관심종목' : '시장 분석 결과'} 
                <span className="text-[10px] md:text-sm font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded-md ml-1 md:ml-2">{displayData.length}건</span>
              </h3>
              <span className="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-500 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest w-fit">
                {currentDate}
              </span>
            </div>

            {/* 📱 모바일 1열, 태블릿 2열, PC 3/4열 반응형 그리드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 pb-20">
              {displayData.length > 0 ? displayData.map(ticker => (
                <TickerCard 
                  key={ticker.id} 
                  ticker={ticker} 
                  onClick={() => setSelectedTicker(ticker)}
                  isBookmarked={watchlistIds.includes(ticker.id)} 
                  onBookmark={(e) => toggleWatchlist(e, ticker.id)}
                />
              )) : (
                <div className="col-span-full py-20 md:py-32 flex flex-col items-center justify-center bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed px-4 text-center">
                  <Search size={40} className="text-slate-600 mb-4" />
                  <p className="text-slate-400 text-sm md:text-lg">
                    {activeTab === 'watchlist' ? "관심종목으로 등록된 주식이 없습니다." : "조건에 맞는 종목이 없습니다."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// 🎯 종목 카드 모바일 최적화
function AutoTradeView() {
  const [accts, setAccts] = useState({});
  const [mkt, setMkt] = useState('KOSPI_100');
  const [view, setView] = useState('portfolio');
  const [live, setLive] = useState({ prices: {}, asOf: null });
  useEffect(() => {
    Promise.all([
      fetch('/autotrade_KOSPI_100.json').then(r => r.json()).catch(() => null),
      fetch('/autotrade_NASDAQ_100.json').then(r => r.json()).catch(() => null),
    ]).then(([k, n]) => setAccts({ KOSPI_100: k, NASDAQ_100: n }));
  }, []);
  // 보유종목 실시간 시세 폴링(30초) → 실시간 평가. 실패 시 배치 종가로 폴백.
  useEffect(() => {
    const acc = accts[mkt];
    if (!acc || !acc.positions || !acc.positions.length) return;
    let alive = true;
    const tk = acc.positions.map(p => p.ticker).join(',');
    setLive({ prices: {}, asOf: null });
    const poll = () => fetch(`/api/quotes?tickers=${encodeURIComponent(tk)}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (alive && j && j.prices) setLive({ prices: j.prices, asOf: j.asOf }); })
      .catch(() => {});
    poll();
    const id = setInterval(poll, 30000);
    return () => { alive = false; clearInterval(id); };
  }, [mkt, accts]);
  const fmt = (v) => Math.round(v || 0).toLocaleString();
  if (accts[mkt] === undefined) return <div className="text-center text-slate-400 py-24 animate-pulse">AI 자동매매 계좌 불러오는 중…</div>;
  const a = accts[mkt];
  if (!a) return <div className="text-center text-slate-400 py-24">자동매매 데이터가 아직 없습니다.</div>;

  // 실시간 평가(시세 폴링 성공 시) → 폴백: 배치 종가
  const lp = live.prices || {};
  const isLive = live.asOf != null && Object.keys(lp).length > 0;
  const liveStock = (a.positions || []).reduce((s, p) => s + p.shares * (lp[p.ticker] ?? p.price), 0);
  const equity = isLive ? Math.round(a.cash + liveStock) : a.equity;
  const ret = isLive ? +((equity / a.initial - 1) * 100).toFixed(2) : a.returnPct;
  const cashPct = isLive ? +(a.cash / equity * 100).toFixed(1) : a.cashPct;
  const up = ret >= 0;
  // 장 상태는 야후 marketState가 빈 값으로 와서 신뢰 불가 → 시각(KST/ET 장시간) 기반으로 판정
  const mktState = (() => {
    const tz = mkt === 'KOSPI_100' ? 'Asia/Seoul' : 'America/New_York';
    const pr = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const g = t => pr.find(x => x.type === t)?.value;
    if (g('weekday') === 'Sat' || g('weekday') === 'Sun') return 'CLOSED';
    let h = +g('hour'); if (h === 24) h = 0;
    const t = h * 60 + (+g('minute'));
    if (mkt === 'KOSPI_100')                                          // KST 정규 09:00~15:30, 프리 08~09, 애프터 15:30~18
      return t >= 540 && t < 930 ? 'REGULAR' : t >= 480 && t < 540 ? 'PRE' : t >= 930 && t < 1080 ? 'POST' : 'CLOSED';
    return t >= 570 && t < 960 ? 'REGULAR' : t >= 240 && t < 570 ? 'PRE' : t >= 960 && t < 1200 ? 'POST' : 'CLOSED';  // ET 정규 09:30~16, 프리 04~09:30, 애프터 16~20
  })();
  const active = isLive && ['REGULAR', 'PRE', 'POST'].includes(mktState);
  const sLabel = !isLive ? '종가 기준'
    : mktState === 'REGULAR' ? '● 실시간'
    : mktState === 'PRE' ? '● 프리마켓'
    : mktState === 'POST' ? '● 애프터마켓'
    : '장마감·종가';
  const liveTime = isLive && live.asOf ? new Date(live.asOf).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
  const eh = a.equityHistory || [];
  const ys = eh.map(p => p.equity);
  const mn = Math.min(...ys), mx = Math.max(...ys);
  const pts = eh.map((p, i) => `${(i / (eh.length - 1 || 1)) * 100},${100 - ((p.equity - mn) / ((mx - mn) || 1)) * 100}`).join(' ');
  const baseY = 100 - ((a.initial - mn) / ((mx - mn) || 1)) * 100;

  const Card = ({ label, value, color = 'text-white', sub }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5">
      <div className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1.5">{label}</div>
      <div className={`text-lg md:text-2xl font-mono font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
            <BrainCircuit className="text-indigo-400" size={28}/> AI 자동매매
            <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${active ? 'bg-emerald-500/15 text-emerald-400' : isLive ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-700/50 text-slate-400'}`}>
              {sLabel}{liveTime ? ` ${liveTime}` : ''}
            </span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">{a.rule} · 1억 시작 · {a.startedAt}~{a.asOf} · 다음날 시가 체결</p>
        </div>
        <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {['KOSPI_100', 'NASDAQ_100'].map(m => (
            <button key={m} onClick={() => setMkt(m)} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mkt === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {m === 'KOSPI_100' ? '코스피 100' : '나스닥 100'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
        <Card label="총자산" value={`${fmt(equity)}원`} color="text-cyan-300" sub={`시작 ${fmt(a.initial)}원`} />
        <Card label="누적 수익률" value={`${up ? '+' : ''}${ret}%`} color={up ? 'text-emerald-400' : 'text-rose-400'} sub={`평가손익 ${up ? '+' : ''}${fmt(equity - a.initial)}원`} />
        <Card label="현금 비중" value={`${cashPct}%`} color="text-amber-400" sub={`${fmt(a.cash)}원`} />
        <Card label="보유 종목" value={`${a.positionsCount}종목`} sub={`총 거래 ${a.stats.trades}건`} />
      </div>
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
        <Card label="Sharpe" value={a.stats.sharpe} />
        <Card label="MDD" value={`${a.stats.mdd}%`} color="text-rose-400" />
        <Card label="매도 승률" value={`${a.stats.winRate}%`} color="text-emerald-400" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 mb-6">
        <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">자산 곡선</div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-32 md:h-40">
          <line x1="0" y1={baseY} x2="100" y2={baseY} stroke="#475569" strokeWidth="0.3" strokeDasharray="1,1" />
          <polyline points={pts} fill="none" stroke={up ? '#34d399' : '#fb7185'} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="flex justify-between text-[11px] text-slate-500 mt-1"><span>{a.startedAt}</span><span>{a.asOf}</span></div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setView('portfolio')} className={`px-4 py-2 rounded-lg text-sm font-bold ${view === 'portfolio' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}><Target size={15} className="inline mr-1"/> 포트폴리오</button>
        <button onClick={() => setView('log')} className={`px-4 py-2 rounded-lg text-sm font-bold ${view === 'log' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}><History size={15} className="inline mr-1"/> 거래로그</button>
      </div>

      {view === 'portfolio' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-slate-500 text-xs border-b border-slate-800">
              <th className="text-left p-3">종목</th><th className="text-right p-3">비중</th><th className="text-right p-3">평가액</th><th className="text-right p-3">평단</th><th className="text-right p-3">현재가</th><th className="text-right p-3">수익률</th>
            </tr></thead>
            <tbody>
              {a.positions.map(p => {
                const liveP = lp[p.ticker] ?? p.price;
                const liveV = p.shares * liveP;
                const livePl = +((liveP / p.avgCost - 1) * 100).toFixed(1);
                const liveW = +((liveV / equity) * 100).toFixed(1);
                return (
                <tr key={p.ticker} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="p-3 text-white font-bold">{p.name}<span className="text-slate-600 text-xs ml-1">{p.ticker.replace('.KS', '').replace('.KQ', '')}</span></td>
                  <td className="p-3 text-right font-mono text-indigo-300">{liveW}%</td>
                  <td className="p-3 text-right font-mono text-slate-300">{fmt(liveV)}</td>
                  <td className="p-3 text-right font-mono text-slate-500">{fmt(p.avgCost)}</td>
                  <td className="p-3 text-right font-mono text-slate-300">{fmt(liveP)}</td>
                  <td className={`p-3 text-right font-mono font-bold ${livePl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{livePl >= 0 ? '+' : ''}{livePl}%</td>
                </tr>
              );})}
            </tbody>
          </table></div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto custom-scrollbar"><table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900"><tr className="text-slate-500 text-xs border-b border-slate-800">
              <th className="text-left p-3">날짜</th><th className="text-left p-3">종목</th><th className="text-center p-3">구분</th><th className="text-right p-3">체결가</th><th className="text-right p-3">수량</th><th className="text-right p-3">금액</th><th className="text-right p-3">실현손익</th>
            </tr></thead>
            <tbody>
              {a.tradeLog.map((l, i) => (
                <tr key={i} className="border-b border-slate-800/50">
                  <td className="p-3 text-slate-500 font-mono text-xs">{l.date}</td>
                  <td className="p-3 text-slate-200">{l.name}</td>
                  <td className={`p-3 text-center font-bold ${l.type === '매수' ? 'text-emerald-400' : 'text-rose-400'}`}>{l.type}</td>
                  <td className="p-3 text-right font-mono text-slate-400">{fmt(l.price)}</td>
                  <td className="p-3 text-right font-mono text-slate-400">{(l.shares || 0).toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-slate-300">{fmt(l.amount)}</td>
                  <td className={`p-3 text-right font-mono ${l.pnl == null ? 'text-slate-600' : l.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{l.pnl == null ? '—' : `${l.pnl >= 0 ? '+' : ''}${fmt(l.pnl)}`}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}

function TickerCard({ ticker, onClick, isBookmarked, onBookmark }) {
  const signalColor = ticker.signal === 'Buy' ? 'emerald' : ticker.signal === 'Sell' ? 'rose' : 'amber';
  
  return (
    <div onClick={onClick} className={`bg-slate-900 border border-slate-800 hover:border-${signalColor}-500/50 p-4 md:p-5 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-${signalColor}-900/20 relative group`}>
      <button onClick={onBookmark} className={`absolute top-3 right-3 md:top-4 md:right-4 p-1.5 rounded-lg transition-colors z-10 ${isBookmarked ? 'text-amber-400 bg-amber-400/10' : 'text-slate-600 hover:text-white hover:bg-slate-800'}`}>
        <Bookmark size={16} fill={isBookmarked ? "currentColor" : "none"} />
      </button>

      <div className="pr-8 md:pr-10 mb-4 md:mb-5">
        <h4 className="text-lg md:text-xl font-bold text-white truncate mb-1">{ticker.name}</h4>
        <div className="flex items-center gap-2">
          <p className="text-xs md:text-sm text-slate-500">{ticker.id}</p>
          {ticker.market && ticker.market !== 'Others' && (
            <span className="text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {ticker.market}
            </span>
          )}
        </div>
      </div>
      
      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/50 space-y-2">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <div className="text-slate-500 text-[10px] md:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1"><Zap size={11}/> 모멘텀 · 리스크 · 진입</div>
            <div className="flex items-center gap-2 md:gap-3">
              <span className="font-mono font-bold text-base md:text-lg text-indigo-400">{ticker.momentumScore != null ? ticker.momentumScore : '—'}<span className="text-[10px] text-slate-500">/100</span></span>
              <span className={`font-mono font-bold text-xs md:text-sm ${ticker.riskGrade === '높음' ? 'text-rose-400' : ticker.riskGrade === '낮음' ? 'text-emerald-400' : 'text-amber-400'}`}>리스크 {ticker.riskGrade || '—'}</span>
              <span className="font-mono text-[10px] md:text-xs text-slate-400">진입 {ticker.entryTiming || '—'}</span>
            </div>
          </div>
          <span className={`text-[10px] md:text-xs font-bold px-2 py-1 md:px-3 md:py-1.5 rounded-lg bg-${signalColor}-500/10 text-${signalColor}-400 border border-${signalColor}-500/20`}>
            {ticker.signal}
          </span>
        </div>
        {ticker.momentumScore != null && (
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden" title="모멘텀 점수(시장내 백분위)">
            <div className="h-full bg-indigo-500" style={{ width: `${ticker.momentumScore}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}