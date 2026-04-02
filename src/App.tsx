import { useState, useEffect, useRef } from 'react';
import { Play, Square, Flag, Edit2, Activity, Monitor, X, Palette } from 'lucide-react';

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
  const [selectedRaceMarkerId, setSelectedRaceMarkerId] = useState<number | null>(1);
  const [markers, setMarkers] = useState([
    { id: 1, label: '1 F', pos: 1 },
    { id: 2, label: '2 F', pos: 2 },
    { id: 3, label: '3 F', pos: 3 },
    { id: 4, label: '4 F', pos: 4 },
    { id: 5, label: '5 F', pos: 5 },
    { id: 6, label: '6 F', pos: 6 }
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
  const [chromaColor, setChromaColor] = useState('#00ff00');
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [activeTab, setActiveTab] = useState('track');

  const selectedMarker = markers.find(m => m.id === selectedRaceMarkerId);
  const raceDistanceFurlongs = selectedMarker ? selectedMarker.pos : 6;
  const raceDistancePct = (raceDistanceFurlongs / TOTAL_OVAL_FURLONGS) * 100;
  const isOverlay = raceDistanceFurlongs > 6;
  const overlayPercent = isOverlay ? Math.round((raceDistanceFurlongs / 6) * 100) : 100;

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
    if (selectedRaceMarkerId === id) {
      setSelectedRaceMarkerId(null);
    }
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
    raceStatus = "FINISHED";
  }

  const getMarkerButtonStyle = (marker: typeof markers[0]) => {
    const isSelected = selectedRaceMarkerId === marker.id;
    const isOverlay = marker.pos > 6;
    
    if (isSelected) {
      return isOverlay ? 'bg-orange-500 text-black ring-4 ring-white' : 'bg-amber-400 text-black ring-4 ring-white';
    }
    return isOverlay ? 'bg-orange-700 text-white hover:bg-orange-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600';
  };

  const BroadcastView = () => (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: isChroma ? chromaColor : 'transparent' }}
    >
      <div className="w-full h-full">
        <svg viewBox="0 0 800 400" className="w-full h-full" style={{ background: 'transparent' }}>
          <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z" fill="none" stroke={isChroma ? chromaColor : "#1e293b"} strokeWidth="22" />
          <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z" fill="none" stroke={isChroma ? chromaColor : "#3b82f6"} strokeWidth="22" strokeDasharray={`${highlightLength} ${L_TOTAL * 2}`} strokeDashoffset={-startOffset} />
          <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z" fill="none" stroke={isChroma ? chromaColor : "#3b82f6"} strokeWidth="22" strokeDasharray={`${highlightLength} ${L_TOTAL * 2}`} strokeDashoffset={-startOffset + L_TOTAL} />
          <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z" fill="none" stroke={isChroma ? chromaColor : "#1e293b"} strokeWidth="2" strokeDasharray="10 10" />

          {markers.filter(m => m.pos <= raceDistanceFurlongs && m.pos > 0).map(marker => {
            const trackPct = getMarkerTrackPct(marker.pos);
            const mData = getTrackData(trackPct);
            const isRaceEnd = marker.id === selectedRaceMarkerId;
            return (
              <g key={`marker-${marker.id}`}>
                <line x1={mData.x - mData.nx * 15} y1={mData.y - mData.ny * 15} x2={mData.x + mData.nx * 15} y2={mData.y + mData.ny * 15} 
                  stroke={isChroma ? chromaColor : (isRaceEnd ? "#ef4444" : "#60a5fa")} strokeWidth={isRaceEnd ? 6 : 4} />
                <text x={mData.x + mData.nx * 35} y={mData.y + mData.ny * 35 + 4} 
                  fill={isChroma ? chromaColor : (isRaceEnd ? "#ef4444" : "#60a5fa")} 
                  fontSize="12" fontWeight="bold" textAnchor="middle" 
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{marker.label}</text>
              </g>
            );
          })}

          {(() => {
            const sData = getTrackData(startPos);
            return (
              <g>
                <line x1={sData.x - sData.nx * 16} y1={sData.y - sData.ny * 16} x2={sData.x + sData.nx * 16} y2={sData.y + sData.ny * 16} stroke={isChroma ? chromaColor : "#10b981"} strokeWidth="6" />
                <text x={sData.x + sData.nx * 40} y={sData.y + sData.ny * 40 + 5} fill={isChroma ? chromaColor : "#10b981"} fontSize="14" fontWeight="bold" textAnchor="middle" letterSpacing="1" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>START</text>
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
                <circle cx={finalX} cy={finalY} r="7" fill={isChroma ? chromaColor : horse.color} stroke={isChroma ? "transparent" : "#fff"} strokeWidth="2" style={{ filter: isChroma ? 'none' : `drop-shadow(0 0 8px ${horse.color})` }} />
              </g>
            );
          })}
        </svg>
      </div>
      
      <button
        onClick={() => setBroadcastMode(false)}
        className="absolute top-4 right-4 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold flex items-center"
      >
        <X size={20} className="mr-2" />
        Exit
      </button>
    </div>
  );

  return (
    <div className={`min-h-screen flex ${isChroma && !broadcastMode ? chromaColor : 'bg-slate-950'} text-white font-sans`}>
      {broadcastMode && <BroadcastView />}

      {/* LEFT: Broadcast Output */}
      <div className={`flex-1 flex flex-col ${isChroma && !broadcastMode ? '' : 'bg-slate-900'}`}>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-[calc(100vh-160px)] aspect-[3/2] max-h-[calc(100vh-160px)]">
            <div className="w-full h-full shadow-2xl rounded-xl overflow-hidden border-2 border-slate-700 relative flex flex-col" style={{ background: isChroma && !broadcastMode ? chromaColor : '#0f172a' }}>
              {!broadcastMode && (
                <div className="bg-slate-800/95 px-6 py-3 border-b border-slate-700 flex justify-between items-center shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
                    <span className="text-white font-bold text-lg tracking-wider uppercase">Live Broadcast</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="bg-slate-900 px-5 py-2 rounded-full border border-slate-600">
                      <span className="text-amber-400 font-mono font-bold text-lg">
                        {progressFurlongs.toFixed(2)} / {raceDistanceFurlongs.toFixed(2)} F
                      </span>
                    </div>
                    <button
                      onClick={() => setBroadcastMode(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-bold flex items-center"
                    >
                      <Monitor size={18} className="mr-2" />
                      FULLSCREEN
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 flex items-center justify-center p-4 min-h-0" style={{ background: isChroma && !broadcastMode ? chromaColor : undefined }}>
                <svg viewBox="0 0 800 400" className="w-full h-full drop-shadow-2xl" style={{ background: isChroma && !broadcastMode ? 'transparent' : undefined }}>
                  <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z" fill="none" stroke={isChroma ? chromaColor : "#1e293b"} strokeWidth="22" />
                  
                  <path 
                    d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z" 
                    fill="none" 
                    stroke={isChroma ? chromaColor : (isPlaying ? "#f97316" : "#3b82f6")} 
                    strokeWidth="22" 
                    strokeDasharray={`${highlightLength} ${L_TOTAL * 2}`} 
                    strokeDashoffset={-startOffset}
                    style={{ filter: isChroma ? 'none' : (isPlaying ? 'drop-shadow(0 0 10px #f97316)' : 'drop-shadow(0 0 6px #3b82f6)') }}
                  />
                  <path 
                    d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z" 
                    fill="none" 
                    stroke={isChroma ? chromaColor : (isPlaying ? "#f97316" : "#3b82f6")} 
                    strokeWidth="22" 
                    strokeDasharray={`${highlightLength} ${L_TOTAL * 2}`} 
                    strokeDashoffset={-startOffset + L_TOTAL}
                  />
                  
                  <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z" fill="none" stroke={isChroma ? chromaColor : "#1e293b"} strokeWidth="2" strokeDasharray="10 10" />

                  {markers.filter(m => m.pos <= raceDistanceFurlongs && m.pos > 0).map(marker => {
                    const trackPct = getMarkerTrackPct(marker.pos);
                    const mData = getTrackData(trackPct);
                    const isRaceEnd = marker.id === selectedRaceMarkerId;
                    return (
                      <g key={`marker-${marker.id}`}>
                        <line x1={mData.x - mData.nx * 15} y1={mData.y - mData.ny * 15} x2={mData.x + mData.nx * 15} y2={mData.y + mData.ny * 15} 
                          stroke={isChroma ? chromaColor : (isRaceEnd ? "#ef4444" : "#60a5fa")} strokeWidth={isRaceEnd ? 6 : 4} />
                        <text x={mData.x + mData.nx * 35} y={mData.y + mData.ny * 35 + 4} 
                          fill={isChroma ? chromaColor : (isRaceEnd ? "#ef4444" : "#60a5fa")} 
                          fontSize="12" fontWeight="bold" textAnchor="middle" 
                          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{marker.label}</text>
                      </g>
                    );
                  })}

                  {(() => {
                    const sData = getTrackData(startPos);
                    return (
                      <g>
                        <line x1={sData.x - sData.nx * 16} y1={sData.y - sData.ny * 16} x2={sData.x + sData.nx * 16} y2={sData.y + sData.ny * 16} stroke={isChroma ? chromaColor : "#10b981"} strokeWidth="6" />
                        <text x={sData.x + sData.nx * 40} y={sData.y + sData.ny * 40 + 5} fill={isChroma ? chromaColor : "#10b981"} fontSize="14" fontWeight="bold" textAnchor="middle" letterSpacing="1" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>START</text>
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
                        <circle cx={finalX} cy={finalY} r="7" fill={isChroma ? chromaColor : horse.color} stroke={isChroma ? "transparent" : "#fff"} strokeWidth="2" style={{ filter: isChroma ? 'none' : `drop-shadow(0 0 8px ${horse.color})` }} />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {!broadcastMode && (
                <div className="bg-slate-950 px-6 py-3 border-t border-slate-700 flex justify-between items-center shrink-0">
                  <span className="text-amber-400 font-bold text-lg tracking-wider">PETER AUGUST DIRT</span>
                  <span className={`font-bold text-lg ${raceProgress >= 100 ? 'text-green-400' : 'text-white'}`}>{raceStatus}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Control Panel */}
      <div className="w-[420px] bg-slate-800 border-l-4 border-amber-500 flex flex-col">
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5">
          <h1 className="text-2xl font-black text-black tracking-wider">PRODUCER CONTROL</h1>
        </div>

        <div className="flex bg-slate-900">
          <button
            onClick={() => setActiveTab('track')}
            className={`flex-1 py-5 px-4 text-center font-black text-lg uppercase tracking-wider transition-all ${
              activeTab === 'track' ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Flag size={24} className="mx-auto mb-1" />
            Track
          </button>
          <button
            onClick={() => setActiveTab('horses')}
            className={`flex-1 py-5 px-4 text-center font-black text-lg uppercase tracking-wider transition-all border-l border-slate-700 ${
              activeTab === 'horses' ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Edit2 size={24} className="mx-auto mb-1" />
            Roster
          </button>
          <button
            onClick={() => setActiveTab('control')}
            className={`flex-1 py-5 px-4 text-center font-black text-lg uppercase tracking-wider transition-all border-l border-slate-700 ${
              activeTab === 'control' ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Activity size={24} className="mx-auto mb-1" />
            Race
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {activeTab === 'track' && (
            <>
              {/* Start Line */}
              <div className="bg-slate-900 rounded-xl p-5 border-2 border-slate-700">
                <h2 className="text-xl font-black text-emerald-400 uppercase tracking-wider mb-4">Start Position</h2>
                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="1" 
                    value={startPos} 
                    onChange={(e) => setStartPos(parseInt(e.target.value))} 
                    className="w-full h-8 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    style={{ padding: '0 8px' }}
                  />
                  <div className="flex justify-between mt-3">
                    <span className="text-slate-500 font-bold">0%</span>
                    <span className="text-emerald-400 font-black text-2xl">{startPos}%</span>
                    <span className="text-slate-500 font-bold">100%</span>
                  </div>
                </div>
              </div>

              {/* Race Distance - Select which marker is the finish */}
              <div className="bg-slate-900 rounded-xl p-5 border-2 border-amber-500">
                <h2 className="text-xl font-black text-amber-400 uppercase tracking-wider mb-2">Race Distance (Select Finish)</h2>
                <p className="text-slate-400 text-sm mb-4">Click a marker below to set it as the race finish point</p>
                
                {/* Marker buttons for race distance selection */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {markers.slice().sort((a, b) => a.pos - b.pos).map(marker => (
                    <button
                      key={marker.id}
                      onClick={() => setSelectedRaceMarkerId(marker.id)}
                      className={`py-4 rounded-lg font-black text-xl transition-all ${getMarkerButtonStyle(marker)}`}
                    >
                      {marker.label}
                    </button>
                  ))}
                </div>

                {/* Selected race distance display */}
                {selectedMarker && (
                  <div className="bg-slate-800 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold text-lg">Race Distance:</span>
                      <span className={`font-black text-3xl ${isOverlay ? 'text-orange-400' : 'text-amber-400'}`}>
                        {selectedMarker.pos.toFixed(1)} F
                      </span>
                    </div>
                    {isOverlay && (
                      <div className="mt-2 bg-orange-500/20 rounded-lg px-3 py-1 inline-block">
                        <span className="text-orange-400 font-bold">{overlayPercent}% (Overlay)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Furlong Markers */}
              <div className="bg-slate-900 rounded-xl p-5 border-2 border-blue-500">
                <h2 className="text-xl font-black text-blue-400 uppercase tracking-wider mb-2">Furlong Markers</h2>
                <p className="text-slate-400 text-sm mb-4">Adjust marker positions - finish updates live!</p>
                
                <div className="space-y-4">
                  {markers.slice().sort((a, b) => a.pos - b.pos).map(marker => (
                    <div key={marker.id} className={`bg-slate-800 rounded-xl p-4 border-2 ${marker.id === selectedRaceMarkerId ? 'border-amber-500' : 'border-slate-700'}`}>
                      <div className="flex items-center space-x-3 mb-3">
                        {marker.id === selectedRaceMarkerId && (
                          <span className="bg-amber-500 text-black px-2 py-1 rounded text-xs font-black">FINISH</span>
                        )}
                        <input
                          type="text"
                          value={marker.label}
                          onChange={(e) => updateMarker(marker.id, 'label', e.target.value)}
                          className="flex-1 bg-slate-900 border-2 border-slate-600 rounded-lg px-4 py-2 text-lg text-white font-bold focus:border-blue-400 focus:outline-none"
                        />
                        <span className="text-amber-400 font-black text-2xl w-20 text-right">{marker.pos.toFixed(1)}F</span>
                        <button 
                          onClick={() => removeMarker(marker.id)} 
                          className="w-10 h-10 bg-red-600 hover:bg-red-500 rounded-lg flex items-center justify-center text-white font-black"
                        >
                          X
                        </button>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="12"
                        step="0.1"
                        value={marker.pos}
                        onChange={(e) => updateMarker(marker.id, 'pos', parseFloat(e.target.value))}
                        className="w-full h-5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
                        style={{ padding: '0 8px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'horses' && (
            <div className="bg-slate-900 rounded-xl p-5 border-2 border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-slate-300 uppercase">Roster ({horses.length}/10)</h2>
                <button 
                  onClick={addHorse} 
                  disabled={horses.length >= 10} 
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-3 rounded-lg font-black text-lg"
                >
                  + ADD
                </button>
              </div>

              <div className="space-y-3">
                {horses.map(horse => (
                  <div key={horse.id} className="bg-slate-800 rounded-xl p-4 flex items-center space-x-4">
                    <input 
                      type="color" 
                      value={horse.color} 
                      onChange={(e) => updateHorse(horse.id, 'color', e.target.value)} 
                      className="w-14 h-14 rounded-xl cursor-pointer border-4 border-slate-600" 
                    />
                    <input
                      type="text"
                      value={horse.name}
                      onChange={(e) => updateHorse(horse.id, 'name', e.target.value)}
                      className="flex-1 bg-slate-900 border-2 border-slate-600 rounded-lg px-4 py-3 text-lg text-white font-bold focus:border-amber-400 focus:outline-none"
                      placeholder="Horse Name"
                    />
                    <button 
                      onClick={() => removeHorse(horse.id)} 
                      className="w-12 h-12 bg-red-600 hover:bg-red-500 rounded-lg flex items-center justify-center text-white font-black text-xl"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'control' && (
            <>
              <div className="bg-slate-900 rounded-xl p-5 border-2 border-purple-500">
                <h2 className="text-xl font-black text-purple-400 uppercase tracking-wider mb-4">Chroma Key</h2>
                
                <div className="flex items-center space-x-4 mb-4">
                  <button
                    onClick={() => setIsChroma(!isChroma)}
                    className={`flex-1 py-4 rounded-xl font-black text-lg transition-all ${
                      isChroma ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {isChroma ? 'CHROMA ON' : 'CHROMA OFF'}
                  </button>
                </div>

                {isChroma && (
                  <div className="flex items-center space-x-4 bg-slate-800 rounded-lg p-3">
                    <Palette className="text-purple-400" size={28} />
                    <input 
                      type="color" 
                      value={chromaColor}
                      onChange={(e) => setChromaColor(e.target.value)}
                      className="w-14 h-14 rounded-lg cursor-pointer border-2 border-purple-500"
                    />
                    <span className="text-purple-400 font-mono font-black text-xl">{chromaColor.toUpperCase()}</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-900 rounded-xl p-5 border-2 border-amber-500">
                <h2 className="text-xl font-black text-amber-400 uppercase tracking-wider mb-4">Race Progress</h2>
                
                <div className={`h-20 rounded-xl overflow-hidden mb-4 border-4 ${isOverlay ? 'border-orange-500' : 'border-slate-600'}`}>
                  <div className="relative h-full">
                    <div 
                      className={`absolute top-0 left-0 h-full transition-all duration-100 ${
                        isPlaying ? 'bg-gradient-to-r from-orange-500 to-orange-300 animate-pulse' : isOverlay ? 'bg-gradient-to-r from-orange-700 to-orange-500' : 'bg-gradient-to-r from-green-700 to-green-500'
                      }`}
                      style={{ width: `${raceProgress}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-black text-3xl drop-shadow-lg">
                        {progressFurlongs.toFixed(2)} / {raceDistanceFurlongs.toFixed(2)} F
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 mb-4">
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)} 
                    className={`flex-1 flex justify-center items-center py-6 rounded-xl font-black text-2xl transition-all ${
                      isPlaying ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isPlaying ? <Square size={32} className="mr-3" /> : <Play size={32} className="mr-3" />}
                    {isPlaying ? 'PAUSE' : 'START'}
                  </button>
                  <button 
                    onClick={handleReset} 
                    className="px-8 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-black text-xl"
                  >
                    RESET
                  </button>
                </div>

                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="0.1" 
                    value={raceProgress} 
                    onChange={(e) => { setIsPlaying(false); handleMasterScrub(parseFloat(e.target.value)); }} 
                    className="w-full h-8 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    style={{ padding: '0 8px' }}
                  />
                  <div className="flex justify-between mt-3">
                    <span className="text-slate-500 font-bold">0%</span>
                    <span className="text-amber-400 font-black text-2xl">{raceProgress.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl p-5 border-2 border-slate-700">
                <h2 className="text-xl font-black text-emerald-400 uppercase tracking-wider mb-4">Speed</h2>
                <div className="relative">
                  <input 
                    type="range" 
                    min="1" 
                    max="15" 
                    step="0.5" 
                    value={speedMultiplier} 
                    onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))} 
                    className="w-full h-8 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    style={{ padding: '0 8px' }}
                  />
                  <div className="flex justify-between mt-3">
                    <span className="text-slate-500 font-bold">1x</span>
                    <span className="text-emerald-400 font-black text-2xl">{speedMultiplier.toFixed(1)}x</span>
                    <span className="text-slate-500 font-bold">15x</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl p-5 border-2 border-slate-700">
                <h2 className="text-xl font-black text-amber-400 uppercase tracking-wider mb-4">Jockeying</h2>
                <div className="space-y-3">
                  {horses.map(horse => (
                    <div key={horse.id} className="bg-slate-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full border-2 border-white" style={{ backgroundColor: horse.color }} />
                          <span className="text-white font-bold text-lg">{horse.name}</span>
                        </div>
                        <span className={`font-black text-xl ${horse.speedMod > 0 ? 'text-green-400' : horse.speedMod < 0 ? 'text-red-400' : 'text-slate-500'}`}>
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
                        className="w-full h-4 bg-slate-700 rounded-lg appearance-none cursor-pointer" 
                        style={{ accentColor: horse.color, padding: '0 8px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
