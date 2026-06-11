"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  Search, TrendingUp, TrendingDown, ChevronRight, BrainCircuit, 
  ArrowLeft, Loader2, Activity, Clock, AlertTriangle, 
  Target, BarChart2, Zap, Bookmark, Home, Check, Globe,
  Calendar, ChevronDown, History
} from 'lucide-react';

// ==========================================
// 📈 [순수 SVG 차트] 
// ==========================================
function PredictiveChart({ data }) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  const numericData = data.map(d => parseFloat(d) || 0);
  const minVal = Math.min(...numericData);
  const maxVal = Math.max(...numericData);

  const safeMin = minVal === maxVal ? minVal - 1 : minVal;
  const safeMax = minVal === maxVal ? maxVal + 1 : maxVal;
  const range = safeMax - safeMin;

  const points = numericData.map((val, i) => {
    const x = (i / (numericData.length - 1)) * 100;
    const y = 100 - ((val - safeMin) / range) * 100;
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const fillPath = `${linePath} L 100,100 L 0,100 Z`;
  const zeroY = 100 - ((0 - safeMin) / range) * 100;

  return (
    <div className="w-full h-full relative">
      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {safeMin < 0 && safeMax > 0 && (
          <line x1="0" y1={zeroY} x2="100" y2={zeroY} stroke="#334155" strokeWidth="0.5" strokeDasharray="2 2" />
        )}
        <path d={fillPath} fill="url(#chartGradient)" />
        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex justify-between items-end pb-1 px-1">
        <span className="text-[10px] font-mono text-slate-500">D+1</span>
        <span className="text-[10px] font-mono text-indigo-400 font-bold">
          {numericData[numericData.length - 1] > 0 ? '+' : ''}{numericData[numericData.length - 1].toFixed(2)}%
        </span>
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

  useEffect(() => {
    if (isStarted) fetchAvailableDates();
  }, [isStarted]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsSearchFocused(false);
      if (dateRef.current && !dateRef.current.contains(e.target)) setIsDateMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setSelectedTicker(null); 
    try {
      const targetPath = date ? `/aegis_data_${date}.json` : "/aegis_data.json";
      const res = await fetch(targetPath);
      const data = await res.json();
      setMasterUniverse(data);
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
          <h2 className="text-xl md:text-2xl font-bold text-white cursor-pointer shrink-0" onClick={() => {setSelectedTicker(null); setActiveTab('home');}}>
            Aegis <span className="text-indigo-500">Terminal</span>
          </h2>
          
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
            <button onClick={() => {setActiveTab('home'); setSelectedTicker(null);}} className={`flex-1 sm:flex-none px-4 py-2 rounded-md flex items-center justify-center gap-2 text-sm font-bold transition-all ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Home size={16}/> 마켓 홈
            </button>
            <button onClick={() => {setActiveTab('watchlist'); setSelectedTicker(null);}} className={`flex-1 sm:flex-none px-4 py-2 rounded-md flex items-center justify-center gap-2 text-sm font-bold transition-all ${activeTab === 'watchlist' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Bookmark size={16}/> 관심종목
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

      {/* 📱 모바일 여백(padding) 조정: p-4 */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar relative bg-slate-950">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <Loader2 size={48} className="animate-spin text-indigo-500 mb-6" />
            <p className="text-slate-400 animate-pulse font-bold tracking-widest uppercase text-sm md:text-base">Fetching {currentDate} Data...</p>
          </div>
        ) : selectedTicker ? (
          
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
              <button onClick={() => setSelectedTicker(null)} className="flex items-center justify-center gap-2 text-slate-400 hover:text-white bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 transition-colors w-full sm:w-auto">
                <ArrowLeft size={18} /> 대시보드로 돌아가기
              </button>
              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                  <Calendar size={14}/> {currentDate}
                </span>
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
                <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><Target size={14}/> Profit Hazard</p>
                <p className="text-xl md:text-3xl text-white font-mono font-bold">{selectedTicker.profitHazard}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-lg">
                <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><AlertTriangle size={14}/> Stop Hazard</p>
                <p className="text-xl md:text-3xl text-white font-mono font-bold">{selectedTicker.stopHazard}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-lg">
                <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><BarChart2 size={14}/> Expected Ret</p>
                <p className={`text-xl md:text-3xl font-mono font-bold ${String(selectedTicker.return).includes('-') ? 'text-rose-400' : 'text-emerald-400'}`}>{selectedTicker.return}</p>
              </div>
              <div className="bg-indigo-900/30 border border-indigo-500/40 p-4 md:p-6 rounded-2xl md:rounded-3xl relative overflow-hidden shadow-2xl col-span-2 lg:col-span-1">
                <p className="text-indigo-300 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><Zap size={14}/> Aegis Score</p>
                <p className="text-2xl md:text-3xl text-indigo-400 font-black">{selectedTicker.positiveScore} <span className="text-xs md:text-sm font-normal text-indigo-500/50">/ 100</span></p>
                <div className="absolute bottom-0 left-0 h-1 bg-indigo-500" style={{ width: `${selectedTicker.positiveScore}%` }}></div>
              </div>
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
                    </h5>
                    <div className="w-full h-32 md:h-48">
                      <PredictiveChart data={selectedTicker.expectedPath} />
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
      
      <div className="flex justify-between items-end bg-slate-950 p-3 rounded-xl border border-slate-800/50">
        <div className="space-y-1">
          <div className="text-slate-500 text-[10px] md:text-[11px] font-bold uppercase tracking-wider">AI Score & Ret</div>
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-white font-mono font-bold text-base md:text-lg">{ticker.positiveScore}</span>
            <span className={`font-mono font-bold text-xs md:text-sm ${String(ticker.return || '').includes('-') ? 'text-rose-400' : 'text-emerald-400'}`}>{ticker.return}</span>
          </div>
        </div>
        <span className={`text-[10px] md:text-xs font-bold px-2 py-1 md:px-3 md:py-1.5 rounded-lg bg-${signalColor}-500/10 text-${signalColor}-400 border border-${signalColor}-500/20`}>
          {ticker.signal}
        </span>
      </div>
    </div>
  );
}