'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Plus, RefreshCw, Flame, Clock, Eye, AlertCircle, Gauge, Download, Lock } from 'lucide-react';
import { MonitoredVideoRecord } from '@/lib/analytics/vph';
import { PlanTier } from '@/lib/credits/deduct';
import { apiFetch } from '@/lib/api-client';
import {
  QueryConfirmationModal,
  QueryConfirmationDetails,
  isConfirmationSkipped,
} from '@/components/QueryConfirmationModal';

interface VphTrackerProps {
  creditBalance: number;
  planTier: PlanTier;
  onOpenUpgradeModal: () => void;
  onCreditDeducted: (newBalance: number) => void;
  onInsufficientCredits: () => void;
}

export function VphTracker({
  creditBalance,
  planTier,
  onOpenUpgradeModal,
  onCreditDeducted,
  onInsufficientCredits,
}: VphTrackerProps) {
  const [videos, setVideos] = useState<MonitoredVideoRecord[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDetails, setConfirmDetails] = useState<QueryConfirmationDetails | null>(null);

  const isPro = planTier === 'pro_299';

  const fetchVideos = async () => {
    try {
      const res = await apiFetch('/api/analytics/vph');
      const data = await res.json();
      if (res.ok && data.videos) {
        setVideos(data.videos);
      }
    } catch {
      // Ignore initial fetch error
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const executeAddVideo = async (targetUrl: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/analytics/vph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: targetUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402 || data.code === 'INSUFFICIENT_CREDITS') {
          onInsufficientCredits();
          setError('You ran out of credits! (50 required for 48-hour monitoring). Please click the Upgrade button.');
          return;
        }
        throw new Error(data.error || 'Failed to add video to monitoring.');
      }

      setVideoUrl('');
      if (typeof data.remainingCredits === 'number') {
        onCreditDeducted(data.remainingCredits);
      }
      await fetchVideos();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    if (isConfirmationSkipped()) {
      executeAddVideo(videoUrl.trim());
      return;
    }

    setConfirmDetails({
      toolName: '48-Hour Velocity Speedometer (VPH)',
      querySummary: videoUrl.trim(),
      creditCost: 50,
      onConfirm: () => executeAddVideo(videoUrl.trim()),
      features: [
        'Enrolls video into active background velocity polling for 48 hours',
        'Calculates real-time Views Per Hour (VPH) velocity index',
        'Detects real-time algorithm breakout spikes or sudden plateauing',
        'Unlimited manual telemetry refreshes during monitoring window',
      ],
    });
  };

  const handleRefresh = async (recordId: string) => {
    setRefreshingId(recordId);
    try {
      const res = await apiFetch('/api/analytics/vph', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setVideos((prev) =>
          prev.map((v) => (v.id === recordId ? data.data : v))
        );
      }
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshingId(null);
    }
  };

  // CSV Export Handler
  const handleExportCsv = async () => {
    if (!isPro) {
      onOpenUpgradeModal();
      return;
    }

    setExporting(true);
    try {
      const res = await apiFetch('/api/export-csv?type=vph');
      if (!res.ok) {
        throw new Error('Export failed. Please ensure you are an active Pro subscriber.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `youtube_vph_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setError(err.message || 'CSV export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Light Card Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold mb-2">
              <Activity className="w-3.5 h-3.5" />
              <span>Tool #3: Real-Time View Speedometer</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Measure How Fast Videos Are Gaining Views Right Now
            </h2>
            <p className="text-slate-600 text-sm mt-1 max-w-2xl">
              Total views can be misleading because old videos accumulate views over years.
              <strong> Views Per Hour (VPH)</strong> shows true real-time speed.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 self-start md:self-auto text-slate-700">
            <span>Cost:</span>
            <span className="text-amber-600 font-bold">50 credits (48-hour watch)</span>
          </div>
        </div>

        {/* Speedometer Explanation Box */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mt-6 flex items-start gap-3 text-xs text-slate-700">
          <Gauge className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900 block mb-0.5">The Speedometer Analogy:</span>
            <span>
              Think of total views like total miles on a car's odometer, and Views Per Hour like the speedometer.
              If a video is clocking <strong>300+ views every hour</strong>, that means YouTube is actively pushing it
              to viewer homepages right now!
            </span>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAddVideo} className="mt-6 flex flex-col sm:flex-row gap-3">
          <input
            id="vph-video-input"
            type="text"
            placeholder="Paste a YouTube video link to measure its real-time speed..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-rose-500 focus:bg-white"
          />
          <button
            id="vph-submit-btn"
            type="submit"
            disabled={loading || !videoUrl.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all disabled:opacity-50 shadow-sm whitespace-nowrap"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>Track Speed (48h)</span>
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Notice</p>
              <p className="text-xs text-rose-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tracked Videos Header with Bulk CSV Export Button */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Currently Monitored Videos ({videos.length})
          </h3>

          <div className="flex items-center gap-2.5">
            {/* Bulk CSV Export Button */}
            <button
              id="csv-export-btn"
              onClick={handleExportCsv}
              disabled={exporting}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                isPro
                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300 cursor-pointer'
              }`}
              title={isPro ? 'Download all tracked videos as a CSV spreadsheet' : 'Upgrade to Pro (₹299/mo) to unlock CSV export'}
            >
              {isPro ? (
                <>
                  <Download className={`w-3.5 h-3.5 text-indigo-600 ${exporting ? 'animate-bounce' : ''}`} />
                  <span>{exporting ? 'Exporting...' : 'Export to CSV'}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Bulk Export to CSV</span>
                  <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 text-[9px] font-bold rounded">
                    PRO
                  </span>
                </>
              )}
            </button>

            {/* Refresh List */}
            <button
              onClick={fetchVideos}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors font-medium px-2 py-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh List</span>
            </button>
          </div>
        </div>

        {videos.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 shadow-sm">
            <Gauge className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-slate-800 font-bold text-base">No Videos Being Tracked Yet</h4>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              Paste a video link into the box above to start measuring its real-time view speed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((item) => {
              const isRefreshing = refreshingId === item.id;
              const isHighVelocity = item.current_vph >= 100;
              return (
                <div
                  key={item.id}
                  className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4 relative group"
                >
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    <div className="w-28 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 relative">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Eye className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-2">{item.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          {item.latest_view_count.toLocaleString()} views
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          Tracked since: {new Date(item.initial_timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Velocity Display & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    {/* VPH Badge */}
                    <div
                      id={`vph-badge-${item.video_id}`}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                        isHighVelocity
                          ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs'
                          : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      }`}
                    >
                      <Flame className={`w-3.5 h-3.5 ${isHighVelocity ? 'text-amber-600 animate-pulse' : 'text-emerald-600'}`} />
                      <span>
                        {item.current_vph > 0
                          ? `🔥 ${item.current_vph.toLocaleString()} views/hr`
                          : 'Checking initial speed...'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRefresh(item.id)}
                      disabled={isRefreshing}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50 border border-slate-200"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span>{isRefreshing ? 'Checking...' : 'Check Speed'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Query Cost Confirmation Modal */}
      <QueryConfirmationModal
        isOpen={!!confirmDetails}
        onClose={() => setConfirmDetails(null)}
        details={confirmDetails}
        currentBalance={creditBalance}
        onOpenUpgradeModal={onOpenUpgradeModal}
      />
    </div>
  );
}
