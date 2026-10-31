import React, { useState } from 'react';
import { Transaction, PaymentMethod, TransactionStatus } from '../types/index.ts';
import {
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  RotateCcw,
  CheckCircle2,
  Plus,
  Radio,
  X,
  CreditCard,
  QrCode,
  Wallet,
} from 'lucide-react';

interface PaymentIntelligenceTabProps {
  transactions: Transaction[];
  merchantId: string;
  onSimulateTransaction: (data: { amount: number; paymentMethod: PaymentMethod; customerName: string }) => Promise<void>;
  onInvestigateDiscrepancy: (txn: Transaction) => void;
}

export const PaymentIntelligenceTab: React.FC<PaymentIntelligenceTabProps> = ({
  transactions,
  merchantId,
  onSimulateTransaction,
  onInvestigateDiscrepancy,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [simAmount, setSimAmount] = useState('250');
  const [simMethod, setSimMethod] = useState<PaymentMethod>('SOUNDBOX_UPI');
  const [simCustomer, setSimCustomer] = useState('Ankit Mehra');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter transactions
  const filteredTxns = transactions.filter((t) => {
    const matchesSearch =
      t.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.customerName && t.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.customerVpa && t.customerVpa.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMethod = selectedMethod === 'ALL' || t.paymentMethod === selectedMethod;
    const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simAmount || Number(simAmount) <= 0) return;
    setIsSubmitting(true);
    try {
      await onSimulateTransaction({
        amount: Number(simAmount),
        paymentMethod: simMethod,
        customerName: simCustomer || 'Store Customer',
      });
      setIsSimulateModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'SOUNDBOX_UPI':
        return (
          <span className="inline-flex items-center gap-1 text-slate-700">
            <Radio className="w-3.5 h-3.5 text-[#002970]" />
            <span>Soundbox UPI</span>
          </span>
        );
      case 'UPI_QR':
        return (
          <span className="inline-flex items-center gap-1 text-slate-700">
            <QrCode className="w-3.5 h-3.5 text-blue-600" />
            <span>Static QR UPI</span>
          </span>
        );
      case 'RUPAY_CARD':
        return (
          <span className="inline-flex items-center gap-1 text-slate-700">
            <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
            <span>RuPay Card</span>
          </span>
        );
      case 'VISA_MASTERCARD':
        return (
          <span className="inline-flex items-center gap-1 text-slate-700">
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
            <span>Visa / MC</span>
          </span>
        );
      case 'PAYTM_WALLET':
        return (
          <span className="inline-flex items-center gap-1 text-slate-700">
            <Wallet className="w-3.5 h-3.5 text-cyan-600" />
            <span>Paytm Wallet</span>
          </span>
        );
      default:
        return <span>{method}</span>;
    }
  };

  const getStatusDisplay = (status: TransactionStatus, isFlagged?: boolean) => {
    if (isFlagged) {
      return (
        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
          <ShieldAlert className="w-3 h-3 text-amber-600" />
          <span>Discrepancy</span>
        </span>
      );
    }
    switch (status) {
      case 'SUCCESS':
      case 'SETTLED':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{status === 'SETTLED' ? 'Settled' : 'Captured'}</span>
          </span>
        );
      case 'PENDING_SETTLEMENT':
        return (
          <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
            <Clock className="w-3 h-3 text-blue-600" />
            <span>Pending EOD</span>
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Refunded</span>
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            <span>Disputed</span>
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls & Search Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order ID, Customer name, or UPI VPA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
          />
        </div>

        {/* Filter Segmented Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Method Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md">
            {['ALL', 'SOUNDBOX_UPI', 'UPI_QR', 'RUPAY_CARD'].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMethod(m)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                  selectedMethod === m ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m === 'ALL' ? 'All Channels' : m.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Simulate Payment Button */}
          <button
            onClick={() => setIsSimulateModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#002970] hover:bg-[#001f52] rounded-md transition-colors whitespace-nowrap ml-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Simulate Payment</span>
          </button>
        </div>
      </div>

      {/* Transactions Data Grid */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Verified Payment Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Deterministic transaction ledger linked with core acquiring switch
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Showing {filteredTxns.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-2.5 px-4">Order ID & Date</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Payment Method</th>
                <th className="py-2.5 px-4 text-right">Gross Amount</th>
                <th className="py-2.5 px-4 text-right">MDR & GST</th>
                <th className="py-2.5 px-4 text-right">Net Settlement</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTxns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No transactions match your search filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTxns.map((txn) => (
                  <tr
                    key={txn.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      txn.isFlaggedForDiscrepancy ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-medium text-slate-900">{txn.orderId}</div>
                      <div className="text-[11px] text-slate-600 font-mono">
                        {new Date(txn.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {new Date(txn.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{txn.customerName || 'Retail Customer'}</div>
                      <div className="text-[11px] text-slate-600 font-mono truncate max-w-[150px]">
                        {txn.customerVpa || 'soundbox-qr@pos'}
                      </div>
                    </td>
                    <td className="py-3 px-4">{getMethodBadge(txn.paymentMethod)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      ₹{txn.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {txn.feeMdr > 0 ? `₹${(txn.feeMdr + txn.gstOnMdr).toFixed(2)}` : '₹0.00 (0% UPI)'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#002970]">
                      ₹{txn.netSettlementAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusDisplay(txn.status, txn.isFlaggedForDiscrepancy)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedTxn(txn)}
                        className="text-[#002970] font-semibold hover:underline"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Drawer / Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Transaction Audit Inspector
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  ID: {selectedTxn.id} · Order: {selectedTxn.orderId}
                </p>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200/60 font-mono">
                <div>
                  <div className="text-[11px] text-slate-500">Gross Paid</div>
                  <div className="text-base font-bold text-slate-900">₹{selectedTxn.amount}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Net to Merchant</div>
                  <div className="text-base font-bold text-[#002970]">₹{selectedTxn.netSettlementAmount}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">MDR Fee (Govt/Bank)</div>
                  <div className="text-xs text-slate-700">₹{selectedTxn.feeMdr.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">GST on MDR (18%)</div>
                  <div className="text-xs text-slate-700">₹{selectedTxn.gstOnMdr.toFixed(2)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Payment Channel</span>
                  <span className="font-semibold text-slate-900">{selectedTxn.paymentMethod}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Customer Identity</span>
                  <span className="font-medium text-slate-900">
                    {selectedTxn.customerName || 'Retail Customer'} ({selectedTxn.customerVpa})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Capture Timestamp</span>
                  <span className="font-mono text-slate-900">{new Date(selectedTxn.timestamp).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Settlement Batch</span>
                  <span className="font-mono text-slate-900">{selectedTxn.settlementBatchId || 'Pending EOD Cutoff'}</span>
                </div>
              </div>

              {selectedTxn.discrepancyReason && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800 text-[11px]">
                  <div className="font-semibold text-amber-900 flex items-center gap-1.5 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Discrepancy / Exception Note
                  </div>
                  {selectedTxn.discrepancyReason}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              {selectedTxn.isFlaggedForDiscrepancy && (
                <button
                  onClick={() => {
                    onInvestigateDiscrepancy(selectedTxn);
                    setSelectedTxn(null);
                  }}
                  className="px-3 py-1.5 bg-amber-700 text-white font-semibold rounded-md hover:bg-amber-800"
                >
                  Create Investigation Action
                </button>
              )}
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulate Payment Modal */}
      {isSimulateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Simulate Inbound Payment (Soundbox / Gateway)
              </h3>
              <button onClick={() => setIsSimulateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSimulateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Amount (₹ INR)</label>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-mono text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Payment Channel</label>
                <select
                  value={simMethod}
                  onChange={(e) => setSimMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
                >
                  <option value="SOUNDBOX_UPI">Soundbox UPI (Voice Announcement)</option>
                  <option value="UPI_QR">Static QR UPI</option>
                  <option value="RUPAY_CARD">RuPay Debit Card</option>
                  <option value="VISA_MASTERCARD">Visa / Mastercard</option>
                  <option value="PAYTM_WALLET">Paytm Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Customer Name / Identifier</label>
                <input
                  type="text"
                  value={simCustomer}
                  onChange={(e) => setSimCustomer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSimulateModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-[#002970] text-white font-semibold rounded-md hover:bg-[#001f52]"
                >
                  {isSubmitting ? 'Recording...' : 'Trigger Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
