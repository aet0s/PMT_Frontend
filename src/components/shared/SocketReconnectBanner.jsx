// client/src/components/shared/SocketReconnectBanner.jsx
import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useSocket } from '../../context/SocketProvider';

export function SocketReconnectBanner() {
  const { isConnected } = useSocket();

  if (isConnected) return null;

  return (
    <div
      role="alert"
      className="w-full bg-warning-tint border-b border-warning/30 text-warning-text px-4 py-2 flex items-center justify-center gap-2.5 text-xs font-medium select-none shadow-sm transition-all"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Reconnecting to live sync server... Updates will resume automatically.</span>
      <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 ml-1" />
    </div>
  );
}

export default SocketReconnectBanner;
