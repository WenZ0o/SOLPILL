/*
PillCoinLanding.jsx (EN)
React + Tailwind landing page for the "Pill" memecoin concept.

Why this rewrite?
- Fixes typical Vite/CRA build errors (unavailable env vars, "process is not defined", and wallet adapter import issues).
- Uses the correct Phantom adapter package, adds UI CSS import, and avoids SSR pitfalls.
- Adds safe env fallbacks so missing .env won’t crash the build.
- Includes lightweight dev tests for helpers.

How to use:
1) Install deps in your React project:
   npm i @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-base @solana/wallet-adapter-phantom
   (and TailwindCSS configured in the host app)
2) Put the pill image at /public/assets/pill.png (or change the path below).
3) Set env vars (CRA or Vite):
   - CRA:  REACT_APP_SOLANA_RPC, REACT_APP_TARGET_ADDRESS, REACT_APP_FEED_THRESHOLD, REACT_APP_PUMP_URL (optional)
   - Vite: VITE_SOLANA_RPC, VITE_TARGET_ADDRESS, VITE_FEED_THRESHOLD, VITE_PUMP_URL (optional)
4) This page does NOT execute buys; it links to pump.fun. For reliable counting, prefer webhooks/indexer over client polling.
*/

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
// Use bundled image import so it works locally & on Vercel regardless of base path
import pillImg from './assets/pill.png';

// ---------- ENV HANDLING (works with CRA and Vite) ----------
const viteEnv = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const craEnv = (typeof process !== 'undefined' && typeof process.env !== 'undefined') ? process.env : {};
const ENV = { ...viteEnv, ...craEnv };
const RPC_URL = ENV.VITE_SOLANA_RPC || ENV.REACT_APP_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const TARGET_ADDRESS = ENV.VITE_TARGET_ADDRESS || ENV.REACT_APP_TARGET_ADDRESS || 'REPLACE_WITH_TARGET_ADDRESS';
const FEED_THRESHOLD = (() => {
  const raw = ENV.VITE_FEED_THRESHOLD || ENV.REACT_APP_FEED_THRESHOLD || '0.5';
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0.5;
})();
const BUY_LINK = ENV.VITE_PUMP_URL || ENV.REACT_APP_PUMP_URL || 'https://pump.fun';
const IS_DEV = Boolean(viteEnv?.DEV || (craEnv?.NODE_ENV !== 'production'));

// ---------- Helpers ----------
const LAMPORTS_PER_SOL = 1_000_000_000;
const lamportsToSol = (lamports) => lamports / LAMPORTS_PER_SOL;
const computeScale = (feeds) => 1 + Math.log(1 + Math.max(0, feeds)) * 0.6; // monotonic, diminishing returns

// Lightweight dev tests (won't affect prod)
if (typeof window !== 'undefined' && IS_DEV) {
  console.assert(lamportsToSol(1_000_000_000) === 1, 'lamportsToSol(1e9) should be 1 SOL');
  console.assert(FEED_THRESHOLD > 0, 'FEED_THRESHOLD must be positive');
  console.assert(computeScale(0) === 1, 'computeScale(0) should be base 1');
  console.assert(computeScale(10) > computeScale(5), 'computeScale should be increasing');
}

function EnvWarning() {
  const missing = [];
  if (!ENV.VITE_SOLANA_RPC && !ENV.REACT_APP_SOLANA_RPC) missing.push('SOLANA_RPC');
  if (!ENV.VITE_TARGET_ADDRESS && !ENV.REACT_APP_TARGET_ADDRESS) missing.push('TARGET_ADDRESS');
  const info = (!ENV.VITE_FEED_THRESHOLD && !ENV.REACT_APP_FEED_THRESHOLD) ? 'FEED_THRESHOLD (default 0.5 used)' : null;
  if (missing.length === 0 && !info) return null;
  return (
    <div className="mt-4 text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 rounded-md p-3">
      <div className="font-semibold mb-1">Environment configuration</div>
      {missing.length > 0 && (
        <p>Missing: <span className="font-mono">{missing.join(', ')}</span>. Set in your <span className="font-mono">.env</span>:
          <br/><span className="font-mono">REACT_APP_SOLANA_RPC / VITE_SOLANA_RPC</span>, <span className="font-mono">REACT_APP_TARGET_ADDRESS / VITE_TARGET_ADDRESS</span>.</p>
      )}
      {info && <p className="mt-1">Info: {info}.</p>}
    </div>
  );
}

function PillVisualizer({ scale, feeds }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-64 h-64 flex items-center justify-center">
        <div className="transform transition-transform duration-700 ease-out" style={{ transform: `scale(${scale})` }}>
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
          {/* Fallback badge if image fails to load */}
          <div id="pill-fallback" style={{ display: 'none' }} className="mx-auto w-48 h-48 rounded-full bg-gradient-to-br from-green-400 to-emerald-700 flex items-center justify-center text-white font-bold">
            Pill
          </div>
        </div>
        </div>
    </div>
  );
}

function ConnectAndControls({ onSimulate }) {
  const { publicKey } = useWallet();
  return (
    <div className="flex flex-col items-center gap-4">
      <WalletMultiButton />
      <div className="flex gap-3">
        <a href={BUY_LINK} target="_blank" rel="noreferrer" className="px-4 py-2 bg-indigo-600 rounded-md text-white font-semibold hover:bg-indigo-700">Buy on pump.fun</a>
        <button onClick={onSimulate} className="px-4 py-2 bg-green-600 rounded-md text-white font-semibold hover:bg-green-700">Simulate Feed</button>
      </div>
      <div className="text-sm text-gray-400">{publicKey ? `Connected: ${publicKey.toBase58()}` : 'Wallet not connected'}</div>
    </div>
  );
}

export default function PillCoinLanding() {
  // Avoid SSR issues (e.g., Next.js) by only creating adapters in the browser
  const wallets = useMemo(() => (typeof window !== 'undefined' ? [new PhantomWalletAdapter()] : []), []);
  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <MainPage />
      </WalletProvider>
    </ConnectionProvider>
  );
}

function MainPage() {
  const [feeds, setFeeds] = useState(0);
  const [scale, setScale] = useState(1);
  const [lastFeedAt, setLastFeedAt] = useState(null);
  const [connError, setConnError] = useState(null);

  // Lazily init connection to prevent build-time issues in SSR
  const [connection, setConnection] = useState(null);
  useEffect(() => {
    try {
      setConnection(new Connection(RPC_URL, 'confirmed'));
    } catch (e) {
      setConnError(String(e?.message || e));
    }
  }, []);

  // Scale grows with diminishing returns
  useEffect(() => {
    setScale(computeScale(feeds));
  }, [feeds]);

  // Polling guideline for TARGET_ADDRESS (no-op if placeholder or connection missing)
  useEffect(() => {
    if (!connection) return;
    if (!TARGET_ADDRESS || TARGET_ADDRESS === 'REPLACE_WITH_TARGET_ADDRESS') return;

    let isMounted = true;
    let cursor = null; // latest signature we saw
    const targetPubkey = new PublicKey(TARGET_ADDRESS);

    async function poll() {
      try {
        const sigs = await connection.getSignaturesForAddress(targetPubkey, cursor ? { before: cursor, limit: 20 } : { limit: 20 });
        if (sigs.length > 0) {
          cursor = sigs[0].signature;
          for (const s of sigs.reverse()) {
            const tx = await connection.getTransaction(s.signature, { commitment: 'confirmed' });
            const meta = tx?.meta;
            const message = tx?.transaction?.message;
            if (!meta || !message) continue;
            const keys = message.accountKeys.map((k) => k.toString());
            const idx = keys.indexOf(targetPubkey.toString());
            if (idx === -1) continue;
            const diffLamports = meta.postBalances[idx] - meta.preBalances[idx];
            const diffSol = lamportsToSol(diffLamports);
            if (diffSol >= FEED_THRESHOLD) {
              if (!isMounted) return;
              setFeeds((prev) => prev + 1);
              setLastFeedAt(new Date().toISOString());
            }
          }
        }
      } catch (e) {
        if (IS_DEV) console.warn('Polling error:', e);
      }
      if (isMounted) setTimeout(poll, 5000);
    }

    poll();
    return () => { isMounted = false; };
  }, [connection]);

  const simulateFeed = useCallback(() => {
    setFeeds((prev) => prev + 1);
    setLastFeedAt(new Date().toISOString());
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-900 to-black text-white flex items-center justify-center p-6">
      <div className="max-w-5xl w-full bg-white/5 rounded-2xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col justify-center gap-6">
          <PillVisualizer scale={scale} feeds={feeds} />

          <div className="mt-4 text-sm text-gray-300">
            <p>Threshold: Every buy of <span className="font-semibold">{FEED_THRESHOLD} SOL</span> or more feeds the pill.</p>
            <p className="mt-2">Last feed: {lastFeedAt ? new Date(lastFeedAt).toLocaleString() : 'None yet'}</p>
          </div>

          <EnvWarning />

          {connError && (
            <div className="mt-3 text-xs bg-red-500/10 border border-red-500/30 text-red-200 rounded-md p-3">
              <div className="font-semibold">RPC connection error</div>
              <div className="break-all">{connError}</div>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <h1 className="text-4xl font-extrabold mb-4">SolPill — the pill addicted to Solana</h1>
            <p className="text-gray-300 mb-6">Buyers feed the pill with every purchase ≥ {FEED_THRESHOLD} SOL. The pill grows — and everyone watches.</p>
            <ul className="list-disc ml-5 text-gray-300 space-y-2">
              <li>Created on pump.fun</li>
              <li>Traders can connect via Phantom or AxiomPro-compatible wallets</li>
              <li>Live visualization of feeds</li>
            </ul>
          </div>

          <div className="mt-6">
            <ConnectAndControls onSimulate={simulateFeed} />
            <div className="mt-6 text-xs text-gray-400"><strong>Note:</strong> This page is a live visualization. For robust tracking, set up pump.fun webhooks or a dedicated Solana indexer so all eligible buys are detected reliably.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
