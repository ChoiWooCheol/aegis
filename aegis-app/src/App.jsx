"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  Search, TrendingUp, TrendingDown, ChevronRight, BrainCircuit, 
  ArrowLeft, Loader2, Activity, Clock, AlertTriangle, 
  Target, BarChart2, Zap, Bookmark, Home, Check, Globe
} from 'lucide-react';

export default function App() {
  // 1. 핵심 상태 관리 (State)
  const [isStarted, setIsStarted] = useState(false);
  const [masterUniverse, setMasterUniverse] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 2. UX 및 필터 상태
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'watchlist'
  const [signalFilter, setSignalFilter] = useState('All'); // 'All' | 'Buy' | 'Wait' | 'Sell'
  const [marketFilter, setMarketFilter] = useState('All'); // 'All' | 'KOSPI 100' | 'NASDAQ 100' 등
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [watchlistIds, setWatchlistIds] = useState([]); 
  
  // 3. 검색 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef(null);

  // 백엔드 데이터 패칭
  useEffect(() => {
    if (isStarted) {
      fetchLiveUniverse();
    }
  }, [isStarted]);

  // 검색창 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchLiveUniverse = async () => {
    setIsLoading(true);
    try {
      // 💡 FastAPI 서버 주소 (실제 배포 시 해당 IP/도메인으로 변경)
      const response = await fetch("http://127.0.0.1:8000/api/universe");
      const data = await response.json();
      
      if (data.error) {
        alert(data.error);
      } else {
        setMasterUniverse(data);
      }
    } catch (error) {
      console.error("데이터 통신 실패:", error);
      alert("백엔드 서버와 연결할 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 통합 검색 로직 (종목명 및 코드 동시 검색)
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const results = masterUniverse.filter(t => 
      t.name.toLowerCase().includes(lowerQuery) || t.id.toLowerCase().includes(lowerQuery)
    ).slice(0, 8); // 최대 8개 노출
    
    setSearchResults(results);
  };

  // 관심종목(Watchlist) 추가/삭제 토글
  const toggleWatchlist = (e, tickerId) => {
    e.stopPropagation();
    if (watchlistIds.includes(tickerId)) {
      setWatchlistIds(watchlistIds.filter(id => id !== tickerId));
    } else {
      setWatchlistIds([...watchlistIds, tickerId]);
    }
  };

  // 🎯 화면에 보여줄 데이터 다중 필터링 (탭 -> 마켓 -> 시그널)
  const displayData = masterUniverse.filter(t => {
    if (activeTab === 'watchlist' && !watchlistIds.includes(t.id)) return false;
    if (marketFilter !== 'All' && t.market !== marketFilter) return false;
    if (signalFilter !== 'All' && t.signal !== signalFilter) return false;
    return true;
  });

  // ==========================================
  // [화면 1] 인트로(시작) 화면
  // ==========================================
  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4 text-center">
        <h1 className="text-7xl font-bold text-white mb-6">
          Aegis <span className="text-indigo-500">AI</span> V2
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
          거시 경제 자금 흐름과 딥러닝 위험도 분석을 결합하여<br/>최고의 퀀트 추론(Reasoning)을 제공합니다.
        </p>
        <button onClick={() => setIsStarted(true)} className="flex items-center gap-3 bg-white hover:bg-slate-200 text-slate-900 px-8 py-4 rounded-full text-lg font-bold transition-all shadow-[0_0_40px_rgba(99,102,241,0.3)]">
          <BrainCircuit size={24} className="text-indigo-600" />
          엔진 가동 <ChevronRight />
        </button>
      </div>
    );
  }

  // ==========================================
  // [화면 2] 메인 레이아웃 (헤더 + 콘텐츠)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col">
      
      {/* 🔴 상단 네비게이션 & 글로벌 검색바 */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex items-center justify-between shadow-sm">
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
        </div>

        {/* 통합 검색창 */}
        <div className="relative w-96" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="종목명 또는 코드 검색 (예: 하이브, 352820)" 
              className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-full focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
            />
          </div>
          
          {/* 검색 자동완성 드롭다운 */}
          {isSearchFocused && searchQuery && (
            <div className="absolute top-12 left-0 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
              {searchResults.length > 0 ? (
                <ul className="max-h-80 overflow-y-auto custom-scrollbar">
                  {searchResults.map(t => (
                    <li key={t.id} onClick={() => {setSelectedTicker(t); setIsSearchFocused(false); setSearchQuery("");}} className="px-4 py-3 hover:bg-slate-700 cursor-pointer flex items-center justify-between border-b border-slate-700/50 last:border-0 transition-colors">
                      <div>
                        <div className="font-bold text-white text-sm">{t.name}</div>
                        <div className="text-xs text-slate-400 flex gap-2 mt-0.5">
                          <span>{t.id}</span>
                          {t.market !== 'Others' && <span className="text-[10px] bg-slate-900 px-1 rounded">{t.market}</span>}
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${t.signal === 'Buy' ? 'text-emerald-400 bg-emerald-400/10' : t.signal === 'Sell' ? 'text-rose-400 bg-rose-400/10' : 'text-amber-400 bg-amber-400/10'}`}>
                        {t.signal}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-sm text-slate-400">검색 결과가 없습니다.</div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 🔴 메인 콘텐츠 영역 */}
      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar relative bg-slate-950">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[70vh]">
            <Loader2 size={48} className="animate-spin text-indigo-500 mb-6" />
            <p className="text-slate-400 animate-pulse text-lg">Aegis 딥러닝 서버에서 데이터를 동기화 중입니다...</p>
          </div>
        ) : selectedTicker ? (
          
          /* ==========================================
             [뷰 A] 종목 상세 뷰 (Detail View & Reasoning)
             ========================================== */
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => setSelectedTicker(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                <ArrowLeft size={18} /> 대시보드로 돌아가기
              </button>
              <button onClick={(e) => toggleWatchlist(e, selectedTicker.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all border ${watchlistIds.includes(selectedTicker.id) ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-white'}`}>
                {watchlistIds.includes(selectedTicker.id) ? <><Check size={18}/> 관심종목 추가됨</> : <><Bookmark size={18}/> 관심종목 추가</>}
              </button>
            </div>
            
            <div className="flex items-end justify-between mb-10 border-b border-slate-800 pb-8">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-5xl font-bold text-white">{selectedTicker.name}</h2>
                  <span className="text-2xl text-slate-500 font-light">{selectedTicker.id}</span>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-slate-400 text-lg">Aegis AI Quant Report</p>
                  {selectedTicker.market !== 'Others' && (
                    <span className="text-xs font-bold px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedTicker.market}
                    </span>
                  )}
                </div>
              </div>
              <div className={`text-3xl font-black px-8 py-3 rounded-2xl border shadow-lg ${
                selectedTicker.signal === 'Buy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                selectedTicker.signal === 'Sell' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {selectedTicker.signal} SIGNAL
              </div>
            </div>

            {/* AI 핵심 수치 패널 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                <div className="text-slate-500 text-sm font-bold mb-2 flex items-center gap-1"><Target size={16}/> Profit Hazard</div>
                <div className="text-3xl text-white font-mono">{selectedTicker.profitHazard}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                <div className="text-slate-500 text-sm font-bold mb-2 flex items-center gap-1"><AlertTriangle size={16}/> Stop Hazard</div>
                <div className="text-3xl text-white font-mono">{selectedTicker.stopHazard}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                <div className="text-slate-500 text-sm font-bold mb-2 flex items-center gap-1"><BarChart2 size={16}/> 20D Expected</div>
                <div className={`text-3xl font-mono font-bold ${selectedTicker.return.includes('-') ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {selectedTicker.return}
                </div>
              </div>
              <div className="bg-indigo-900/20 border border-indigo-500/30 p-5 rounded-2xl relative overflow-hidden shadow-sm">
                <div className="text-indigo-300 text-sm font-bold mb-2 flex items-center gap-1 z-10 relative"><Zap size={16}/> AI Score</div>
                <div className="text-3xl text-indigo-400 font-bold z-10 relative">{selectedTicker.positiveScore} <span className="text-lg text-indigo-500/50">/ 100</span></div>
                <div className="absolute bottom-0 left-0 h-1.5 bg-indigo-500 transition-all duration-1000" style={{ width: `${selectedTicker.positiveScore}%` }}></div>
              </div>
            </div>

            {/* AI 추론 과정 (Reasoning) */}
            <div className="space-y-4 mt-8">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl border-l-4 border-l-indigo-500 shadow-sm">
                <h4 className="text-indigo-400 font-bold mb-3 text-sm tracking-widest uppercase flex items-center gap-2">[STEP 1] 거시 경제 및 추세 분석</h4>
                <p className="text-slate-200 leading-relaxed text-lg">{selectedTicker.reason1}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
                <h4 className="text-slate-500 font-bold mb-3 text-sm tracking-widest uppercase flex items-center gap-2">[STEP 2] 딥러닝 위험도 분석</h4>
                <p className="text-slate-200 leading-relaxed text-lg">{selectedTicker.reason2}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
                <h4 className="text-slate-500 font-bold mb-3 text-sm tracking-widest uppercase flex items-center gap-2">[STEP 3] 최종 매매 근거</h4>
                <p className="text-slate-200 leading-relaxed text-lg font-semibold">{selectedTicker.reason3}</p>
              </div>
              
              {/* 브리핑 요약 */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950/50 border border-indigo-500/30 p-8 rounded-3xl mt-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Activity size={120} /></div>
                <h4 className="text-white font-bold mb-6 text-base tracking-widest uppercase flex items-center gap-2 relative z-10">
                  <BrainCircuit size={24} className="text-indigo-400"/> 투자자 종합 브리핑
                </h4>
                <ul className="space-y-4 relative z-10">
                  {selectedTicker.briefing.map((line, idx) => (
                    <li key={idx} className="flex gap-4 items-start">
                      <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold mt-0.5 border border-indigo-500/30">{idx + 1}</span>
                      <span className="text-slate-200 text-lg leading-relaxed">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
        ) : (
          /* ==========================================
             [뷰 B] 대시보드 리스트 (Home / Watchlist)
             ========================================== */
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 필터 컨트롤 (홈 탭에서만 노출) */}
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
            </div>

            {/* 종목 카드 그리드 */}
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

// ==========================================
// 재사용 가능한 티커 카드 컴포넌트
// ==========================================
function TickerCard({ ticker, onClick, isBookmarked, onBookmark }) {
  const signalColor = ticker.signal === 'Buy' ? 'emerald' : ticker.signal === 'Sell' ? 'rose' : 'amber';
  
  return (
    <div onClick={onClick} className={`bg-slate-900 border border-slate-800 hover:border-${signalColor}-500/50 p-5 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-${signalColor}-900/20 relative group`}>
      
      {/* 북마크 별 아이콘 */}
      <button onClick={onBookmark} className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors z-10 ${isBookmarked ? 'text-amber-400 bg-amber-400/10' : 'text-slate-600 hover:text-white hover:bg-slate-800'}`}>
        <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
      </button>

      <div className="pr-10 mb-5">
        <h4 className="text-xl font-bold text-white truncate mb-1">{ticker.name}</h4>
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-500">{ticker.id}</p>
          {ticker.market !== 'Others' && (
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
            <span className={`font-mono font-bold text-sm ${ticker.return.includes('-') ? 'text-rose-400' : 'text-emerald-400'}`}>{ticker.return}</span>
          </div>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg bg-${signalColor}-500/10 text-${signalColor}-400 border border-${signalColor}-500/20`}>
          {ticker.signal}
        </span>
      </div>
    </div>
  );
}