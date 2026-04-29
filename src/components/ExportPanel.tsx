'use client';

import { useState } from 'react';
import { Run } from '@/lib/types';
import { encodeTeam, buildShareUrl } from '@/lib/share';

interface Props {
  run: Run;
  teamViewId: string;
}

export default function ExportPanel({ run, teamViewId }: Props) {
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExportPng() {
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const el = document.getElementById(teamViewId);
      if (!el) return;
      const canvas = await html2canvas(el, {
        backgroundColor: '#1f2937',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `${run.gameName}-team.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExporting(false);
    }
  }

  async function handleGenerateUrl() {
    if (run.team.length === 0) return;
    const base64 = await encodeTeam(run.team);
    const url = buildShareUrl(run.team, base64, { showTypes: true, showLevels: true });
    const full = `${window.location.origin}${url}`;
    setShareUrl(full);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mt-4">
      <h3 className="font-bold text-white mb-3">Export &amp; Share</h3>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleExportPng}
          disabled={exporting || run.team.length === 0}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {exporting ? '⏳ Exporting...' : '🖼 Export PNG'}
        </button>
        <button
          onClick={handleGenerateUrl}
          disabled={run.team.length === 0}
          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          🔗 Generate Share URL
        </button>
      </div>

      {shareUrl && (
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-xs text-gray-300 focus:outline-none"
            value={shareUrl}
            readOnly
          />
          <button
            onClick={handleCopy}
            className="bg-gray-600 hover:bg-gray-500 px-3 py-1.5 rounded text-sm transition-colors"
          >
            {copied ? '✓' : '📋'}
          </button>
        </div>
      )}
    </div>
  );
}
