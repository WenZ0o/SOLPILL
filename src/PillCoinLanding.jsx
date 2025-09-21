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

// ---------- ENV HANDLING ----------
const viteEnv = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const craEnv =
  typeof process !== 'undefined' && typeof process.env !== 'undefined'
    ? process.env
    : {};
const ENV = { ...viteEnv, ...craEnv };

const RPC_URL =
  ENV.VITE_SOLANA_RPC ||
  ENV.REACT_APP_SOLANA_RPC ||
  'https://api.mainnet-beta.solana.com';
const TARGET_ADDRESS =
  ENV.VITE_TARGET_ADDRESS ||
  ENV.REACT_APP_TARGET_ADDRESS ||
  'REPLACE_WITH_TARGET_ADDRESS';
const FEED_THRESHOLD = (() => {
  const raw =
    ENV.VITE_FEED_THRESHOLD || ENV.REACT_APP_FEED_THRESHOLD || '0.5';
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0.5;
})();
const BUY_LINK =
  ENV.VITE_PUMP_URL || ENV.REACT_APP_PUMP_URL || 'https://pump.fun';
const IS_DEV = Boolean(viteEnv?.DEV || (craEnv?.NODE_ENV !== 'production'));

// ---------- Helpers ----------
const LAMPORTS_PER_SOL = 1_000_000_000;
const lamportsToSol = (lamports) => lamports / LAMPORTS_PER_SOL;
const computeScale = (feeds) =>
  1 + Math.log(1 + Math.max(0, feeds)) * 0.6;

function EnvWarning() {
  const missing = [];
  if (!ENV.VITE_SOLANA_RPC && !ENV.REACT_APP_SOLANA_RPC)
    missing.push('SOLANA_RPC');
  if (!ENV.VITE_TARGET_ADDRESS && !ENV.REACT_APP_TARGET_ADDRESS)
    missing.push('TARGET_ADDRESS');
  const info =
    !ENV.VITE_FEED_THRESHOLD && !ENV.REACT_APP_FEED_THRESHOLD
      ? 'FEED_THRESHOLD (default 0.5 used)'
      : null;

  if (missing.length === 0 && !info) return null;
  return (
    <div className="mt-4 text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 rounded-md p-3">
      <div className="font-semibold mb-1">Environment configuration</div>
      {missing.length > 0 && (
        <p>
          Missing: <span className="font-mono">{missing.join(', ')}</span>. Set
          in your <span className="font-mono">.env</span>.
        </p>
      )}
      {info && <p className="mt-1">Info: {info}.</p>}
    </div>
  );
}

function PillVisualizer({ scale, feeds }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-64 h-64 flex items-center justify-center">
        <div
          className="transform transition-transform duration-700 ease-out"
          style={{ transform: `scale(${scale})` }}
        >
          <img
            src="/assets/pill.png"
            alt="Pill"
            className="w-48 h-48 object-contain drop-shadow-2xl"
          />
        </div>
        <div className="absolute inset-0 rounded-full opacity-20 animate-pulse" />
      </div>

      <div className="text-center">
        <h3 className="text-2xl font-semibold">The SolPill needs to grow</h3>
        <p className="text-sm text-gray-400">
          Every buy ≥ {FEED_THRESHOLD} SOL feeds the pill — it gets thicker.
        </p>
      </div>

      <div className="flex gap-4 items-center">
        <div className="bg-white/5 px-4 py-2 rounded-md">
          Feeds: <span className="font-bold ml-2">{feeds}</span>
        </div>
        <div className="bg-white/5 px-4 py-2 rounded-md">
          Scale: <span className="font-bold ml-2">{scale.toFixed(2)}x</span>
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
        <a
          href={BUY_LINK}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 bg-indigo-600 rounded-md text-white font-semibold hover:bg-indigo-700"
        >
          Buy on pump.fun
        </a>
        <button
          onClick={onSimulate}
          className="px-4 py-2 bg-green-600 rounded-md text-white font-semibold hover:bg-green-700"
        >
          Simulate Feed
        </button>
      </div>
      <div className="text-sm text-gray-400">
        {publicKey ? `Connected: ${publicKey.toBase58()}` : 'Wallet not connected'}
      </div>
    </div>
  );
}

export default function PillCoinLanding() {
  const wallets = useMemo(
    () => (typeof window !== 'undefined' ? [new PhantomWalletAdapter()] : []),
    []
  );
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

  useEffect(() => {
    setScale(computeScale(feeds));
  }, [feeds]);

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
            <p>
              Threshold: Every buy of{' '}
              <span className="font-semibold">{FEED_THRESHOLD} SOL</span> or more feeds the pill.
            </p>
            <p className="mt-2">
              Last feed: {lastFeedAt ? new Date(lastFeedAt).toLocaleString() : 'None yet'}
            </p>
          </div>
          <EnvWarning />
        </div>
        <div className="flex flex-col justify-between">
          <div>
            <h1 className="text-4xl font-extrabold mb-4">
              SolPill — the pill addicted to Solana
            </h1>
            <p className="text-gray-300 mb-6">
              Buyers feed the pill with every purchase ≥ {FEED_THRESHOLD} SOL. The pill grows —
              and everyone watches.
            </p>
            <ul className="list-disc ml-5 text-gray-300 space-y-2">
              <li>Created on pump.fun</li>
              <li>Connect via Phantom or AxiomPro-compatible wallets</li>
              <li>Live visualization of feeds</li>
            </ul>
          </div>
          <div className="mt-6">
            <ConnectAndControls onSimulate={simulateFeed} />
            <div className="mt-6 text-xs text-gray-400">
              <strong>Note:</strong> This page is a live visualization. For reliable tracking, use
              pump.fun webhooks or a Solana indexer.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

