import React, { useState } from 'react';
import { MerchantAction, AuditLogEntry, ActionStatus } from '../types/index.ts';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
  Shield,
  FileCheck,
  Send,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface ActionCenterTabProps {
  actions: MerchantAction[];
  auditLogs: AuditLogEntry[];
  onApproveAction: (actionId: string) => Promise<void>;
  onRejectAction: (actionId: string) => Promise<void>;
  onExecuteAction: (actionId: string) => Promise<void>;
}

export const ActionCenterTab: React.FC<ActionCenterTabProps> = ({
  actions,
  auditLogs,
  onApproveAction,
  onRejectAction,
  onExecuteAction,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ACTIONS' | 'AUDIT_TRAIL'>('ACTIONS');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [processingActionId, setProcessingActionId] = useState<string | null>(null);

  const filteredActions = actions.filter((a) =>
    filterStatus === 'ALL' ? true : a.status === filterStatus
  );

  const handleAction = async (actionId: string, type: 'APPROVE' | 'REJECT' | 'EXECUTE') => {
    setProcessingActionId(actionId);
    try {
      if (type === 'APPROVE') await onApproveAction(actionId);
      else if (type === 'REJECT') await onRejectAction(actionId);
      else if (type === 'EXECUTE') await onExecuteAction(actionId);
    } finally {
      setProcessingActionId(null);
    }
  };

  const getStatusBadge = (status: ActionStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Draft</span>
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
            <Clock className="w-3 h-3 text-blue-600" />
            <span>In Review</span>
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Merchant Approval</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Approved (Ready to Execute)</span>
          </span>
        );
      case 'EXECUTED':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Executed & Logged</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
            <span>Rejected</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Toggle Navigation */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Merchant Action Governance & Audit Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict Action Lifecycle: Draft → Review → Merchant Approval → Backend Execution → Immutable Audit Log.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-md text-xs">
          <button
            onClick={() => setActiveSubTab('ACTIONS')}
            className={`px-3 py-1.5 font-semibold rounded transition-colors ${
              activeSubTab === 'ACTIONS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Action Lifecycle ({actions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('AUDIT_TRAIL')}
            className={`px-3 py-1.5 font-semibold rounded transition-colors ${
              activeSubTab === 'AUDIT_TRAIL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Immutable Audit Trail ({auditLogs.length})
          </button>
        </div>
      </div>

      {activeSubTab === 'ACTIONS' ? (
        <div className="space-y-4">
          {/* Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
            <span className="text-slate-500 mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter by State:
            </span>
            {['ALL', 'PENDING_APPROVAL', 'APPROVED', 'DRAFT', 'EXECUTED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-colors ${
                  filterStatus === st ? 'bg-[#002970] text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All Lifecycle Stages' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Action Cards List */}
          <div className="space-y-3">
            {filteredActions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-500">
                No actions found matching the selected state filter.
              </div>
            ) : (
              filteredActions.map((action) => (
                <div
                  key={action.id}
                  className={`bg-white border rounded-lg p-5 transition-all ${
                    action.status === 'PENDING_APPROVAL'
                      ? 'border-amber-300 ring-1 ring-amber-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-600 font-semibold">{action.id}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          {action.type.replace('_', ' ')}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-[11px] text-slate-600">
                          Origin: {action.createdBy === 'VOICE_AGENT' ? 'Voice Agent (Sarvam / Gemini)' : 'Merchant'}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-bold text-slate-900">
                        {action.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600">
                        {action.description}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      {getStatusBadge(action.status)}
                      <div className="text-[11px] font-mono text-slate-600 mt-1">
                        {new Date(action.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Payload Details */}
                  {action.payload && Object.keys(action.payload).length > 0 && (
                    <div className="mt-3.5 p-3 bg-slate-50 rounded-md border border-slate-200/80 text-xs font-mono">
                      <div className="text-[11px] text-slate-600 uppercase tracking-wider font-semibold font-sans mb-1.5">
                        Action Parameters & Payload Data:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                        {Object.entries(action.payload).map(([k, v]) => (
                          <div key={k} className="truncate">
                            <span className="text-slate-600 font-medium">{k}: </span>
                            <span className="font-semibold text-slate-900">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Result Summary if Executed */}
                  {action.resultSummary && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-emerald-900">Backend Execution Confirmed</div>
                        <div className="mt-0.5 text-emerald-800">{action.resultSummary}</div>
                      </div>
                    </div>
                  )}

                  {/* Actions Buttons Lifecycle Handlers */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-600">
                      {action.requiresApproval && action.status === 'PENDING_APPROVAL' && (
                        <span className="text-amber-800 font-semibold">
                          Requires explicit Merchant Owner digital consent
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {action.status === 'DRAFT' && (
                        <button
                          onClick={() => handleAction(action.id, 'APPROVE')}
                          disabled={processingActionId === action.id}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#002970] hover:bg-[#001f52] rounded-md transition-colors"
                        >
                          Submit for Review & Approval
                        </button>
                      )}

                      {action.status === 'PENDING_APPROVAL' && (
                        <>
                          <button
                            onClick={() => handleAction(action.id, 'REJECT')}
                            disabled={processingActionId === action.id}
                            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleAction(action.id, 'APPROVE')}
                            disabled={processingActionId === action.id}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-md shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm & Approve Action</span>
                          </button>
                        </>
                      )}

                      {action.status === 'APPROVED' && (
                        <button
                          onClick={() => handleAction(action.id, 'EXECUTE')}
                          disabled={processingActionId === action.id}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>{processingActionId === action.id ? 'Executing...' : 'Execute Backend Operation'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Immutable Audit Trail View */
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Chronological Immutable Audit Log
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Every sensitive state transition, voice action, and merchant approval is permanently signed and logged
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500">
              Total {auditLogs.length} events
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-2.5 px-4">Event ID & Timestamp</th>
                  <th className="py-2.5 px-4">Actor & Role</th>
                  <th className="py-2.5 px-4">Event Classification</th>
                  <th className="py-2.5 px-4">Details & Target</th>
                  <th className="py-2.5 px-4">Cryptographic Integrity Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-slate-900">{log.id}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {new Date(log.timestamp).toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{log.actor}</div>
                      <div className="text-[11px] text-slate-500">{log.role}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-[#002970]">
                        {log.eventType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-sm">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[140px]" title={log.immutableHash}>
                      {log.immutableHash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
