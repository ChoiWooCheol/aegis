"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  Search, TrendingUp, TrendingDown, ChevronRight, BrainCircuit, 
  ArrowLeft, Loader2, Activity, Clock, AlertTriangle, 
  Target, BarChart2, Zap, Bookmark, Home, Check, Globe,
  Calendar, ChevronDown, History
} from 'lucide-react';

// ==========================================
// 📈 [순수 SVG 차트] 절대 멈추지 않는 초경량 예측 곡선
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4 text-center">
        <h1 className="text-7xl font-bold text-white mb-6 animate-in zoom-in duration-700">
          Aegis <span className="text-indigo-500">AI</span> V2
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
          거시 경제 자금 흐름과 딥러닝 위험도 분석을 결합하여<br/>최고의 퀀트 추론(Reasoning)을 제공합니다.
        </p>
        <button onClick={() => setIsStarted(true)} className="flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-full text-lg font-bold shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:scale-105 transition-all">
          <BrainCircuit size={24} className="text-indigo-600" />
          엔진 가동 <ChevronRight />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col">
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-8">
          <h2 className="text-2xl font-bold text-white cursor-pointer" onClick={() => {setSelectedTicker(null); setActiveTab('home');}}>
            Aegis <span className="text-indigo-500">Terminal</span>
          </h2>
          
          <nav className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button onClick={() => {setActiveTab('home'); setSelectedTicker(null);}} className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-bold transition-all ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Home size={16}/> 마켓 홈
            </button>
            <button onClick={() => {setActiveTab('watchlist'); setSelectedTicker(null);}} className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-bold transition-all ${activeTab === 'watchlist' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Bookmark size={16}/> 관심종목 ({watchlistIds.length})
            </button>
          </nav>

          <div className="relative" ref={dateRef}>
            <button 
              onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
              className="flex items-center gap-3 bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl hover:border-indigo-500 transition-all group"
            >
              <Calendar size={18} className="text-indigo-400" />
              <div className="text-left">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Reporting Date</p>
                <p className="text-sm font-bold text-white font-mono">{currentDate || "Loading..."}</p>
              </div>
              <ChevronDown size={16} className={`text-slate-500 transition-transform ${isDateMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDateMenuOpen && (
              <div className="absolute top-14 left-0 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
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

        <div className="relative w-80" ref={searchRef}>
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
      </header>

      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar relative bg-slate-950">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <Loader2 size={48} className="animate-spin text-indigo-500 mb-6" />
            <p className="text-slate-400 animate-pulse font-bold tracking-widest uppercase">Fetching {currentDate} Data...</p>
          </div>
        ) : selectedTicker ? (
          
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => setSelectedTicker(null)} className="flex items-center gap-2 text-slate-400 hover:text-white bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 transition-colors">
                <ArrowLeft size={18} /> 대시보드로 돌아가기
              </button>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                  <Calendar size={14}/> {currentDate} Report
                </span>
                <button onClick={(e) => toggleWatchlist(e, selectedTicker.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all border ${watchlistIds.includes(selectedTicker.id) ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}>
                  {watchlistIds.includes(selectedTicker.id) ? <Check size={18}/> : <Bookmark size={18}/>}
                </button>
              </div>
            </div>
            
            <div className="flex items-end justify-between mb-10 border-b border-slate-800 pb-8">
              <div>
                <h2 className="text-6xl font-bold text-white mb-2">{selectedTicker.name} <span className="text-3xl text-slate-600 font-light ml-4">{selectedTicker.id}</span></h2>
                <div className="flex items-center gap-3">
                  <span className="text-indigo-400 font-bold tracking-widest uppercase text-sm">Aegis AI Quant Intelligence</span>
                  <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                  <span className="text-slate-500 text-sm font-mono">{selectedTicker.market}</span>
                </div>
              </div>
              <div className={`text-4xl font-black px-10 py-4 rounded-3xl border shadow-2xl ${
                selectedTicker.signal === 'Buy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                selectedTicker.signal === 'Sell' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {selectedTicker.signal || 'WAIT'}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><Target size={14}/> Profit Hazard</p>
                <p className="text-3xl text-white font-mono font-bold">{selectedTicker.profitHazard}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><AlertTriangle size={14}/> Stop Hazard</p>
                <p className="text-3xl text-white font-mono font-bold">{selectedTicker.stopHazard}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><BarChart2 size={14}/> Expected Ret</p>
                <p className={`text-3xl font-mono font-bold ${String(selectedTicker.return).includes('-') ? 'text-rose-400' : 'text-emerald-400'}`}>{selectedTicker.return}</p>
              </div>
              <div className="bg-indigo-900/30 border border-indigo-500/40 p-6 rounded-3xl relative overflow-hidden shadow-2xl">
                <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><Zap size={14}/> Aegis Score</p>
                <p className="text-3xl text-indigo-400 font-black">{selectedTicker.positiveScore} <span className="text-sm font-normal text-indigo-500/50">/ 100</span></p>
                <div className="absolute bottom-0 left-0 h-1 bg-indigo-500" style={{ width: `${selectedTicker.positiveScore}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl border-l-4 border-l-indigo-600">
                <h4 className="text-indigo-400 font-bold mb-4 text-xs tracking-widest uppercase flex items-center gap-2">01. Macro & Momentum Analysis</h4>
                <p className="text-slate-200 leading-relaxed text-xl font-medium">{selectedTicker.reason1}</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl">
                <h4 className="text-slate-500 font-bold mb-4 text-xs tracking-widest uppercase">02. Deep Learning Risk Profile</h4>
                <p className="text-slate-300 leading-relaxed text-lg">{selectedTicker.reason2}</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl">
                <h4 className="text-slate-500 font-bold mb-4 text-xs tracking-widest uppercase">03. Final Strategic Conclusion</h4>
                <p className="text-white leading-relaxed text-xl font-bold">{selectedTicker.reason3}</p>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-indigo-950/50 border border-indigo-500/30 p-10 rounded-[40px] mt-6 relative overflow-hidden shadow-2xl">
                <Activity size={120} className="absolute -top-10 -right-10 text-indigo-500/10" />
                <h4 className="text-white font-bold mb-8 text-lg flex items-center gap-3 relative z-10">
                  <BrainCircuit size={24} className="text-indigo-400"/> AI Investment Executive Briefing
                </h4>
                <ul className="space-y-6 relative z-10">
                  {Array.isArray(selectedTicker.briefing) && selectedTicker.briefing.map((line, idx) => (
                    <li key={idx} className="flex gap-6 items-start group">
                      <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-2xl bg-indigo-500/20 text-indigo-400 text-sm font-bold mt-0.5 border border-indigo-500/30 group-hover:bg-indigo-500 group-hover:text-white transition-colors">{idx + 1}</span>
                      <span className="text-slate-200 text-lg leading-relaxed">{line}</span>
                    </li>
                  ))}
                </ul>

                {Array.isArray(selectedTicker.expectedPath) && selectedTicker.expectedPath.length > 0 && (
                  <div className="mt-12 pt-10 border-t border-slate-800/50">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <TrendingUp size={16} className="text-emerald-500" /> 20-Day Estimated Return Trajectory
                    </h5>
                    <div className="w-full h-48">
                      <PredictiveChart data={selectedTicker.expectedPath} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
        ) : (
          /* ==========================================
             [뷰 B] 오리지널 대시보드 UI (필터 + 카드 완벽 복구!)
             ========================================== */
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 🎯 KOSPI, NASDAQ 마켓 필터 완벽 복구 영역 */}
            {activeTab === 'home' && (
              <div className="mb-10 space-y-6 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
                
                {/* 마켓 필터 */}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">시장 선택 (Market)</h3>
                  <div className="flex flex-wrap gap-2">
                    {['All', 'KOSPI 100', 'KOSPI 200', 'NASDAQ 100', 'NASDAQ 500'].map(market => (
                      <button 
                        key={market} 
                        onClick={() => setMarketFilter(market)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 border ${
                          marketFilter === market 
                            ? 'bg-slate-700 text-white border-slate-600 shadow-inner' 
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {market === 'All' ? <Globe size={16} /> : null}
                        {market === 'All' ? '전체 시장' : market}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 시그널 필터 */}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">AI 시그널 (Signal)</h3>
                  <div className="flex flex-wrap gap-3">
                    {['All', 'Buy', 'Wait', 'Sell'].map(sig => (
                      <button 
                        key={sig} onClick={() => setSignalFilter(sig)}
                        className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 border ${
                          signalFilter === sig 
                            ? (sig === 'Buy' ? 'bg-emerald-600 text-white border-emerald-500' : sig === 'Sell' ? 'bg-rose-600 text-white border-rose-500' : sig === 'Wait' ? 'bg-amber-600 text-white border-amber-500' : 'bg-indigo-600 text-white border-indigo-500')
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {sig === 'Buy' && <TrendingUp size={16} />}
                        {sig === 'Sell' && <TrendingDown size={16} />}
                        {sig === 'Wait' && <Clock size={16} />}
                        {sig === 'All' && <Activity size={16} />}
                        {sig === 'All' ? '전체 보기' : `${sig} 시그널`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {activeTab === 'watchlist' ? <Bookmark className="text-indigo-400"/> : <Activity className="text-indigo-400"/>}
                {activeTab === 'watchlist' ? '내 관심종목' : '시장 분석 결과'} 
                <span className="text-sm font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded-md ml-2">{displayData.length}건</span>
              </h3>
              <span className="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-500 rounded-full text-xs font-bold uppercase tracking-widest">
                Date: {currentDate}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-20">
              {displayData.length > 0 ? displayData.map(ticker => (
                <TickerCard 
                  key={ticker.id} 
                  ticker={ticker} 
                  onClick={() => setSelectedTicker(ticker)}
                  isBookmarked={watchlistIds.includes(ticker.id)} 
                  onBookmark={(e) => toggleWatchlist(e, ticker.id)}
                />
              )) : (
                <div className="col-span-full py-32 flex flex-col items-center justify-center bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                  <Search size={48} className="text-slate-600 mb-4" />
                  <p className="text-slate-400 text-lg">
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

// 🎯 예쁜 오리지널 종목 카드 복구 완료
function TickerCard({ ticker, onClick, isBookmarked, onBookmark }) {
  const signalColor = ticker.signal === 'Buy' ? 'emerald' : ticker.signal === 'Sell' ? 'rose' : 'amber';
  
  return (
    <div onClick={onClick} className={`bg-slate-900 border border-slate-800 hover:border-${signalColor}-500/50 p-5 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-${signalColor}-900/20 relative group`}>
      <button onClick={onBookmark} className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors z-10 ${isBookmarked ? 'text-amber-400 bg-amber-400/10' : 'text-slate-600 hover:text-white hover:bg-slate-800'}`}>
        <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
      </button>

      <div className="pr-10 mb-5">
        <h4 className="text-xl font-bold text-white truncate mb-1">{ticker.name}</h4>
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-500">{ticker.id}</p>
          {ticker.market && ticker.market !== 'Others' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {ticker.market}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex justify-between items-end bg-slate-950 p-3 rounded-xl border border-slate-800/50">
        <div className="space-y-1">
          <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">AI Score & Ret</div>
          <div className="flex items-center gap-3">
            <span className="text-white font-mono font-bold text-lg">{ticker.positiveScore}</span>
            <span className={`font-mono font-bold text-sm ${String(ticker.return || '').includes('-') ? 'text-rose-400' : 'text-emerald-400'}`}>{ticker.return}</span>
          </div>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg bg-${signalColor}-500/10 text-${signalColor}-400 border border-${signalColor}-500/20`}>
          {ticker.signal}
        </span>
      </div>
    </div>
  );
}