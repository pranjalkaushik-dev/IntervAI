import React from 'react';
import { QrCode, Smartphone, ExternalLink, ShieldCheck } from 'lucide-react';

export default function QRCodeView({ roomCode, pairingUrl }) {
  const url = pairingUrl || `${window.location.origin}/proctor/camera?room=${roomCode || 'INT-DEMO'}`;

  return (
    <div className="flex flex-col items-center text-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mb-2">
        <Smartphone className="w-3.5 h-3.5 text-blue-600" />
        <span>Connect Secondary Mobile Camera</span>
      </div>
      <p className="text-[11px] text-slate-500 mb-3 max-w-[220px]">
        Scan with your phone to stream your side desk / workspace view for 360° proctoring.
      </p>

      {/* Styled SVG QR Graphic */}
      <div className="relative p-2.5 bg-white rounded-lg shadow-sm mb-3 border border-slate-200">
        <svg
          viewBox="0 0 120 120"
          className="w-32 h-32 text-slate-900"
          fill="currentColor"
        >
          {/* Outer corners / position anchors */}
          <rect x="10" y="10" width="30" height="30" rx="3" fill="#0f172a" />
          <rect x="15" y="15" width="20" height="20" rx="2" fill="#ffffff" />
          <rect x="20" y="20" width="10" height="10" rx="1" fill="#2563eb" />

          <rect x="80" y="10" width="30" height="30" rx="3" fill="#0f172a" />
          <rect x="85" y="15" width="20" height="20" rx="2" fill="#ffffff" />
          <rect x="90" y="20" width="10" height="10" rx="1" fill="#2563eb" />

          <rect x="10" y="80" width="30" height="30" rx="3" fill="#0f172a" />
          <rect x="15" y="85" width="20" height="20" rx="2" fill="#ffffff" />
          <rect x="20" y="90" width="10" height="10" rx="1" fill="#2563eb" />

          {/* Data patterns (simulated dense QR matrix) */}
          <rect x="48" y="12" width="6" height="6" fill="#0f172a" />
          <rect x="62" y="12" width="6" height="6" fill="#0f172a" />
          <rect x="48" y="24" width="6" height="6" fill="#0f172a" />
          <rect x="58" y="32" width="8" height="6" fill="#0f172a" />
          <rect x="12" y="48" width="6" height="6" fill="#0f172a" />
          <rect x="24" y="48" width="6" height="8" fill="#0f172a" />
          <rect x="36" y="48" width="8" height="6" fill="#0f172a" />
          <rect x="48" y="48" width="8" height="8" fill="#2563eb" />
          <rect x="62" y="48" width="6" height="6" fill="#0f172a" />
          <rect x="74" y="48" width="6" height="8" fill="#0f172a" />
          <rect x="88" y="48" width="8" height="6" fill="#0f172a" />
          <rect x="102" y="48" width="6" height="6" fill="#0f172a" />
          <rect x="48" y="62" width="6" height="8" fill="#0f172a" />
          <rect x="62" y="62" width="8" height="8" fill="#0f172a" />
          <rect x="76" y="62" width="6" height="6" fill="#0f172a" />
          <rect x="48" y="80" width="8" height="6" fill="#0f172a" />
          <rect x="62" y="80" width="6" height="8" fill="#0f172a" />
          <rect x="74" y="80" width="8" height="6" fill="#0f172a" />
          <rect x="88" y="80" width="6" height="6" fill="#0f172a" />
          <rect x="48" y="98" width="6" height="6" fill="#0f172a" />
          <rect x="60" y="94" width="8" height="8" fill="#0f172a" />
          <rect x="74" y="98" width="8" height="6" fill="#0f172a" />
          <rect x="92" y="94" width="6" height="8" fill="#0f172a" />
        </svg>

        {/* Center overlay badge */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <QrCode className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>End-to-End Encrypted WebRTC</span>
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-200 w-full flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Room: {roomCode}</span>
        <button type="button" onClick={() => navigator.clipboard?.writeText(url)} className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-1">Copy link <ExternalLink className="w-2.5 h-2.5" /></button>
      </div>
    </div>
  );
}
