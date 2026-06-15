import React, {useState, useEffect, useRef, useCallback} from 'react';
import { Zap, Droplet, Heart, Flame, AlertCircle, Swords, Hash, Eye, EyeOff, Gamepad2, Trophy, Coins } from 'lucide-react';

// --- Type Definitions ---
type LogEntry = {
  id: string;
  message: string;
  isDamage: boolean;
};

type MatchHistory = {
  round: number;
  playerWins: number;
  oppWins: number;
};

type ModalState = 'none' | 'game' | 'match' | 'tournament';

type FlipData = {
  won: boolean;
  oldLife: number;
} | null;

export default function App() {
  // --- Game State ---
  const [turn, setTurn] = useState<number>(1);
  const [redMana, setRedMana] = useState<number>(0);
  const [stormIS, setStormIS] = useState<number>(0);
  const [stormOther, setStormOther] = useState<number>(0);
  const [life, setLife] = useState<number>(20);
  const [oppLife, setOppLife] = useState<number>(20);
  const [ralActive, setRalActive] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // --- Tournament State ---
  const [round, setRound] = useState<number>(1);
  const [playerWins, setPlayerWins] = useState<number>(0);
  const [oppWins, setOppWins] = useState<number>(0);
  const [history, setHistory] = useState<MatchHistory[]>([]);

  // --- UI & Animation State ---
  const [modalState, setModalState] = useState<ModalState>('none');
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(false);

  // Ral Animation State
  const [flipData, setFlipData] = useState<FlipData>(null);
  const [flipPhase, setFlipPhase] = useState<'flipping' | 'result' | 'life'>('flipping');
  const [flipColorToggle, setFlipColorToggle] = useState(false);

  const wakeLockRef = useRef<any>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // --- Screen Wake Lock Logic (Updated for Mobile Interactions) ---
  const requestWakeLock = useCallback(async () => {
    // Hvis vi allerede har den, ikke spør igjen
    if (isWakeLockActive || !('wakeLock' in navigator)) return;

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setIsWakeLockActive(true);

      // Lytt etter når systemet tar låsen fra oss (f.eks batterisparing eller bytte av app)
      wakeLockRef.current.addEventListener('release', () => {
        setIsWakeLockActive(false);
      });
      console.log('Wake Lock aktivert!');
    } catch (err: any) {
      console.error(`Wake Lock feilet: ${err.name}, ${err.message}`);
      setIsWakeLockActive(false);
    }
  }, [isWakeLockActive]);

  useEffect(() => {
    // Sett opp en global lytter for det aller første klikket på skjermen
    const handleFirstInteraction = () => {
      requestWakeLock();
      // Fjern lytterne med en gang vi har fått interaksjonen, så vi ikke spammer APIet
      document.removeEventListener('pointerdown', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('pointerdown', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    // Gjenopprett låsen hvis brukeren har vært ute av appen og kommer tilbake
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isWakeLockActive) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('pointerdown', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current !== null) {
        wakeLockRef.current.release();
      }
    };
  }, [requestWakeLock, isWakeLockActive]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- Ral Coin Flip Animation Effect ---
  useEffect(() => {
    if (!flipData) return;

    let lifeTimer: ReturnType<typeof setTimeout>;
    let closeTimer: ReturnType<typeof setTimeout>;

    // Fase 1: Kjapp blinking mellom farger
    const flipInterval = setInterval(() => {
      setFlipColorToggle(prev => !prev);
    }, 75);

    // Fase 2: Vis resultatet
    const resultTimer = setTimeout(() => {
      clearInterval(flipInterval);
      setFlipPhase('result');

      // Oppdater selve game-staten i bakgrunnen
      if (flipData.won) {
        addLog(`Cast Inst/Sorc: Ral flip VANT (Safe)`);
      } else {
        setLife(prev => prev - 1);
        addLog(`Cast Inst/Sorc: Ral flip TAPT (-1 Liv)`, true);
      }
    }, 600);

    // Fase 3 & 4: Oppdater liv (hvis tap) og lukk overlay
    if (flipData.won) {
      // Hvis vi vant, vis "VANT!" en liten stund og lukk fort for å bevare momentum
      closeTimer = setTimeout(() => setFlipData(null), 1200);
    } else {
      // Hvis vi tapte, vis "TAPT!", gå deretter til liv-oppdatering før vi lukker
      lifeTimer = setTimeout(() => setFlipPhase('life'), 1400);
      closeTimer = setTimeout(() => setFlipData(null), 3000);
    }

    return () => {
      clearInterval(flipInterval);
      clearTimeout(resultTimer);
      clearTimeout(lifeTimer);
      clearTimeout(closeTimer);
    };
  }, [flipData]);

  // --- Core Handlers ---
  const addLog = (message: string, isDamage: boolean = false) => {
    setLogs(prev => [...prev, { id: Math.random().toString(36).substring(2, 9), message, isDamage }].slice(-6));
  };

  const adjustMana = (amount: number) => setRedMana(prev => Math.max(0, prev + amount));
  const adjustLife = (amount: number) => setLife(prev => prev + amount);
  const adjustOppLife = (amount: number) => setOppLife(prev => prev + amount);

  const handleCastIS = () => {
    setStormIS(prev => prev + 1);

    if (ralActive) {
      // Start myntkast-sekvensen
      const won = Math.random() >= 0.5;
      setFlipPhase('flipping');
      setFlipData({ won, oldLife: life });
    } else {
      addLog(`Cast Inst/Sorc`);
    }
  };

  const handleCastOther = () => {
    setStormOther(prev => prev + 1);
    addLog(`Cast Other spell`);
  };

  const nextTurn = () => {
    setTurn(prev => prev + 1);
    addLog(`--- Tur ${turn + 1} ---`);
    setRedMana(0);
    setStormIS(0);
    setStormOther(0);
  };

  // --- Reset/Tournament Handlers ---
  const resetBoardState = () => {
    setTurn(1);
    setRedMana(0);
    setStormIS(0);
    setStormOther(0);
    setLife(20);
    setOppLife(20);
    setRalActive(false);
    setLogs([]);
  };

  const handleGameEnd = (winner: 'player' | 'opp' | 'draw') => {
    if (winner === 'player') setPlayerWins(prev => prev + 1);
    if (winner === 'opp') setOppWins(prev => prev + 1);
    resetBoardState();
    setModalState('none');
  };

  const handleMatchEnd = () => {
    setHistory(prev => [...prev, { round, playerWins, oppWins }]);
    setRound(prev => prev + 1);
    setPlayerWins(0);
    setOppWins(0);
    resetBoardState();
    setModalState('none');
  };

  const handleTournamentEnd = () => {
    setHistory([]);
    setRound(1);
    setPlayerWins(0);
    setOppWins(0);
    resetBoardState();
    setModalState('none');
  };

  const totalStorm = stormIS + stormOther;

  return (
      <div className="min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden pb-12 relative">
        <div className="max-w-md mx-auto p-3 space-y-4">

          {/* Compact Header & Tournament Controls */}
          <div className="bg-gray-900 p-3 rounded-2xl shadow-md border border-gray-800">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h1 className="text-lg font-bold text-red-500 tracking-tight flex items-center gap-1.5">
                  <Flame size={20} className="text-red-500" /> Ruby Storm
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-400">Storm: <span className="text-white font-bold">{totalStorm}</span></p>
                  <div title={isWakeLockActive ? "Skjerm våken" : "Wake lock inaktiv"} className="flex items-center">
                    {isWakeLockActive ? <Eye size={12} className="text-green-500/70" /> : <EyeOff size={12} className="text-red-500/70" />}
                  </div>
                </div>
              </div>

              <div className="text-right flex flex-col items-end">
                <div className="bg-gray-800/80 px-2 py-0.5 rounded-md border border-gray-700">
                  <span className="text-xs font-bold text-gray-300">Runde {round}</span>
                </div>
                <div className="text-base font-black mt-1 font-mono tracking-widest">
                  <span className="text-green-400">{playerWins}</span>
                  <span className="text-gray-500 mx-1">-</span>
                  <span className="text-purple-400">{oppWins}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 border-t border-gray-800 pt-3">
              <button
                  onClick={nextTurn}
                  className="col-span-1 flex justify-center items-center gap-1.5 bg-gray-800 hover:bg-gray-700 py-1.5 rounded-xl border border-gray-700 active:scale-95 transition-transform"
              >
                <Hash size={14} className="text-gray-400"/>
                <span className="font-bold text-gray-200 text-sm">Tur {turn}</span>
              </button>

              <button
                  onClick={() => setModalState('game')}
                  className="col-span-1 flex flex-col items-center justify-center bg-gray-800 hover:bg-gray-700 py-1 rounded-xl border border-gray-700 active:scale-95 transition-all"
              >
                <Gamepad2 size={16} className="text-blue-400 mb-0.5"/>
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">Game</span>
              </button>

              <button
                  onClick={() => setModalState('match')}
                  className="col-span-1 flex flex-col items-center justify-center bg-gray-800 hover:bg-gray-700 py-1 rounded-xl border border-gray-700 active:scale-95 transition-all"
              >
                <Swords size={16} className="text-yellow-500 mb-0.5"/>
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">Match</span>
              </button>

              <button
                  onClick={() => setModalState('tournament')}
                  className="col-span-1 flex flex-col items-center justify-center bg-red-900/20 hover:bg-red-900/40 border border-red-900/30 py-1 rounded-xl active:scale-95 transition-all"
              >
                <Trophy size={16} className="text-red-400 mb-0.5"/>
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Avslutt</span>
              </button>
            </div>
          </div>

          {/* Life Trackers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 p-3 rounded-2xl border border-gray-800 shadow-md relative">
              <h2 className="text-green-400 font-semibold flex items-center justify-center gap-1.5 text-xs mb-2">
                <Heart size={14} /> Ditt liv
              </h2>
              <div className="flex items-center justify-between">
                <ControlButton onClick={() => adjustLife(-1)} className="w-10 h-10 bg-gray-800 text-white border border-gray-700 rounded-lg text-lg">-</ControlButton>
                <span className={`text-3xl font-black transition-colors ${flipData && !flipData.won && flipPhase === 'life' ? 'text-red-500' : 'text-white'}`}>{life}</span>
                <ControlButton onClick={() => adjustLife(1)} className="w-10 h-10 bg-gray-800 text-white border border-gray-700 rounded-lg text-lg">+</ControlButton>
              </div>
            </div>

            <div className="bg-gray-900 p-3 rounded-2xl border border-gray-800 shadow-md">
              <h2 className="text-purple-400 font-semibold flex items-center justify-center gap-1.5 text-xs mb-2">
                <Swords size={14} /> Motstander
              </h2>
              <div className="flex items-center justify-between">
                <ControlButton onClick={() => adjustOppLife(-1)} className="w-10 h-10 bg-gray-800 text-white border border-gray-700 rounded-lg text-lg">-</ControlButton>
                <span className="text-3xl font-black">{oppLife}</span>
                <ControlButton onClick={() => adjustOppLife(1)} className="w-10 h-10 bg-gray-800 text-white border border-gray-700 rounded-lg text-lg">+</ControlButton>
              </div>
            </div>
          </div>

          {/* Red Mana */}
          <div className="bg-linear-to-br from-red-900/40 to-red-950 p-4 rounded-2xl border border-red-900/50 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-red-400 font-bold flex items-center gap-1.5 uppercase tracking-wider text-xs">
                <Droplet size={16} /> Rød Mana
              </h2>
              <div className="text-5xl font-black text-red-500 tracking-tighter">
                {redMana}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <ControlButton onClick={() => adjustMana(-1)} className="bg-gray-800 hover:bg-gray-700 text-white h-14 text-xl border border-gray-700">-1</ControlButton>
              <ControlButton onClick={() => adjustMana(1)} className="bg-red-600/20 hover:bg-red-600/40 text-red-400 h-14 text-lg border border-red-900/50">+1</ControlButton>
              <ControlButton onClick={() => adjustMana(2)} className="bg-red-600/40 hover:bg-red-600/60 text-red-200 h-14 text-lg border border-red-800/50">+2</ControlButton>
              <ControlButton onClick={() => adjustMana(3)} className="bg-red-500 hover:bg-red-400 text-white h-14 text-xl font-black shadow-lg shadow-red-900/20">+3</ControlButton>
            </div>
          </div>

          {/* Storm Trackers */}
          <div className="grid grid-cols-2 gap-3">
            <ControlButton onClick={handleCastIS} className="flex flex-col items-center justify-center bg-blue-900/30 border border-blue-800/50 py-5 hover:bg-blue-900/50 relative overflow-hidden">
              <span className="text-xs text-blue-300 mb-1 font-semibold uppercase tracking-wider z-10">Inst/Sorc</span>
              <span className="text-4xl font-black text-blue-400 z-10">{stormIS}</span>
              <div className="absolute inset-0 bg-linear-to-t from-blue-900/20 to-transparent z-0 pointer-events-none"></div>
            </ControlButton>

            <ControlButton onClick={handleCastOther} className="flex flex-col items-center justify-center bg-gray-800 border border-gray-700 py-5 hover:bg-gray-700">
              <span className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Other</span>
              <span className="text-4xl font-black text-white">{stormOther}</span>
            </ControlButton>
          </div>

          {/* Ral Toggle */}
          <div className="bg-gray-900 p-3 rounded-xl border border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Zap size={18} className={ralActive ? "text-blue-400" : "text-gray-500"} />
              <div>
                <h2 className="text-gray-200 font-semibold text-sm">Ral, Monsoon Mage</h2>
                <p className="text-[10px] text-gray-500">Auto-flip ved Inst/Sorc</p>
              </div>
            </div>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={ralActive} onChange={(e) => setRalActive(e.target.checked)} />
                <div className={`block w-12 h-7 rounded-full transition-colors ${ralActive ? 'bg-blue-600' : 'bg-gray-700'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform shadow-sm ${ralActive ? 'transform translate-x-5' : ''}`}></div>
              </div>
            </label>
          </div>

          {/* Action Log */}
          {logs.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 h-28 overflow-y-auto space-y-1.5 text-xs shadow-inner">
                {logs.map((log) => (
                    <div key={log.id} className={`${log.isDamage ? 'text-red-400 font-semibold' : 'text-gray-400'} flex items-center gap-2`}>
                      {log.message.includes('Tur') ? <Hash size={12} className="text-gray-500" /> : log.isDamage ? <AlertCircle size={12} /> : <Zap size={12} className="opacity-50" />}
                      {log.message}
                    </div>
                ))}
                <div ref={logsEndRef} />
              </div>
          )}

          {/* Match History */}
          {history.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-md mt-4">
                <h2 className="text-gray-400 font-bold uppercase text-xs mb-3 flex items-center gap-2">
                  <Trophy size={14} /> Turneringshistorikk
                </h2>
                <div className="space-y-2">
                  {history.map((h, i) => (
                      <div key={i} className="flex justify-between items-center bg-gray-800/50 p-2 rounded-lg text-sm">
                        <span className="text-gray-300 font-semibold">Runde {h.round}</span>
                        <div className="font-mono font-bold tracking-widest">
                          <span className={h.playerWins > h.oppWins ? "text-green-400" : "text-gray-500"}>{h.playerWins}</span>
                          <span className="text-gray-600 mx-1">-</span>
                          <span className={h.oppWins > h.playerWins ? "text-purple-400" : "text-gray-500"}>{h.oppWins}</span>
                        </div>
                      </div>
                  ))}
                </div>
              </div>
          )}

          {/* Modals */}
          {modalState !== 'none' && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-150 p-4">
                <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full">
                  {/* Game Modal */}
                  {modalState === 'game' && (
                      <>
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Gamepad2 size={20}/> Avslutt Game</h3>
                        <p className="text-gray-400 mb-4 text-sm">Hvem vant? Dette oppdaterer stillingen og nullstiller brettet.</p>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => handleGameEnd('player')} className="py-3 bg-green-900/30 text-green-400 border border-green-800/50 rounded-xl font-bold active:scale-95 transition-all">Jeg vant</button>
                          <button onClick={() => handleGameEnd('opp')} className="py-3 bg-purple-900/30 text-purple-400 border border-purple-800/50 rounded-xl font-bold active:scale-95 transition-all">Motstander vant</button>
                          <button onClick={() => handleGameEnd('draw')} className="py-3 bg-gray-800 text-gray-300 border border-gray-700 rounded-xl font-bold active:scale-95 transition-all">Uavgjort / Avbryt uten poeng</button>
                        </div>
                      </>
                  )}

                  {/* Match Modal */}
                  {modalState === 'match' && (
                      <>
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Swords size={20}/> Fullfør Match</h3>
                        <p className="text-gray-400 mb-6 text-sm">Matchen lagres som <span className="text-white font-bold">{playerWins}-{oppWins}</span> i historikken. Er du klar for neste runde?</p>
                        <div className="flex gap-3">
                          <button onClick={() => setModalState('none')} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors border border-gray-700">Avbryt</button>
                          <button onClick={handleMatchEnd} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors">Lagre Match</button>
                        </div>
                      </>
                  )}

                  {/* Tournament Modal */}
                  {modalState === 'tournament' && (
                      <>
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Trophy size={20}/> Avslutt Turnering</h3>
                        <p className="text-gray-400 mb-6 text-sm">Dette sletter all turneringshistorikk og nullstiller absolutt alt tilbake til Runde 1.</p>
                        <div className="flex gap-3">
                          <button onClick={() => setModalState('none')} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors border border-gray-700">Avbryt</button>
                          <button onClick={handleTournamentEnd} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-900/20">Avslutt alt</button>
                        </div>
                      </>
                  )}

                  {modalState === 'game' && (
                      <button onClick={() => setModalState('none')} className="w-full mt-4 py-2 text-gray-500 font-semibold hover:text-white transition-colors">Avbryt</button>
                  )}
                </div>
              </div>
          )}

          {/* Ral Flip Overlay Animation */}
          {flipData && (
              <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center z-100 transition-opacity duration-300">
                <Coins size={48} className={`mb-6 ${flipPhase === 'flipping' ? 'animate-bounce text-yellow-500' : 'opacity-20 text-gray-500'}`} />

                {flipPhase === 'flipping' && (
                    <div className={`text-5xl md:text-6xl font-black uppercase tracking-widest transition-colors duration-75 ${flipColorToggle ? 'text-green-500' : 'text-red-500'}`}>
                      MYNTKAST...
                    </div>
                )}

                {flipPhase === 'result' && (
                    <div className={`text-7xl md:text-8xl font-black uppercase tracking-widest scale-125 transition-transform duration-300 ${flipData.won ? 'text-green-500' : 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]'}`}>
                      {flipData.won ? 'TRYGG!' : 'SKADE!'}
                    </div>
                )}

                {flipPhase === 'life' && !flipData.won && (
                    <div className="flex flex-col items-center justify-center mt-4">
                      <div className="text-red-500 text-2xl font-bold mb-6 uppercase tracking-widest opacity-80">Ral Damage</div>
                      <div className="flex items-center gap-8 text-8xl font-black">
                        {/* Gammel life total med rød strek over */}
                        <div className="relative text-gray-500 scale-90">
                          {flipData.oldLife}
                          <div className="absolute top-1/2 left-[-10%] right-[-10%] h-3 bg-red-600 -rotate-12 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>
                        </div>
                        {/* Ny life total */}
                        <div className="text-red-500 animate-pulse scale-110">
                          {flipData.oldLife - 1}
                        </div>
                      </div>
                    </div>
                )}
              </div>
          )}

        </div>
      </div>
  );
}

// --- Reusable Button Component ---
const ControlButton = ({ onClick, children, className = "" }: { onClick: () => void, children: React.ReactNode, className?: string }) => (
    <button onClick={onClick} className={`active:scale-95 transition-transform flex items-center justify-center font-bold rounded-xl select-none ${className}`}>
      {children}
    </button>
);