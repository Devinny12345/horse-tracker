import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import './index.css';
import { Play, Square, Flag, Edit2, Activity, Monitor, Palette, Share2, Eye, EyeOff, Layout, Plus, Trash2, Zap, CheckCircle } from 'lucide-react';

// ─── Track Math ───────────────────────────────────────────────────────────────
const L_STRAIGHT = 400;
const L_CURVE = Math.PI * 100;
const L_TOTAL = L_STRAIGHT * 2 + L_CURVE * 2;
const TOTAL_OVAL_FURLONGS = 6.0;
const BROADCAST_CHANNEL_NAME = 'horse-race-sync';

function getTrackData(percent: number) {
  let p = ((percent % 100) + 100) % 100;
  let dist = (p / 100) * L_TOTAL;
  if (dist <= L_STRAIGHT) return { x: 200 + dist, y: 300, nx: 0, ny: 1 };
  dist -= L_STRAIGHT;
  if (dist <= L_CURVE) {
    let angle = (Math.PI / 2) - (dist / L_CURVE) * Math.PI;
    return { x: 600 + 100 * Math.cos(angle), y: 200 + 100 * Math.sin(angle), nx: Math.cos(angle), ny: Math.sin(angle) };
  }
  dist -= L_CURVE;
  if (dist <= L_STRAIGHT) return { x: 600 - dist, y: 100, nx: 0, ny: -1 };
  dist -= L_STRAIGHT;
  let angle = -Math.PI / 2 - (dist / L_CURVE) * Math.PI;
  return { x: 200 + 100 * Math.cos(angle), y: 200 + 100 * Math.sin(angle), nx: Math.cos(angle), ny: Math.sin(angle) };
}

interface Marker { id: number; label: string; pos: number; }
interface Horse { id: number; name: string; color: string; speedMod: number; }
interface RaceState {
  startPos: number;
  selectedRaceMarkerId: number | null;
  markers: Marker[];
  horses: Horse[];
  raceProgress: number;
  horseProgresses: Record<number, number>;
  isChroma: boolean;
  chromaColor: string;
  graphicWidth: number;
  isGraphicVisible: boolean;
}

function getMarkerTrackPct(furlongPos: number) {
  return (furlongPos / TOTAL_OVAL_FURLONGS) * 100;
}

// ─── Sync helpers ────────────────────────────────────────────────────────────
const STORAGE_KEY = 'horseRaceState';

function saveState(state: RaceState) {
  const json = JSON.stringify(state);
  localStorage.setItem(STORAGE_KEY, json);
  // Also broadcast via BroadcastChannel for same-origin tabs
  try {
    const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    bc.postMessage(state);
    bc.close();
  } catch (_) { /* not supported */ }
}

// ─── TrackSVG ────────────────────────────────────────────────────────────────
function TrackSVG({
  startPos, markers, horses, horseProgresses, raceProgress,
  raceDistanceFurlongs, selectedRaceMarkerId, isChroma, chromaColor
}: {
  startPos: number; markers: Marker[]; horses: Horse[];
  horseProgresses: Record<number, number>; raceProgress: number;
  raceDistanceFurlongs: number; selectedRaceMarkerId: number | null;
  isChroma: boolean; chromaColor: string;
}) {
  const trackStroke = isChroma ? chromaColor : '#1e293b';
  const remainingStroke = isChroma ? chromaColor : '#334155';
  const runStroke = isChroma ? chromaColor : '#f97316';

  const getLeadHorseProgress = () => {
    let lead = raceProgress;
    horses.forEach(h => {
      const hp = horseProgresses[h.id] !== undefined ? horseProgresses[h.id] : raceProgress;
      if (hp > lead) lead = hp;
    });
    return Math.min(100, Math.max(0, lead));
  };

  const leadProgress = getLeadHorseProgress();
  const raceDistancePct = (raceDistanceFurlongs / TOTAL_OVAL_FURLONGS) * 100;
  const startOffset = (startPos / 100) * L_TOTAL;
  const finishTrackPct = getMarkerTrackPct(raceDistanceFurlongs);
  const leadTrackPct = (leadProgress / 100) * finishTrackPct;
  const runLength = (leadTrackPct / 100) * L_TOTAL;
  const remainingLength = (finishTrackPct / 100) * L_TOTAL - runLength;

  return (
    <svg viewBox="0 0 800 400" className="w-full h-full drop-shadow-2xl" style={{ background: 'transparent' }}>
      <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z"
        fill="none" stroke={trackStroke} strokeWidth="22" />
      <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z"
        fill="none" stroke={remainingStroke} strokeWidth="22"
        strokeDasharray={`${remainingLength} ${L_TOTAL * 2}`} strokeDashoffset={-startOffset - runLength} />
      <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z"
        fill="none" stroke={remainingStroke} strokeWidth="22"
        strokeDasharray={`${remainingLength} ${L_TOTAL * 2}`} strokeDashoffset={-startOffset - runLength + L_TOTAL} />
      {raceProgress > 0 && (
        <>
          <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z"
            fill="none" stroke={runStroke} strokeWidth="22"
            strokeDasharray={`${runLength} ${L_TOTAL * 2}`} strokeDashoffset={-startOffset}
            style={{ filter: isChroma ? 'none' : 'drop-shadow(0 0 8px #f97316)' }} />
          <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z"
            fill="none" stroke={runStroke} strokeWidth="22"
            strokeDasharray={`${runLength} ${L_TOTAL * 2}`} strokeDashoffset={-startOffset + L_TOTAL} />
        </>
      )}
      <path d="M 200,300 L 600,300 A 100,100 0 0,0 600,100 L 200,100 A 100,100 0 0,0 200,300 Z"
        fill="none" stroke={isChroma ? chromaColor : '#1e293b'} strokeWidth="2" strokeDasharray="10 10" />

      {markers.filter(m => m.pos <= raceDistanceFurlongs && m.pos > 0).map(marker => {
        const trackPct = getMarkerTrackPct(marker.pos);
        const mData = getTrackData(trackPct);
        const isRaceEnd = marker.id === selectedRaceMarkerId;
        return (
          <g key={`marker-${marker.id}`}>
            <line x1={mData.x - mData.nx * 15} y1={mData.y - mData.ny * 15}
              x2={mData.x + mData.nx * 15} y2={mData.y + mData.ny * 15}
              stroke={isChroma ? chromaColor : (isRaceEnd ? '#ef4444' : '#60a5fa')} strokeWidth={isRaceEnd ? 6 : 4} />
            <text x={mData.x + mData.nx * 35} y={mData.y + mData.ny * 35 + 4}
              fill={isChroma ? chromaColor : (isRaceEnd ? '#ef4444' : '#60a5fa')}
              fontSize="12" fontWeight="bold" textAnchor="middle"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{marker.label}</text>
          </g>
        );
      })}

      {(() => {
        const fData = getTrackData(finishTrackPct);
        return (
          <g>
            <line x1={fData.x - fData.nx * 18} y1={fData.y - fData.ny * 18}
              x2={fData.x + fData.nx * 18} y2={fData.y + fData.ny * 18}
              stroke={isChroma ? chromaColor : '#ef4444'} strokeWidth="8" />
            <text x={fData.x + fData.nx * 40} y={fData.y + fData.ny * 40 + 5}
              fill={isChroma ? chromaColor : '#ef4444'} fontSize="16" fontWeight="bold" textAnchor="middle" letterSpacing="1"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>FINISH</text>
          </g>
        );
      })()}

      {(() => {
        const sData = getTrackData(startPos);
        return (
          <g>
            <line x1={sData.x - sData.nx * 16} y1={sData.y - sData.ny * 16}
              x2={sData.x + sData.nx * 16} y2={sData.y + sData.ny * 16}
              stroke={isChroma ? chromaColor : '#10b981'} strokeWidth="6" />
            <text x={sData.x + sData.nx * 40} y={sData.y + sData.ny * 40 + 5}
              fill={isChroma ? chromaColor : '#10b981'} fontSize="14" fontWeight="bold" textAnchor="middle" letterSpacing="1"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>START</text>
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
            <circle cx={finalX} cy={finalY} r="7"
              fill={isChroma ? chromaColor : horse.color}
              stroke={isChroma ? 'transparent' : '#fff'} strokeWidth="2"
              style={{ filter: isChroma ? 'none' : `drop-shadow(0 0 8px ${horse.color})` }} />
          </g>
        );
      })}
    </svg>
  );
}

// ─── BroadcastOnly (Viewer) ───────────────────────────────────────────────────
const DEFAULT_STATE: RaceState = {
  startPos: 0,
  selectedRaceMarkerId: 1,
  markers: [
    { id: 1, label: '1 F', pos: 1 }, { id: 2, label: '2 F', pos: 2 },
    { id: 3, label: '3 F', pos: 3 }, { id: 4, label: '4 F', pos: 4 },
    { id: 5, label: '5 F', pos: 5 }, { id: 6, label: '6 F', pos: 6 }
  ],
  horses: [
    { id: 1, name: 'Rider 1', color: '#fbbf24', speedMod: 0 },
    { id: 2, name: 'Rider 2', color: '#ef4444', speedMod: 0 },
    { id: 3, name: 'Rider 3', color: '#3b82f6', speedMod: 0 },
    { id: 4, name: 'Rider 4', color: '#10b981', speedMod: 0 }
  ],
  raceProgress: 0,
  horseProgresses: {},
  isChroma: false,
  chromaColor: '#00ff00',
  graphicWidth: 1280,
  isGraphicVisible: true
};

function parseState(raw: string | null): RaceState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      graphicWidth: parsed.graphicWidth || 1280,
      isGraphicVisible: parsed.isGraphicVisible !== undefined ? parsed.isGraphicVisible : true
    };
  } catch (_) { return null; }
}

function BroadcastOnly() {
  const [state, setState] = useState<RaceState>(() => parseState(localStorage.getItem(STORAGE_KEY)) || DEFAULT_STATE);

  useEffect(() => {
    // Primary: BroadcastChannel API — instant updates in same-origin tabs
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (e) => {
        if (e.data && typeof e.data === 'object') {
          setState({ ...DEFAULT_STATE, ...e.data, graphicWidth: e.data.graphicWidth || 1280, isGraphicVisible: e.data.isGraphicVisible !== undefined ? e.data.isGraphicVisible : true });
        }
      };
    } catch (_) { /* BroadcastChannel not supported */ }

    // Fallback: poll localStorage every 100ms for cross-browser compat
    // Also covers the case where BroadcastChannel is unavailable
    const interval = setInterval(() => {
      const parsed = parseState(localStorage.getItem(STORAGE_KEY));
      if (parsed) setState(parsed);
    }, 100);

    return () => {
      bc?.close();
      clearInterval(interval);
    };
  }, []);

  const selectedMarker = state.markers.find(m => m.id === state.selectedRaceMarkerId);
  const raceDistanceFurlongs = selectedMarker ? selectedMarker.pos : 6;

  return (
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ background: state.isChroma ? state.chromaColor : '#0f172a' }}>
      <div className="transition-all duration-500" style={{
        width: `${state.graphicWidth}px`,
        height: `${state.graphicWidth * 0.667}px`,
        maxWidth: '100vw', maxHeight: '100vh',
        opacity: state.isGraphicVisible ? 1 : 0,
        transform: state.isGraphicVisible ? 'scale(1)' : 'scale(0.8)',
      }}>
        <TrackSVG
          startPos={state.startPos} markers={state.markers} horses={state.horses}
          horseProgresses={state.horseProgresses} raceProgress={state.raceProgress}
          raceDistanceFurlongs={raceDistanceFurlongs}
          selectedRaceMarkerId={state.selectedRaceMarkerId}
          isChroma={state.isChroma} chromaColor={state.chromaColor}
        />
      </div>
    </div>
  );
}

// ─── ProducerDashboard ────────────────────────────────────────────────────────
function ProducerDashboard() {
  const [startPos, setStartPos] = useState(0);
  const [selectedRaceMarkerId, setSelectedRaceMarkerId] = useState<number | null>(1);
  const [markers, setMarkers] = useState<Marker[]>([
    { id: 1, label: '1 F', pos: 1 }, { id: 2, label: '2 F', pos: 2 },
    { id: 3, label: '3 F', pos: 3 }, { id: 4, label: '4 F', pos: 4 },
    { id: 5, label: '5 F', pos: 5 }, { id: 6, label: '6 F', pos: 6 }
  ]);
  const [horses, setHorses] = useState<Horse[]>([
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
  const [activeTab, setActiveTab] = useState('control');
  const [graphicX, setGraphicX] = useState(640);
  const [graphicY, setGraphicY] = useState(360);
  const [graphicWidth, setGraphicWidth] = useState(1280);
  const [isGraphicVisible, setIsGraphicVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  // Sync to storage + BroadcastChannel on every relevant state change
  useEffect(() => {
    const state: RaceState = { startPos, selectedRaceMarkerId, markers, horses, raceProgress, horseProgresses, isChroma, chromaColor, graphicWidth, isGraphicVisible };
    saveState(state);
  }, [startPos, selectedRaceMarkerId, markers, horses, raceProgress, horseProgresses, isChroma, chromaColor, graphicWidth, isGraphicVisible]);

  // High-frequency sync during animation (60fps via rAF in engine already triggers setRaceProgress which triggers useEffect above)
  // Extra safety net: push current state to storage every 16ms while playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const state: RaceState = { startPos, selectedRaceMarkerId, markers, horses, raceProgress, horseProgresses, isChroma, chromaColor, graphicWidth, isGraphicVisible };
      saveState(state);
    }, 16);
    return () => clearInterval(interval);
  }, [isPlaying, startPos, selectedRaceMarkerId, markers, horses, raceProgress, horseProgresses, isChroma, chromaColor, graphicWidth, isGraphicVisible]);

  const selectedMarker = markers.find(m => m.id === selectedRaceMarkerId);
  const raceDistanceFurlongs = selectedMarker ? selectedMarker.pos : 6;
  const isOverlay = raceDistanceFurlongs > 6;

  const engineRef = useRef({
    progress: 0, speed: 5, isPlaying: false,
    horses: [] as Horse[], horseProgresses: {} as Record<number, number>
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
        if (newProg >= 100) { newProg = 100; engineRef.current.isPlaying = false; setIsPlaying(false); }
        const newHP = { ...engineRef.current.horseProgresses };
        engineRef.current.horses.forEach(h => {
          let current = newHP[h.id] !== undefined ? newHP[h.id] : engineRef.current.progress;
          newHP[h.id] = current + (engineRef.current.speed * (1 + (h.speedMod / 100)) * delta);
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
    setIsPlaying(false); engineRef.current.isPlaying = false;
    setRaceProgress(0); engineRef.current.progress = 0;
    setHorseProgresses({}); engineRef.current.horseProgresses = {};
  };

  const addHorse = () => {
    if (horses.length >= 10) return;
    const newId = Math.max(...horses.map(h => h.id), 0) + 1;
    const colors = ['#f472b6', '#a78bfa', '#34d399', '#fb923c', '#f87171', '#60a5fa', '#facc15', '#a3e635'];
    setHorses([...horses, { id: newId, name: `Rider ${newId}`, color: colors[newId % colors.length], speedMod: 0 }]);
  };
  const updateHorse = (id: number, field: string, value: any) => setHorses(horses.map(h => h.id === id ? { ...h, [field]: value } : h));
  const removeHorse = (id: number) => setHorses(horses.filter(h => h.id !== id));
  const updateMarker = (id: number, field: string, value: any) => setMarkers(markers.map(m => m.id === id ? { ...m, [field]: value } : m));
  const removeMarker = (id: number) => { setMarkers(markers.filter(m => m.id !== id)); if (selectedRaceMarkerId === id) setSelectedRaceMarkerId(null); };

  const getLeadHorseProgress = () => {
    let lead = raceProgress;
    horses.forEach(h => { const hp = horseProgresses[h.id] !== undefined ? horseProgresses[h.id] : raceProgress; if (hp > lead) lead = hp; });
    return Math.min(100, Math.max(0, lead));
  };

  const leadProgress = getLeadHorseProgress();
  const leadHorseFurlongs = (leadProgress / 100) * raceDistanceFurlongs;

  let raceStatus = 'AWAITING POST';
  if (raceProgress > 0 && raceProgress < 100) raceStatus = 'LIVE RACING';
  else if (raceProgress >= 100) raceStatus = 'FINISHED';



  const handleCopyLink = () => {
    const url = window.location.origin + '/broadcast';
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'control', label: 'Race', icon: <Activity size={18} /> },
    { id: 'track', label: 'Track', icon: <Flag size={18} /> },
    { id: 'horses', label: 'Roster', icon: <Edit2 size={18} /> },
    { id: 'layout', label: 'Layout', icon: <Layout size={18} /> },
  ];

  return (
    <div className="dashboard-root">
      {/* ── LEFT: Broadcast Preview ── */}
      <div className="preview-panel">
        <div className="preview-header">
          <div className="preview-header-left">
            <div className={`live-dot ${isPlaying ? 'live-dot--active' : ''}`} />
            <span className="preview-title">Live Broadcast</span>
          </div>
          <div className="preview-header-right">
            <div className="furlong-badge">
              <span className="furlong-value">{leadHorseFurlongs.toFixed(2)}</span>
              <span className="furlong-sep">/</span>
              <span className="furlong-total">{raceDistanceFurlongs.toFixed(2)} F</span>
            </div>
            <a href="/broadcast" target="_blank" rel="noopener noreferrer" className="btn btn--blue btn--sm">
              <Monitor size={15} />
              Fullscreen
            </a>
            <button onClick={handleCopyLink} className={`btn btn--sm ${copied ? 'btn--green' : 'btn--emerald'}`}>
              {copied ? <CheckCircle size={15} /> : <Share2 size={15} />}
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>
        </div>

        <div className="preview-track-area">
          <TrackSVG
            startPos={startPos} markers={markers} horses={horses}
            horseProgresses={horseProgresses} raceProgress={raceProgress}
            raceDistanceFurlongs={raceDistanceFurlongs}
            selectedRaceMarkerId={selectedRaceMarkerId}
            isChroma={false} chromaColor="#00ff00"
          />
        </div>

        <div className="preview-footer">
          <span className="preview-footer-name">PETER AUGUST DIRT</span>
          <span className={`preview-footer-status ${raceProgress >= 100 ? 'status--finished' : raceProgress > 0 ? 'status--live' : ''}`}>
            {raceStatus}
          </span>
        </div>
      </div>

      {/* ── RIGHT: Control Panel ── */}
      <div className="control-panel">
        {/* Panel Header */}
        <div className="panel-header">
          <div className="panel-header-content">
            <Zap size={20} className="panel-header-icon" />
            <h1 className="panel-header-title">Producer Control</h1>
          </div>
          <div className={`race-status-pill ${raceProgress >= 100 ? 'pill--finished' : raceProgress > 0 ? 'pill--live' : 'pill--idle'}`}>
            {raceProgress > 0 && raceProgress < 100 && <span className="pill-pulse" />}
            {raceStatus}
          </div>
        </div>

        {/* Tabs */}
        <div className="panel-tabs">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`tab-btn ${activeTab === tab.id ? 'tab-btn--active' : ''}`}>
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="panel-body">

          {/* ── RACE TAB ── */}
          {activeTab === 'control' && (
            <div className="tab-content">

              {/* Progress Bar */}
              <div className="card">
                <div className="card-label">Race Progress</div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${leadProgress}%`, background: isPlaying ? 'linear-gradient(90deg,#f97316,#fb923c)' : isOverlay ? 'linear-gradient(90deg,#ea580c,#f97316)' : 'linear-gradient(90deg,#10b981,#34d399)' }} />
                  <div className="progress-label">
                    {leadHorseFurlongs.toFixed(2)} / {raceDistanceFurlongs.toFixed(2)} F
                  </div>
                </div>

                {/* Play / Reset */}
                <div className="race-controls">
                  <button onClick={() => setIsPlaying(!isPlaying)}
                    className={`btn-play ${isPlaying ? 'btn-play--stop' : 'btn-play--go'}`}>
                    {isPlaying ? <Square size={22} /> : <Play size={22} />}
                    {isPlaying ? 'PAUSE' : 'START RACE'}
                  </button>
                  <button onClick={handleReset} className="btn-reset">RESET</button>
                </div>

                {/* Scrub Slider */}
                <div className="slider-group">
                  <div className="slider-row">
                    <span className="slider-label">Scrub</span>
                    <span className="slider-value amber">{leadProgress.toFixed(1)}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="0.1" value={leadProgress}
                    onChange={(e) => { setIsPlaying(false); handleMasterScrub(parseFloat(e.target.value)); }}
                    className="slider slider--amber" />
                </div>
              </div>

              {/* Speed */}
              <div className="card">
                <div className="card-label">Simulation Speed</div>
                <div className="slider-group">
                  <div className="slider-row">
                    <span className="slider-label">1x</span>
                    <span className="slider-value green">{speedMultiplier.toFixed(1)}x</span>
                    <span className="slider-label">15x</span>
                  </div>
                  <input type="range" min="1" max="15" step="0.5" value={speedMultiplier}
                    onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                    className="slider slider--green" />
                </div>
                <div className="speed-presets">
                  {[1, 3, 5, 10, 15].map(s => (
                    <button key={s} onClick={() => setSpeedMultiplier(s)}
                      className={`speed-chip ${speedMultiplier === s ? 'speed-chip--active' : ''}`}>{s}x</button>
                  ))}
                </div>
              </div>

              {/* Jockey Sliders */}
              <div className="card">
                <div className="card-label">Jockey Speed Modifiers</div>
                <div className="jockey-list">
                  {horses.map(horse => (
                    <div key={horse.id} className="jockey-row">
                      <div className="jockey-top">
                        <div className="jockey-info">
                          <div className="jockey-dot" style={{ backgroundColor: horse.color, boxShadow: `0 0 8px ${horse.color}` }} />
                          <span className="jockey-name">{horse.name}</span>
                        </div>
                        <span className={`jockey-mod ${horse.speedMod > 0 ? 'mod--up' : horse.speedMod < 0 ? 'mod--down' : 'mod--zero'}`}>
                          {horse.speedMod > 0 ? '+' : ''}{horse.speedMod}%
                        </span>
                      </div>
                      <input type="range" min="-30" max="30" step="1" value={horse.speedMod}
                        onChange={(e) => updateHorse(horse.id, 'speedMod', parseFloat(e.target.value))}
                        className="slider" style={{ accentColor: horse.color }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Chroma Key */}
              <div className="card card--purple">
                <div className="card-label">Chroma Key</div>
                <div className="chroma-row">
                  <button onClick={() => setIsChroma(!isChroma)}
                    className={`chroma-toggle ${isChroma ? 'chroma-toggle--on' : ''}`}>
                    <div className={`chroma-knob ${isChroma ? 'chroma-knob--on' : ''}`} />
                  </button>
                  <span className={`chroma-status ${isChroma ? 'chroma-status--on' : ''}`}>
                    {isChroma ? 'Chroma ON' : 'Chroma OFF'}
                  </span>
                  {isChroma && (
                    <div className="chroma-picker">
                      <Palette size={16} className="chroma-icon" />
                      <input type="color" value={chromaColor} onChange={(e) => setChromaColor(e.target.value)} className="color-input" />
                      <span className="chroma-hex">{chromaColor.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Graphic Visibility */}
              <div className="card">
                <div className="card-label">Graphic Visibility</div>
                <button onClick={() => setIsGraphicVisible(!isGraphicVisible)}
                  className={`vis-btn ${isGraphicVisible ? 'vis-btn--on' : 'vis-btn--off'}`}>
                  {isGraphicVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                  {isGraphicVisible ? 'Graphic ON' : 'Graphic OFF'}
                </button>
              </div>
            </div>
          )}

          {/* ── TRACK TAB ── */}
          {activeTab === 'track' && (
            <div className="tab-content">
              <div className="card">
                <div className="card-label">Start Position</div>
                <div className="slider-group">
                  <div className="slider-row">
                    <span className="slider-label">0%</span>
                    <span className="slider-value green">{startPos}%</span>
                    <span className="slider-label">100%</span>
                  </div>
                  <input type="range" min="0" max="100" step="1" value={startPos}
                    onChange={(e) => setStartPos(parseInt(e.target.value))}
                    className="slider slider--green" />
                </div>
              </div>

              <div className="card card--amber">
                <div className="card-label">Race Distance — Select Finish Line</div>
                <p className="card-hint">Tap a furlong marker to set as finish</p>
                <div className="marker-grid">
                  {markers.slice().sort((a, b) => a.pos - b.pos).map(marker => (
                    <button key={marker.id} onClick={() => setSelectedRaceMarkerId(marker.id)}
                      className={`marker-btn ${selectedRaceMarkerId === marker.id ? 'marker-btn--selected' : ''} ${marker.pos > 6 ? 'marker-btn--overlay' : ''}`}>
                      {marker.label}
                      {selectedRaceMarkerId === marker.id && <span className="marker-check"><CheckCircle size={12} /></span>}
                    </button>
                  ))}
                </div>
                {selectedMarker && (
                  <div className="distance-display">
                    <span className="distance-label">Race Distance</span>
                    <span className={`distance-value ${isOverlay ? 'orange' : 'amber'}`}>{selectedMarker.pos.toFixed(1)} F</span>
                  </div>
                )}
              </div>

              <div className="card card--blue">
                <div className="card-label">Furlong Markers</div>
                <div className="marker-list">
                  {markers.slice().sort((a, b) => a.pos - b.pos).map(marker => (
                    <div key={marker.id} className={`marker-item ${marker.id === selectedRaceMarkerId ? 'marker-item--finish' : ''}`}>
                      {marker.id === selectedRaceMarkerId && <span className="finish-badge">FINISH</span>}
                      <input type="text" value={marker.label}
                        onChange={(e) => updateMarker(marker.id, 'label', e.target.value)}
                        className="marker-text-input" />
                      <input type="range" min="0.5" max="12" step="0.1" value={marker.pos}
                        onChange={(e) => updateMarker(marker.id, 'pos', parseFloat(e.target.value))}
                        className="slider slider--blue flex-1" />
                      <span className="marker-pos">{marker.pos.toFixed(1)}F</span>
                      <button onClick={() => removeMarker(marker.id)} className="btn-icon btn-icon--red">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── HORSES TAB ── */}
          {activeTab === 'horses' && (
            <div className="tab-content">
              <div className="card">
                <div className="card-header-row">
                  <div className="card-label">Roster <span className="roster-count">({horses.length}/10)</span></div>
                  <button onClick={addHorse} disabled={horses.length >= 10} className="btn btn--blue btn--sm">
                    <Plus size={16} /> Add Horse
                  </button>
                </div>
                <div className="roster-list">
                  {horses.map(horse => (
                    <div key={horse.id} className="roster-item">
                      <div className="roster-color-wrap">
                        <input type="color" value={horse.color}
                          onChange={(e) => updateHorse(horse.id, 'color', e.target.value)}
                          className="roster-color-input" />
                        <div className="roster-color-glow" style={{ boxShadow: `0 0 12px ${horse.color}` }} />
                      </div>
                      <input type="text" value={horse.name}
                        onChange={(e) => updateHorse(horse.id, 'name', e.target.value)}
                        className="roster-name-input" placeholder="Horse name" />
                      <button onClick={() => removeHorse(horse.id)} className="btn-icon btn-icon--red">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── LAYOUT TAB ── */}
          {activeTab === 'layout' && (
            <div className="tab-content">
              <div className="card card--purple">
                <div className="card-label">Graphic Position (1920×1080)</div>
                <div className="layout-sliders">
                  {[
                    { label: 'X Position', val: graphicX, set: setGraphicX, min: 0, max: 1920 },
                    { label: 'Y Position', val: graphicY, set: setGraphicY, min: 0, max: 1080 },
                    { label: 'Width', val: graphicWidth, set: setGraphicWidth, min: 320, max: 1920 },
                  ].map(({ label, val, set, min, max }) => (
                    <div key={label} className="layout-row">
                      <div className="layout-row-top">
                        <span className="slider-label">{label}</span>
                        <input type="number" min={min} max={max} value={val}
                          onChange={(e) => set(parseInt(e.target.value) || min)}
                          className="num-input" />
                      </div>
                      <input type="range" min={min} max={max} step={10} value={val}
                        onChange={(e) => set(parseInt(e.target.value))}
                        className="slider slider--purple" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-label">Quick Presets</div>
                <div className="presets-grid">
                  <button onClick={() => { setGraphicX(640); setGraphicY(360); setGraphicWidth(1280); }} className="preset-btn">Center Large</button>
                  <button onClick={() => { setGraphicX(960); setGraphicY(540); setGraphicWidth(640); }} className="preset-btn">Center Small</button>
                  <button onClick={() => { setGraphicX(0); setGraphicY(540); setGraphicWidth(640); }} className="preset-btn">Left</button>
                  <button onClick={() => { setGraphicX(1280); setGraphicY(540); setGraphicWidth(640); }} className="preset-btn">Right</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
function App() {
  const isBroadcastMode = typeof window !== 'undefined' && window.location.pathname === '/broadcast';
  return isBroadcastMode ? <BroadcastOnly /> : <ProducerDashboard />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
);
