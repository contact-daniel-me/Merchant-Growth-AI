import React, { useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import { Users, Send, CheckCircle2, ShieldCheck, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';

interface CustomerMarketingSegmentsCardProps {
  merchantId: string;
}

export const CustomerMarketingSegmentsCard: React.FC<CustomerMarketingSegmentsCardProps> = ({ merchantId }) => {
  const [segments, setSegments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedSegment, setSelectedSegment] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<any>(null);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    api.getCustomerSegments(merchantId)
      .then((data) => {
        if (isMounted) {
          setSegments(data);
          if (data.length > 0) setSelectedSegment(data[0]);
        }
      })
      .catch((err) => console.error('Failed to load segments:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [merchantId]);

  const handleOpenDraft = (seg: any) => {
    setSelectedSegment(seg);
    setDispatchResult(null);
    setIsModalOpen(true);
  };

  const handleConfirmDispatch = async () => {
    if (!selectedSegment) return;
    setIsDispatching(true);
    try {
      const res = await api.dispatchCampaign(merchantId, {
        segmentCode: selectedSegment.segmentCode,
        customMessage: selectedSegment.draftOfferText,
        approverName: 'Merchant Owner',
      });
      setDispatchResult(res);
    } catch (e) {
      console.error('Dispatch campaign failed:', e);
    } finally {
      setIsDispatching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-3">
        <div className="h-4 bg-slate-100 rounded w-1/3" />
        <div className="h-24 bg-slate-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#172B4D]">
              Targeted Customer Segmentation & Return Campaigns
            </h3>
            <p className="text-xs text-slate-500">
              Permission-aware promotional outreach based on actual purchase intervals
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 w-fit">
          Explainable Rules Engine
        </span>
      </div>

      {/* Segments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {segments.map((seg) => (
          <div
            key={seg.segmentCode}
            className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#002970]">{seg.segmentName}</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                  {seg.customerCount} customers
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{seg.definition}</p>
            </div>

            <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                Est. Send Cost: ₹{seg.estimatedDeliveryCost}
              </span>
              <button
                type="button"
                onClick={() => handleOpenDraft(seg)}
                className="py-1.5 px-3 bg-[#002970] hover:bg-[#001f55] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#00BAF2]" />
                <span>Prepare Offer</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Campaign Approval Modal */}
      {isModalOpen && selectedSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#00BAF2]" />
                <h4 className="text-sm font-bold text-slate-900">
                  Approve Marketing Campaign
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {!dispatchResult ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block uppercase">Target Segment</span>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">
                    {selectedSegment.segmentName} ({selectedSegment.customerCount} recipients)
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-500 block uppercase">Draft Message Content</span>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-sans text-slate-700 leading-relaxed mt-1">
                    "{selectedSegment.draftOfferText}"
                  </div>
                </div>

                <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200 text-[11px] text-blue-900 leading-relaxed">
                  🔒 Merchant authorization required. Messages will be dispatched with sanitized numbers via the connected WhatsApp Business Gateway.
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2 px-3 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDispatch}
                    disabled={isDispatching}
                    className="flex-1 py-2 px-3 bg-[#00BAF2] hover:bg-[#0099cc] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    {isDispatching ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Authorize & Dispatch</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-center py-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="font-bold text-slate-900 text-sm">Campaign Successfully Queued</div>
                <p className="text-slate-600 text-xs leading-relaxed">{dispatchResult.disclaimer}</p>
                <div className="p-2 bg-slate-50 rounded-lg text-[10px] font-mono text-slate-500 text-left">
                  Ref: {dispatchResult.campaignId} · Audit: {dispatchResult.auditId} · Provider: {dispatchResult.providerUsed}
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-2 px-4 bg-[#002970] text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
