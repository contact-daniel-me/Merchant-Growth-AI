import React, { useState } from 'react';
import { CustomerCreditRecord, IndianLanguage } from '../types/index.ts';
import { X, CheckCircle2, MessageSquare, Send, ShieldCheck } from 'lucide-react';

interface SimpleReminderApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: CustomerCreditRecord | null;
  merchantName: string;
  shopName: string;
  currentLanguage: IndianLanguage;
  onConfirmSend: (record: CustomerCreditRecord, message: string) => Promise<void>;
}

export const SimpleReminderApprovalModal: React.FC<SimpleReminderApprovalModalProps> = ({
  isOpen,
  onClose,
  record,
  merchantName,
  shopName,
  currentLanguage,
  onConfirmSend,
}) => {
  if (!isOpen || !record) return null;

  const defaultMessage =
    currentLanguage === 'hi'
      ? `नमस्ते ${record.customerName} जी, ${shopName} पर आपकी ₹${record.outstandingBalance.toLocaleString('en-IN')} की उधारी बकाया है। कृपया नीचे दिए गए सुरक्षित पेटीएम लिंक से भुगतान करें: https://paytm.me/pay/${record.id} धन्यवाद!`
      : `Dear ${record.customerName}, gentle reminder from ${shopName} regarding your outstanding balance of ₹${record.outstandingBalance.toLocaleString('en-IN')}. Pay easily using this Paytm link: https://paytm.me/pay/${record.id} Thank you!`;

  const [messageText, setMessageText] = useState(defaultMessage);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      await onConfirmSend(record, messageText);
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1500);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#00BAF2]" />
            <h3 className="text-sm font-bold text-[#172B4D]">
              Approve Customer Due Reminder
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
            <div className="text-base font-bold text-[#172B4D]">
              Reminder Sent Successfully!
            </div>
            <p className="text-xs text-slate-500">
              Notification sent to {record.customerName} ({record.customerPhone}).
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-slate-500 text-[11px]">Customer to notify:</div>
              <div className="font-bold text-sm text-[#172B4D]">
                {record.customerName} ({record.customerPhone})
              </div>
              <div className="text-xs font-mono font-bold text-[#002970] mt-0.5">
                Amount Due: ₹{record.outstandingBalance.toLocaleString('en-IN')}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                WhatsApp / SMS Message Draft:
              </label>
              <textarea
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
              />
            </div>

            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-start gap-2 text-[11px] text-[#002970]">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#00BAF2]" />
              <span>
                Paytm Safe Reminder: Includes direct UPI intent link so the customer can pay instantly with zero friction.
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSending}
                onClick={handleSend}
                className="px-5 py-2 rounded-xl bg-[#002970] text-white font-bold hover:bg-[#001f55] shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-[#00BAF2]" />
                <span>{isSending ? 'Sending...' : 'Approve & Send Reminder'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
