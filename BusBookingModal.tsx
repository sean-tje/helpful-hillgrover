import React, { useState, useEffect } from 'react';
import { BusBookingData } from '../types';
import { Bus, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react';

interface BusBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  programmeTitle: string;
  startDate: string;
  startTime?: string;
  endTime?: string;
  venue: string;
}

export const BusBookingModal: React.FC<BusBookingModalProps> = ({
  isOpen,
  onClose,
  programmeTitle,
  startDate,
  startTime,
  endTime,
  venue,
}) => {
  const [copied, setCopied] = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [summaryText, setSummaryText] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/bus-booking/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programmeTitle,
          startDate,
          startTime: startTime || '07:30',
          endTime: endTime || '17:00',
          venue,
          pax: 120,
          contactTeacher: 'Mdm Sarah Lee',
        }),
      })
        .then(res => res.json())
        .then(data => {
          setPrefilledUrl(data.prefilledUrl);
          setSummaryText(data.summaryText);
        })
        .catch(err => console.error(err));
    }
  }, [isOpen, programmeTitle, startDate, startTime, endTime, venue]);

  if (!isOpen) return null;

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 text-slate-900">
            <Bus className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base">Hillgrove FormSG Bus Booking</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg font-bold">
            &times;
          </button>
        </div>

        <p className="text-xs text-slate-600">
          The system detects transport is required and pre-fills Hillgrove's official <strong>FormSG</strong> bus booking parameters automatically.
        </p>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
          <div className="font-bold text-slate-800">Pre-filled FormSG Transport Summary:</div>
          <pre className="text-[11px] whitespace-pre-wrap font-sans text-slate-700 bg-white p-3 rounded border border-slate-200">
            {summaryText || 'Preparing bus parameters...'}
          </pre>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            onClick={handleCopySummary}
            className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy FormSG Summary'}</span>
          </button>

          <a
            href={prefilledUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-2xs"
          >
            <span>Open Pre-Filled FormSG Form</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
