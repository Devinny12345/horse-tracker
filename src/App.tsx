import { useState, useEffect, useRef } from 'react';
import { Play, Square, Settings, Flag, Trash2, Edit2, Activity } from 'lucide-react';

const L_STRAIGHT = 400;
const L_CURVE = Math.PI * 100;
const L_TOTAL = L_STRAIGHT * 2 + L_CURVE * 2;
const TOTAL_OVAL_FURLONGS = 6.0;

function getTrackData(percent: number) {
  let p = ((percent % 100) + 100) % 100;
  let dist = (p / 100) * L_TOTAL;

  if (dist <= L_STRAIGHT) {
    return { x: 200 + dist, y: 300, nx: 0, ny: 1 };
  }
  dist -= L_STRAIGHT;
  if (dist <= L_CURVE) {
    let angle = (Math.PI / 2) - (dist / L_CURVE) * Math.PI;
    return { x: 600 + 100 * Math.cos(angle), y: 200 + 100 * Math.sin(angle), nx: Math.cos(angle), ny: Math.sin(angle) };
  }
  dist -= L_CURVE;
  if (dist <= L_STRAIGHT) {
    return { x: 600 - dist, y: 100, nx: 0, ny: -1 };
  }
  dist -= L_STRAIGHT;
  let angle = -Math.PI / 2 - (dist / L_CURVE) * Math.PI;
  return { x: 200 + 100 * Math.cos(angle), y: 200 + 100 * Math.sin(angle), nx: Math.cos(angle), ny: Math.sin(angle) };
}

export default function App() {
  const [startPos, setStartPos] = useState(0);
  const [raceDistanceFurlongs, setRaceDistanceFurlongs] = useState(6);
  const [markers, setMarkers] = useState([
    { id: 1, label: '1 F', pos: 1 },
    { id: 2, label: '2 F', pos: 2 },
    { id: 3, label: '3 F', pos: 3 },
    { id: 4, label: '4 F', pos: 4 },
    { id: 5, label: '5 F', pos: 5 }
  ]);

  const [horses, setHorses] = useState([
    { id: 1, name: 'Rider 1', color: '#fbbf24', speedMod: 0 },
    { id: 2, name: 'Rider 2', color: '#ef4444', speedMod: 0 },
    { id: 3, name: 'Rider 3', color: '#3b82f6', speedMod: 0 },
    { id: 4, name: 'Rider 4', color: '#10b981', speedMod: 0 }
  ]);

  const [raceProgress, setRaceProgress] = useState(0);
  const [horseProgresses, setHorseProgresses] = useState<Record<number, number>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(5);
  const [isChroma, setIsChroma] = useState(false);
  const [activeTab, setActiveTab] = useState('track');

  const raceDistancePct = (raceDistanceFurlongs / TOTAL_OVAL_FURLONGS) * 100;
  const isOverlay = raceDistanceFurlongs > 6;
  const overlayPercent = isOverlay ? Math.round((raceDistanceFurlongs / 6) * 100) : 0;

  const engineRef = useRef({
    progress: 0,
    speed: 5,
    isPlaying: false,
    horses: [] as typeof horses,
    horseProgresses: {} as Record<number, number>
  });

  useEffect(() => { engineRef.current.speed = speedMultiplier; }, [speedMultiplier]);
  useEffect(() => { engineRef.current.isPlaying = isPlaying; }, [isPlaying]);
  useEffect(() => { engineRef.current.horses = horses; }, [horses]);

  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const tick = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      if (engineRef.current.isPlaying) {
        let newProg = engineRef.current.progress + (engineRef.current.speed * delta);
        if (newProg >= 100) {
          newProg = 100;
          engineRef.current.isPlaying = false;
          setIsPlaying(false);
        }

        const newHP = { ...engineRef.current.horseProgresses };
        engineRef.current.horses.forEach(h => {
          let current = newHP[h.id] !== undefined ? newHP[h.id] : engineRef.current.progress;
          let hSpeed = engineRef.current.speed * (1 + (h.speedMod / 100));
          newHP[h.id] = current + (hSpeed * delta);
        });

        engineRef.current.progress = newProg;
        engineRef.current.horseProgresses = newHP;

        setRaceProgress(newProg);
        setHorseProgresses(newHP);
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handleMasterScrub = (val: number) => {
    const delta = val - raceProgress;
    setRaceProgress(val);
    engineRef.current.progress = val;

    const newHP: Record<number, number> = {};
    horses.forEach(h => {
      let current = horseProgresses[h.id] !== undefined ? horseProgresses[h.id] : raceProgress;
      newHP[h.id] = current + delta;
    });

    engineRef.current.horseProgresses = newHP;
    setHorseProgresses(newHP);
  };

  const handleReset = () => {
    setIsPlaying(false);
    engineRef.current.isPlaying = false;
    setRaceProgress(0);
    engineRef.current.progress = 0;
    setHorseProgresses({});
    engineRef.current.horseProgresses = {};
  };

  const addHorse = () => {
    if (horses.length >= 10) return;
    const newId = Math.max(...horses.map(h => h.id), 0) + 1;
    const colors = ['#f472b6', '#a78bfa', '#34d399', '#fb923c', '#f87171', '#60a5fa', '#facc15', '#a3e635'];
    setHorses([...horses, { id: newId, name: `Rider ${newId}`, color: colors[newId % colors.length], speedMod: 0 }]);
  };

  const updateHorse = (id: number, field: string, value: any) => {
    setHorses(horses.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const removeHorse = (id: number) => {
    setHorses(horses.filter(h => h.id !== id));
  };

  const updateMarker = (id: number, field: string, value: any) => {
    setMarkers(markers.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeMarker = (id: number) => {
    setMarkers(markers.filter(m => m.id !== id));
  };

  const getMarkerTrackPct = (furlongPos: number) => {
    return (furlongPos / TOTAL_OVAL_FURLONGS) * 100;
  };

  const highlightLength = (raceDistancePct / 100) * L_TOTAL;
  const startOffset = (startPos / 100) * L_TOTAL;

  const progressFurlongs = (raceProgress / 100) * raceDistanceFurlongs;

  let raceStatus = "AWAITING POST";
  if (raceProgress > 0 && raceProgress < 100) {
    raceStatus = "LIVE RACING";
  } else if (raceProgress >= 100) {
    raceStatus = "RACE OFFICIAL";
  }

  const TabButton = ({ id, icon: Icon, label }: { id: string; icon: any; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 flex items-center justify-center space-x-2 px-2 py-3 font-semibold text-sm transition-colors border-b-2 ${
        activeTab === id ? 'border-amber-400 text-amber-400 bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-white'
      }`}
    >
      <Icon size={16} /> <span>{label}</span>
    </button>
  );

  const getOverlayColor = () => {
    if (!isOverlay) return 'bg-slate-700 text-slate-300';
    if (overlayPercent >= 150) return 'bg-orange-500 text-black';
    if (overlayPercent >= 125) return 'bg-orange-600 text-white';
    return 'bg-orange-700 text-white';
  };

  return (
    <div className={`min-h-screen flex flex-col xl:flex-row ${isChroma ? 'bg-[#00ff00]' : 'bg-slate-950'} text-slate-200 font-sans`}>
      {/* LEFT: Broadcast Output */}
      <div className={`xl:w-2/3 p-6 flex flex-col items-center justify-center ${isChroma ? '' : 'bg-slate-900'}`}>
        <div className="w-full max-w-5xl shadow-2xl rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 relative">
          <div className="bg-slate-800/90 backdrop-blur px-6 py-4 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
              <h1 className="text-white font-bold tracking-wider text-xl uppercase">
                Live<span className="text-slate-400 font-normal mx-2">|</span>Broadcast
              </h1>
            </div>
            <div className="text-slate-300 font-mono text-sm tracking-widest bg-slate-900 px-4 py-1 rounded-full border border-slate-700">
              {progressFurlongs.toFixed(2)} / {raceDistanceFurlongs.toFixed(2)} F
            </div>
          </div>

          <div className="p-6 relative flex justify-center items-center bg-slate-900">
            <svg viewBox="0 0 800 400" className="w-full h-auto drop-shadow-2xl">
              <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z" fill="none" stroke="#0f172a" strokeWidth="26" />
              <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z" fill="none" stroke="#1e293b" strokeWidth="22" />
              <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z" fill="none" stroke="#475569" strokeWidth="22" strokeDasharray={`${highlightLength} ${L_TOTAL * 2}`} strokeDashoffset={-startOffset} />
              <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z" fill="none" stroke="#475569" strokeWidth="22" strokeDasharray={`${highlightLength} ${L_TOTAL * 2}`} strokeDashoffset={-startOffset + L_TOTAL} />
              <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z" fill="none" stroke="#1e293b" strokeWidth="2" strokeDasharray="10 10" />

              {markers.filter(m => m.pos <= raceDistanceFurlongs).map(marker => {
                const trackPct = getMarkerTrackPct(marker.pos);
                const mData = getTrackData(trackPct);
                return (
                  <g key={`marker-${marker.id}`}>
                    <line x1={mData.x - mData.nx * 15} y1={mData.y - mData.ny * 15} x2={mData.x + mData.nx * 15} y2={mData.y + mData.ny * 15} stroke="#94a3b8" strokeWidth="4" />
                    <text x={mData.x + mData.nx * 35} y={mData.y + mData.ny * 35 + 4} fill="#94a3b8" fontSize="12" fontWeight="bold" textAnchor="middle" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{marker.label}</text>
                  </g>
                );
              })}

              {(() => {
                const finishTrackPct = getMarkerTrackPct(raceDistanceFurlongs);
                const fTrackPct = (startPos + finishTrackPct) % 100;
                const fData = getTrackData(fTrackPct);
                return (
                  <g>
                    <line x1={fData.x - fData.nx * 18} y1={fData.y - fData.ny * 18} x2={fData.x + fData.nx * 18} y2={fData.y + fData.ny * 18} stroke="#ef4444" strokeWidth="8" />
                    <text x={fData.x + fData.nx * 40} y={fData.y + fData.ny * 40 + 5} fill="#ef4444" fontSize="16" fontWeight="bold" textAnchor="middle" letterSpacing="1" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>FINISH</text>
                  </g>
                );
              })()}

              {(() => {
                const sData = getTrackData(startPos);
                return (
                  <g>
                    <line x1={sData.x - sData.nx * 16} y1={sData.y - sData.ny * 16} x2={sData.x + sData.nx * 16} y2={sData.y + sData.ny * 16} stroke="#10b981" strokeWidth="6" />
                    <text x={sData.x + sData.nx * 40} y={sData.y + sData.ny * 40 + 5} fill="#10b981" fontSize="14" fontWeight="bold" textAnchor="middle" letterSpacing="1" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>START</text>
                  </g>
                );
              })()}

              {horses.map((horse, idx) => {
                let rawProgress = horseProgresses[horse.id] !== undefined ? horseProgresses[horse.id] : raceProgress;
                const boundedProgress = Math.max(0, rawProgress);
                const absoluteTrackPct = (startPos + (raceDistancePct * (boundedProgress / 100))) % 100;
                const hData = getTrackData(absoluteTrackPct);
                const laneOffset = (idx - (horses.length - 1) / 2) * 5;
                const finalX = hData.x + hData.nx * laneOffset;
                const finalY = hData.y + hData.ny * laneOffset;

                return (
                  <g key={horse.id}>
                    <circle cx={finalX} cy={finalY} r="7" fill={horse.color} stroke="#fff" strokeWidth="2" style={{ filter: `drop-shadow(0 0 6px ${horse.color}88)` }} />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="bg-slate-950 px-6 py-3 flex justify-between items-center border-t border-slate-700">
            <div className="flex items-center space-x-6">
              <span className="text-amber-400 font-mono text-sm font-bold">PETER AUGUST DIRT</span>
            </div>
            <span className={`font-bold text-sm ${raceProgress >= 100 ? 'text-green-400' : 'text-white'}`}>{raceStatus}</span>
          </div>
        </div>

        <div className="mt-6 text-slate-500 text-sm flex items-center">
          <Activity size={16} className="mr-2" />
          <span>Capture window in OBS</span>
        </div>
      </div>

      {/* RIGHT: Producer Control Panel */}
      <div className="xl:w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-screen overflow-hidden">
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center"><Settings size={18} className="mr-2 text-amber-400" /> Controls</h2>
          <button
            onClick={() => setIsChroma(!isChroma)}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${isChroma ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-green-500/20 text-green-400 border border-green-500/50'}`}
          >
            {isChroma ? 'Chroma OFF' : 'Chroma ON'}
          </button>
        </div>

        <div className="flex bg-slate-800 border-b border-slate-700">
          <TabButton id="track" icon={Flag} label="Track" />
          <TabButton id="horses" icon={Edit2} label="Roster" />
          <TabButton id="control" icon={Activity} label="Race" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700">
          {activeTab === 'track' && (
            <div className="space-y-4">
              {/* Race Distance - Large Buttons */}
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">Race Distance</h3>
                
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map(furlongs => (
                    <button
                      key={furlongs}
                      onClick={() => setRaceDistanceFurlongs(furlongs)}
                      className={`py-3 rounded-lg font-bold text-sm transition-all ${
                        raceDistanceFurlongs === furlongs
                          ? 'bg-amber-500 text-black'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {furlongs}F
                    </button>
                  ))}
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[6, 7, 8].map(furlongs => (
                    <button
                      key={furlongs}
                      onClick={() => setRaceDistanceFurlongs(furlongs)}
                      className={`py-2 rounded-lg font-bold text-xs transition-all ${getOverlayColor()} ${
                        raceDistanceFurlongs === furlongs ? 'ring-2 ring-white' : ''
                      }`}
                    >
                      {furlongs}F
                    </button>
                  ))}
                </div>

                {/* Long Slider for Fine Control */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={isOverlay ? 'text-orange-400' : 'text-slate-400'}>
                      {raceDistanceFurlongs} F {isOverlay && `(${overlayPercent}%)`}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="12" 
                    step="0.5" 
                    value={raceDistanceFurlongs} 
                    onChange={(e) => setRaceDistanceFurlongs(parseFloat(e.target.value))} 
                    className="w-full h-4 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>

              {/* Start Line */}
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Start Line</h3>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1" 
                  value={startPos} 
                  onChange={(e) => setStartPos(parseInt(e.target.value))} 
                  className="w-full h-4 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>0%</span>
                  <span className="text-emerald-400 font-mono">{startPos}%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Furlong Markers - Longer Bars */}
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Furlong Markers</h3>
                <div className="space-y-3">
                  {markers.filter(m => m.pos <= raceDistanceFurlongs).map(marker => (
                    <div key={marker.id} className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <div className="flex items-center space-x-2 mb-2">
                        <button 
                          onClick={() => removeMarker(marker.id)} 
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                        <input
                          type="text"
                          value={marker.label}
                          onChange={(e) => updateMarker(marker.id, 'label', e.target.value)}
                          className="bg-transparent border-none text-sm text-white font-bold focus:outline-none w-16"
                        />
                        <span className="text-amber-400 font-mono text-sm font-bold ml-auto">{marker.pos}F</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max={raceDistanceFurlongs}
                        step="0.1"
                        value={marker.pos}
                        onChange={(e) => updateMarker(marker.id, 'pos', parseFloat(e.target.value))}
                        className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-400"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'horses' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase">Roster ({horses.length}/10)</h3>
                <button onClick={addHorse} disabled={horses.length >= 10} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-2 py-1 rounded text-xs font-bold">
                  + ADD
                </button>
              </div>

              <div className="space-y-2">
                {horses.map(horse => (
                  <div key={horse.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-center space-x-3">
                    <input type="color" value={horse.color} onChange={(e) => updateHorse(horse.id, 'color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-2 border-slate-600 p-0.5 bg-transparent" />
                    <input
                      type="text"
                      value={horse.name}
                      onChange={(e) => updateHorse(horse.id, 'name', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                    <button onClick={() => removeHorse(horse.id)} className="text-slate-500 hover:text-red-400 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'control' && (
            <div className="space-y-4">
              {/* Progress Bar - Orange for overlay */}
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">Progress</h3>
                
                <div className={`relative h-12 rounded-lg overflow-hidden mb-3 border-2 ${
                  isOverlay ? 'border-orange-500' : 'border-red-800'
                }`}>
                  <div 
                    className={`absolute top-0 left-0 h-full transition-all duration-100 ${
                      isOverlay 
                        ? 'bg-gradient-to-r from-orange-600 to-orange-400' 
                        : 'bg-gradient-to-r from-green-600 to-green-400'
                    }`}
                    style={{ width: `${raceProgress}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold drop-shadow-lg">
                      {progressFurlongs.toFixed(2)} / {raceDistanceFurlongs.toFixed(2)} F
                    </span>
                  </div>
                </div>

                {/* Play Controls */}
                <div className="flex space-x-2 mb-3">
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)} 
                    className={`flex-1 flex justify-center items-center py-3 rounded-lg font-bold transition-all ${
                      isPlaying 
                        ? 'bg-red-600 hover:bg-red-500 text-white' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isPlaying ? <Square size={18} className="mr-1" /> : <Play size={18} className="mr-1" />}
                    {isPlaying ? 'PAUSE' : 'START'}
                  </button>
                  <button onClick={handleReset} className="px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold">RESET</button>
                </div>

                {/* Scrubber */}
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="0.1" 
                  value={raceProgress} 
                  onChange={(e) => { setIsPlaying(false); handleMasterScrub(parseFloat(e.target.value)); }} 
                  className="w-full h-4 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500" 
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>0%</span>
                  <span className="text-amber-400 font-mono">{raceProgress.toFixed(1)}%</span>
                </div>
              </div>

              {/* Speed */}
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase">Speed</h3>
                  <span className="text-emerald-400 font-mono text-sm">{speedMultiplier.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="15" 
                  step="0.5" 
                  value={speedMultiplier} 
                  onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))} 
                  className="w-full h-4 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400" 
                />
              </div>

              {/* Jockeying */}
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">Jockeying</h3>
                <div className="space-y-2">
                  {horses.map(horse => (
                    <div key={horse.id} className="bg-slate-900 p-2 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: horse.color }} />
                          <span className="text-white text-xs font-medium">{horse.name}</span>
                        </div>
                        <span className={`text-xs font-mono ${horse.speedMod > 0 ? 'text-green-400' : horse.speedMod < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                          {horse.speedMod > 0 ? '+' : ''}{horse.speedMod}%
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="-30" 
                        max="30" 
                        step="1" 
                        value={horse.speedMod} 
                        onChange={(e) => updateHorse(horse.id, 'speedMod', parseFloat(e.target.value))} 
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" 
                        style={{ accentColor: horse.color }} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
