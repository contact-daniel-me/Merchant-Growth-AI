import React, { useState } from 'react';
import { SettlementBatch } from '../types/index.ts';
import {
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  Building,
  HelpCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface SettlementReconciliationTabProps {
  settlements: SettlementBatch[];
  reconciliationIssues: any[];
  merchantId: string;
  onInitiateDispute: (batch: SettlementBatch) => void;
}

export const SettlementReconciliationTab: React.FC<SettlementReconciliationTabProps> = ({
  settlements,
  reconciliationIssues,
  merchantId,
  onInitiateDispute,
}) => {
  const [selectedBatch, setSelectedBatch] = useState<SettlementBatch | null>(null);

  return (
    <div className="space-y-6">
      {/* Overview reconciliation header card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Automated Settlement Reconciliation Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time cross-verification between Paytm Switch, Sponsor Banks (SBI / HDFC), and RBI NEFT/RTGS UTR records
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md">
            <span className="text-slate-500">Reconciled Rate: </span>
            <span className="font-mono font-bold text-emerald-700">97.4%</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md">
            <span className="text-slate-500">Active Issues: </span>
            <span className="font-mono font-bold text-amber-700">{reconciliationIssues.length}</span>
          </div>
        </div>
      </div>

      {/* Discrepancy Alert Box if issues found */}
      {reconciliationIssues.length > 0 && (
        <div className="space-y-3">
          {reconciliationIssues.map((issue, idx) => {
            const relatedBatch = settlements.find((s) => s.id === issue.batchId);
            return (
              <div
                key={idx}
                className="bg-amber-50/90 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-amber-900 text-sm">
                      {issue.type.replace('_', ' ')}: Variance of ₹{issue.varianceAmount.toLocaleString('en-IN')}
                    </div>
                    <div className="text-amber-800 mt-0.5 font-mono">
                      Batch {issue.batchId} · UTR: {issue.utr}
                    </div>
                    <div className="text-slate-600 mt-1">
                      {issue.explanation}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {relatedBatch && (
                    <button
                      onClick={() => onInitiateDispute(relatedBatch)}
                      className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-md shadow-xs transition-colors whitespace-nowrap"
                    >
                      Draft Dispute Investigation
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Settlement Batches Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Settlement Batches & Bank Disbursal Ledger
          </h3>
          <span className="text-xs text-slate-500 font-mono">Auto EOD Cutoff: 23:00 IST</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-2.5 px-4">Batch ID & Date</th>
                <th className="py-2.5 px-4">Bank & UTR Number</th>
                <th className="py-2.5 px-4 text-right">Gross Collections</th>
                <th className="py-2.5 px-4 text-right">MDR & GST Deductions</th>
                <th className="py-2.5 px-4 text-right">Net Disbursed</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {settlements.map((s) => (
                <tr
                  key={s.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    s.status === 'PARTIAL' || s.status === 'DELAYED' ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="font-mono font-semibold text-slate-900">{s.id}</div>
                    <div className="text-[11px] text-slate-500">{s.settlementDate} ({s.transactionCount} txns)</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{s.bankAccount}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">{s.utrNumber}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                    ₹{s.grossAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500">
                    -₹{(s.totalMdrFee + s.totalGst).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#002970]">
                    ₹{s.netDisbursedAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {s.status === 'SETTLED' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Reconciled</span>
                      </span>
                    ) : s.status === 'IN_TRANSIT' ? (
                      <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span>In-Transit</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                        <ShieldAlert className="w-3 h-3 text-amber-600" />
                        <span>{s.status}</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedBatch(s)}
                      className="text-[#002970] font-semibold hover:underline"
                    >
                      Audit Trail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Audit Trail Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Settlement Batch Reconciliation Audit
              </h3>
              <button
                onClick={() => setSelectedBatch(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 font-mono">
              <div className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Batch Identifier:</span>
                  <span className="font-bold text-slate-900">{selectedBatch.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank UTR Reference:</span>
                  <span className="font-bold text-slate-900">{selectedBatch.utrNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Destination Account:</span>
                  <span className="text-slate-900">{selectedBatch.bankAccount}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 text-slate-700">
                <div className="flex justify-between">
                  <span>Gross Collections:</span>
                  <span>₹{selectedBatch.grossAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Merchant Discount Rate (MDR):</span>
                  <span>-₹{selectedBatch.totalMdrFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST on MDR (18%):</span>
                  <span>-₹{selectedBatch.totalGst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-[#002970] text-sm">
                  <span>Net Disbursed to Merchant:</span>
                  <span>₹{selectedBatch.netDisbursedAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {selectedBatch.varianceAmount && selectedBatch.varianceAmount > 0 && (
                <div className="bg-amber-50 p-3 rounded-md border border-amber-200 text-amber-900 font-sans">
                  <div className="font-bold">Detected Variance: ₹{selectedBatch.varianceAmount}</div>
                  <div className="text-xs text-amber-800 mt-1">{selectedBatch.varianceNote}</div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end gap-2">
              {selectedBatch.status === 'PARTIAL' && (
                <button
                  onClick={() => {
                    onInitiateDispute(selectedBatch);
                    setSelectedBatch(null);
                  }}
                  className="px-3 py-1.5 bg-amber-700 text-white font-semibold rounded-md hover:bg-amber-800"
                >
                  Raise Settlement Dispute
                </button>
              )}
              <button
                onClick={() => setSelectedBatch(null)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
