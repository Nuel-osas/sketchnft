'use client';

import { useState, useEffect } from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';

export function CustomConnectButton() {
  const [mounted, setMounted] = useState(false);
  const account = useCurrentAccount();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="px-8 py-3.5 font-semibold text-base uppercase tracking-wider transition-all rounded-full shadow-lg backdrop-blur-xl border border-white/30 opacity-50"
        style={{ backgroundColor: '#36454F', color: '#FFFFFF' }}
        disabled
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="sui-connect-wrapper">
      <ConnectButton
        connectText="Connect Wallet"
        className="!px-8 !py-3.5 !font-semibold !text-base !uppercase !tracking-wider !transition-all !rounded-full !shadow-lg"
      />
      <style jsx global>{`
        .sui-connect-wrapper button {
          background-color: #36454F !important;
          color: #FFFFFF !important;
          border-radius: 9999px !important;
          padding: 14px 32px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
        }
        .sui-connect-wrapper button:hover {
          opacity: 0.9 !important;
          transform: scale(1.02) !important;
        }
      `}</style>
    </div>
  );
}
