import React, { useState } from 'react';
import { CashFlowDay, CustomerCreditRecord } from '../types/index.ts';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  BookOpen,
  Calendar,
  DollarSign,
  AlertCircle,
  MessageSquare,
  Plus,
  Send,
  CheckCircle2,
  X,
  CreditCard,
  ShieldAlert,
} from 'lucide-react';

interface CashFlowCreditTabProps {
  historicalCashFlow: CashFlowDay[];
  forecastCashFlow: CashFlowDay[];
  forecastAssumptions: string[];
  loanEmiDaily: number;
  creditRecords: CustomerCreditRecord[];
  onAddCreditRecord: (data: { customerName: string; customerPhone: string; amount: number; dueDate: string; notes?: string }) => Promise<void>;
  onSendReminder: (record: CustomerCreditRecord) => void;
}

export const CashFlowCreditTab: React.FC<CashFlowCreditTabProps> = ({
  historicalCashFlow,
  forecastCashFlow,
  forecastAssumptions,
  loanEmiDaily,
  creditRecords,
  onAddCreditRecord,
  onSendReminder,
}) => {
  const [selectedRecord, setSelectedRecord] = useState<CustomerCreditRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combined chart dataset
  const combinedChartData = [
    ...historicalCashFlow.map((h) => ({
      date: h.date.slice(5),
      actualCollections: h.collections,
      projectedCollections: null,
      loanEmi: h.loanEmiDeduction,
      type: 'Actual Ledger',
    })),
    ...forecastCashFlow.map((f) => ({
      date: f.date.split(' ')[0].slice(5),
      actualCollections: null,
      projectedCollections: f.projectedCollections,
      loanEmi: f.loanEmiDeduction,
      type: 'Forecast Model',
    })),
  ];

  const totalOutstanding = creditRecords.reduce((acc, c) => acc + c.outstandingBalance, 0);
  const overdueRecords = creditRecords.filter((c) => c.status === 'OVERDUE' || c.status === 'HIGH_RISK');
  const overdueTotal = overdueRecords.reduce((acc, c) => acc + c.outstandingBalance, 0);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newAmount) return;
    setIsSubmitting(true);
    try {
      await onAddCreditRecord({
        customerName: newCustomerName,
        customerPhone: newCustomerPhone || '+91 98000 00000',
        amount: Number(newAmount),
        dueDate: newDueDate || '2026-11-06',
        notes: newNotes,
      });
      setIsAddModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewAmount('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Strip: Loan & Khata Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500 font-medium">Paytm Merchant Growth Loan</div>
          <div className="mt-2 text-xl font-bold font-mono text-slate-900">
            ₹350 <span className="text-xs font-normal text-slate-500">/ day auto-EMI</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Principal remaining: ₹42,000 · 0% penalty
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500 font-medium">Customer Credit (Khata) Total</div>
          <div className="mt-2 text-xl font-bold font-mono text-slate-900">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Across {creditRecords.length} registered customers
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500 font-medium">Overdue Khata Balance</div>
          <div className="mt-2 text-xl font-bold font-mono text-amber-700">
            ₹{overdueTotal.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-xs text-amber-800">
            {overdueRecords.length} accounts require reminder
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500 font-medium">7-Day Projected Net Inflow</div>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-700">
            ₹168,900
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Post ₹2,450 cumulative loan deductions
          </div>
        </div>
      </div>

      {/* Cash Flow Forecast Graph with Explicit Assumptions */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Cash-Flow Actuals vs. 7-Day Moving-Average Projection
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Solid line represents verified bank settlements; dashed indicates statistical forecast
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-[#002970]" />
              Historical Settlement
            </span>
            <span className="flex items-center gap-1.5 text-cyan-600">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              Projected Inflow
            </span>
          </div>
        </div>

        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={combinedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#002970" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#002970" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `₹${val / 1000}k`}
              />
              <Tooltip
                formatter={(val: any, name: any) => [
                  val ? `₹${Number(val).toLocaleString('en-IN')}` : '-',
                  name === 'actualCollections' ? 'Actual Settlement' : 'Projected Inflow',
                ]}
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px', fontSize: '12px' }}
              />
              <Area
                type="monotone"
                dataKey="actualCollections"
                stroke="#002970"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#actualGrad)"
              />
              <Area
                type="monotone"
                dataKey="projectedCollections"
                stroke="#0284c7"
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#projGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Explicit Forecasting Assumptions Box (Required by Financial Architecture) */}
        <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-md text-xs text-slate-600">
          <div className="font-semibold text-slate-800 mb-1">
            Deterministic Forecasting Assumptions & Uncertainty Limits:
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500">
            {forecastAssumptions.map((assump, i) => (
              <li key={i}>{assump}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Customer Khata (Digital Ledger) Section */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Customer Credit (Khata) Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Track store credit balances, due dates, and send automated WhatsApp/SMS payment links
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#002970] hover:bg-[#001f52] rounded-md transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Store Credit</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-2.5 px-4">Customer Name & Contact</th>
                <th className="py-2.5 px-4 text-right">Outstanding Credit</th>
                <th className="py-2.5 px-4 text-right">Total Borrowed</th>
                <th className="py-2.5 px-4 text-right">Total Repaid</th>
                <th className="py-2.5 px-4">Due Date</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {creditRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{rec.customerName}</div>
                    <div className="text-[11px] font-mono text-slate-500">{rec.customerPhone}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    ₹{rec.outstandingBalance.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500">
                    ₹{rec.totalCreditGiven.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-700">
                    ₹{rec.totalRepaid.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {rec.dueDate}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {rec.status === 'OVERDUE' ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>Overdue</span>
                      </span>
                    ) : rec.status === 'HIGH_RISK' ? (
                      <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                        <ShieldAlert className="w-3 h-3 text-rose-600" />
                        <span>High Risk</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Current</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onSendReminder(rec)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-[#002970] bg-blue-50/80 hover:bg-blue-100 rounded transition-colors inline-flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Send Reminder</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New Store Credit */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Record Customer Credit (Khata Entry)
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Customer Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98XXX XXXXX"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Credit Amount (₹ INR)</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="1500"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Agreed Due Date</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Notes / Bill Reference</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Monthly dry ration supplies bill"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-[#002970] text-white font-semibold rounded-md hover:bg-[#001f52]"
                >
                  {isSubmitting ? 'Saving...' : 'Save to Khata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
