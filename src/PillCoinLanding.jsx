import React, { useEffect, useState } from 'react';
import '@solana/wallet-adapter-react-ui/styles.css';
import pillImg from './assets/pill.png';

// Simple, self-running simulation: the pill grows every 5s and slightly shrinks every 15s.
// It always trends upward and stays centered.

const BASE_SCALE = 1;           // starting size
const GROW_FACTOR = 1.06;       // +6% every 5s
const SHRINK_FACTOR = 0.96;     // −4% every 15s (net growth over time)
const MAX_SCALE = 6;            // safety cap so it doesn't explode visually

export default function PillCoinLanding() {
  const [scale, setScale] = useState(BASE_SCALE);
  const [lastEvent, setLastEvent] = useState('');

  useEffect(() => {
    // grow every 5 seconds
    const grow = setInterval(() => {
      setScale((s) => Math.min(s * GROW_FACTOR, MAX_SCALE));
      setLastEvent('grow');
    }, 5000);

    // shrink slightly every 15 seconds
    const shrink = setInterval(() => {
      setScale((s) => Math.max(BASE_SCALE, s * SHRINK_FACTOR));
      setLastEvent('shrink');
    }, 15000);

    return () => {
      clearInterval(grow);
      clearInterval(shrink);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-900 to-black text-white flex items-center justify-center p-6">
      <div className="max-w-4xl w-full bg-white/5 rounded-2xl p-8 grid place-items-center gap-6">
        <PillVisualizer scale={scale} lastEvent={lastEvent} />
        <div className="text-center text-sm text-gray-300">
          <p>The pill grows every 5s and slightly dips every 15s — endlessly.</p>
        </div>
      </div>
    </div>
  );
}

function PillVisualizer({ scale, lastEvent }) {
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="relative w-full flex items-center justify-center">
        <div
          className="transform transition-transform duration-700 ease-out mx-auto"
          style={{ transform: `scale(${scale})` }}
        >
          <img
            src={pillImg}
            alt="Pill"
            className="mx-auto w-48 h-48 object-contain drop-shadow-2xl"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const f = document.getElementById('pill-fallback');
              if (f) f.style.display = 'flex';
            }}
          />
          {/* Fallback if the image can't load */}
          <div
            id="pill-fallback"
            style={{ display: 'none' }}
            className="mx-auto w-48 h-48 rounded-full bg-gradient-to-br from-green-400 to-emerald-700 flex items-center justify-center text-white font-bold"
          >
            Pill
          </div>
        </div>
      </div>

      <div className="text-center">
        <h1 className="text-4xl font-extrabold">SolPill — the pill addicted to Solana</h1>
        <p className="text-gray-300 mt-2">
          Endless feeding simulation. Current scale: <span className="font-semibold">{scale.toFixed(2)}x</span>
          {lastEvent && <span className="ml-2 text-xs text-gray-400">(last event: {lastEvent})</span>}
        </p>
      </div>
    </div>
  );
}
