'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_V2 } from '@/lib/apiBase';

interface VerificationState {
  status: 'unverified' | 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  submittedAt: string | null;
  documents: { idDocument: string | null; vehicleDocument: string | null };
}

export default function RiderVerificationPage() {
  const [state, setState] = useState<VerificationState | null>(null);
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [vehicleDocument, setVehicleDocument] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_V2}/riders/verification`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(20000),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) setState(body?.data || null);
      else setError(body?.message || 'Could not load your verification status.');
    } catch {
      setError('Network error while loading your verification status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const upload = async () => {
    setError('');
    setNotice('');
    if (!idDocument || !vehicleDocument) {
      setError('Please choose both an ID document and a vehicle document.');
      return;
    }
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('idDocument', idDocument);
      form.append('vehicleDocument', vehicleDocument);
      const res = await fetch(`${API_V2}/riders/verification/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: AbortSignal.timeout(60000),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.message || 'Upload failed. Please check the files and try again.');
        return;
      }
      setState(body?.data || null);
      setNotice('Documents submitted. An admin will review them shortly.');
      setIdDocument(null);
      setVehicleDocument(null);
    } catch {
      setError('Network error while uploading. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const badge = (status: string) => ({
    unverified: { text: 'Not submitted', bg: '#FFF1E8', color: '#B45309' },
    pending: { text: 'Pending review', bg: '#EFF6FF', color: '#1D4ED8' },
    approved: { text: 'Approved', bg: '#F0FDF4', color: '#15803D' },
    rejected: { text: 'Rejected', bg: '#FEF2F2', color: '#D32F2F' },
  }[status] || { text: status, bg: '#F5F5F5', color: '#636366' });

  return (
    <div className="min-h-screen bg-[#FFF8F0] py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 border border-[#F0EAE0] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-[#1C1C1E]">Rider Verification</h1>
          <Link href="/rider-dashboard" className="text-sm font-semibold text-[#E8621A]">Back to dashboard</Link>
        </div>

        {loading && <p className="text-sm text-[#636366]">Loading…</p>}

        {!loading && state && (
          <>
            <div className="mb-6 p-4 rounded-2xl" style={{ background: badge(state.status).bg, color: badge(state.status).color }}>
              <p className="font-bold">{badge(state.status).text}</p>
              {state.status === 'rejected' && state.rejectionReason && (
                <p className="text-sm mt-1">Reason: {state.rejectionReason}</p>
              )}
              {state.status === 'pending' && (
                <p className="text-sm mt-1">Your documents are queued for admin review.</p>
              )}
              {state.status === 'approved' && (
                <p className="text-sm mt-1">You can go online and accept deliveries.</p>
              )}
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-[#A0A0A0] mb-1 block">ID document (PDF, JPEG or PNG, max 5MB)</label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => setIdDocument(e.target.files?.[0] || null)}
                  className="block w-full text-sm"
                />
                {state.documents.idDocument && <p className="text-xs text-[#15803D] mt-1">A document is already on file.</p>}
              </div>
              <div>
                <label className="text-xs text-[#A0A0A0] mb-1 block">Vehicle document (PDF, JPEG or PNG, max 5MB)</label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => setVehicleDocument(e.target.files?.[0] || null)}
                  className="block w-full text-sm"
                />
                {state.documents.vehicleDocument && <p className="text-xs text-[#15803D] mt-1">A document is already on file.</p>}
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-[#D32F2F] bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl px-4 py-3 mb-4">{error}</p>
            )}
            {notice && (
              <p role="status" className="text-sm text-[#15803D] bg-[#F0FDF4] border border-[#86EFAC] rounded-xl px-4 py-3 mb-4">{notice}</p>
            )}

            <button
              onClick={upload}
              disabled={uploading || state.status === 'approved' || !idDocument || !vehicleDocument}
              className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
            >
              {uploading ? 'Uploading…' : state.status === 'approved' ? 'Verified' : 'Submit Documents'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
