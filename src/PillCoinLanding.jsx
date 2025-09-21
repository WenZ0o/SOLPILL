import React, { useEffect, useState } from 'react';
import '@solana/wallet-adapter-react-ui/styles.css';

// Public image path (works on Vercel + Vite)
const PILL_PUBLIC_SRC = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL ? import.meta.env.BASE_URL : '/') + 'assets/pill.png';

// --- Simulation settings ---
const BASE_SCALE = 0.6;           // smaller starting size
const GROW_FACTOR = 1.08;         // +8% per growth tick
const SHRINK_FACTOR = 0.97;       // −3% per shrink tick (net growth over time)
const GROW_INTERVAL_MS = 2000;    // grow every 2s
const SHRINK_INTERVAL_MS = 8000;  // shrink a bit every 8s
const MAX_SCALE = 4;              // cap

function randomSolAmount() {
  const mu = Math.log(0.25);
  const sigma = 0.8;
  const n = Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
  const val = Math.exp(mu + sigma * n);
  return Math.min(2.5, Math.max(0.05, val));
}

export default function PillCoinLanding() {
  const [scale, setScale] = useState(BASE_SCALE);
  const [lastEvent, setLastEvent] = useState('');
  const [totalSol, setTotalSol] = useState(0);
  const [particles, setParticles] = useState([]);

  const spawnParticles = (count = 10) => {
    const newParts = Array.from({ length: count }).map((_, i) => ({
      id: `${Date.now()}-${i}`,
      dx: (Math.random() - 0.5) * 120,
      dy: -Math.random() * 140 - 40,
      life: 700 + Math.random() * 500,
      size: 4 + Math.random() * 5,
    }));
    setParticles((p) => [...p, ...newParts]);
    setTimeout(() => setParticles((p) => p.filter((pt) => !newParts.find(n => n.id === pt.id))), 1300);
  };

  useEffect(() => {
    const grow = setInterval(() => {
      setScale((s) => Math.min(s * GROW_FACTOR, MAX_SCALE));
      const fed = randomSolAmount();
      setTotalSol((x) => +(x + fed).toFixed(2));
      setLastEvent('grow');
      spawnParticles(12);
    }, GROW_INTERVAL_MS);

    const shrink = setInterval(() => {
      setScale((s) => Math.max(BASE_SCALE, s * SHRINK_FACTOR));
      setLastEvent('shrink');
    }, SHRINK_INTERVAL_MS);

    return () => { clearInterval(grow); clearInterval(shrink); };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-900 to-black text-white flex items-center justify-center p-6">
      <div className="max-w-6xl w-full bg-white/5 rounded-2xl p-8 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        {/* Text column */}
        <div className="order-2 md:order-1">
          <h1 className="text-4xl font-extrabold mb-4">SolPill — the pill addicted to Solana</h1>
          <p className="text-gray-300 mb-4">
            This pill <span className="font-semibold">needs SOL to grow</span>. It grows on incoming buys
            (simulated) and only dips slightly when it gets hungry again. Overall, it keeps getting bigger.
          </p>

          <ul className="text-gray-300 space-y-2 mb-6 list-disc ml-5">
            <li>Growth tick: every <span className="font-semibold">{GROW_INTERVAL_MS/1000}s</span> (+8%)</li>
            <li>Hunger dip: every <span className="font-semibold">{SHRINK_INTERVAL_MS/1000}s</span> (−3%)</li>
            <li>Amounts drawn from a realistic, heavy-tailed distribution.</li>
          </ul>

          <Stats totalSol={totalSol} scale={scale} lastEvent={lastEvent} />
        </div>

        {/* Pill column */}
        <div className="order-1 md:order-2 flex items-center justify-center">
          <PillVisualizer scale={scale} particles={particles} /* breathing enabled */ />
        </div>
      </div>
    </div>
  );
}

function Stats({ totalSol, scale, lastEvent }) {
  return (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 text-emerald-300 px-3 py-1 text-sm">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Feeds on <span className="font-semibold">SOL</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400">Simulated SOL eaten</div>
          <div className="text-xl font-bold">{totalSol.toFixed(2)} SOL</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400">Current scale</div>
          <div className="text-xl font-bold">{scale.toFixed(2)}×</div>
        </div>
      </div>
      <div className="text-xs text-gray-400">Last event: {lastEvent || '—'}</div>
    </div>
  );
}

function PillVisualizer({ scale, particles }) {
  return (
    <div className="relative w-full flex items-center justify-center">
      {/* outer halo */}
      <div className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full bg-emerald-400/10 blur-3xl animate-pulse" />

      <div
        className="transform transition-transform duration-700 ease-out mx-auto animate-[pulse_3s_ease-in-out_infinite]"
        style={{ transform: `scale(${scale})` }}
      >
        <img
          src={PILL_PUBLIC_SRC}
          alt="Pill"
          className="mx-auto w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-2xl select-none"
          draggable={false}
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
          className="mx-auto w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-700 flex items-center justify-center text-white font-bold"
        >
          Pill
        </div>
      </div>

      {/* Particles */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-emerald-300/90"
            style={{
              width: p.size,
              height: p.size,
              transform: `translate(${p.dx}px, ${p.dy}px)`,
              transition: `transform ${p.life}ms ease-out, opacity ${p.life}ms ease-out`,
              opacity: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
