import React from 'react';
import { MerchantProfile, IndianLanguage } from '../types/index.ts';
import {
  User,
  Building,
  CreditCard,
  Radio,
  X,
  Volume2,
  CheckCircle2,
  ShieldCheck,
  BatteryCharging,
} from 'lucide-react';

interface SimpleProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchant: MerchantProfile;
  currentLanguage: IndianLanguage;
  onPlayTestChime: () => void;
  isChimePlaying: boolean;
}

export const SimpleProfileModal: React.FC<SimpleProfileModalProps> = ({
  isOpen,
  onClose,
  merchant,
  currentLanguage,
  onPlayTestChime,
  isChimePlaying,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#002970] text-[#00BAF2] flex items-center justify-center font-bold text-base shadow-sm">
              ₹
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172B4D]">
                My Shop & Device Details
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                MID: {merchant.mid}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Shop Information */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="text-xs font-bold text-[#002970] flex items-center gap-1.5 mb-1">
              <Building className="w-4 h-4" />
              <span>Shop Profile</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <div>
                <span className="text-slate-500 text-[11px]">Shop Name: </span>
                <span className="font-bold text-slate-900 block">{merchant.businessName}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Owner: </span>
                <span className="font-semibold text-slate-900 block">{merchant.ownerName}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Category: </span>
                <span className="text-slate-900 block">{merchant.businessCategory}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Phone: </span>
                <span className="font-mono text-slate-900 block">{merchant.phone}</span>
              </div>
            </div>
          </div>

          {/* Bank Account */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mb-1">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Bank for Nightly Money Deposits</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-700 font-mono text-xs">
              <div>
                <span className="text-slate-500 font-sans text-[11px]">Bank: </span>
                <span className="font-bold text-slate-900 block font-sans">{merchant.settlementAccount.bankName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans text-[11px]">Account: </span>
                <span className="font-bold text-[#002970] block">{merchant.settlementAccount.accountNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans text-[11px]">IFSC Code: </span>
                <span className="text-slate-900 block">{merchant.settlementAccount.ifsc}</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans text-[11px]">Account Holder: </span>
                <span className="text-slate-900 block font-sans">{merchant.settlementAccount.accountHolder}</span>
              </div>
            </div>
          </div>

          {/* Soundbox Device */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#002970]" />
                <span className="text-xs font-bold text-[#002970]">
                  Paytm Soundbox 4G Pro
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Connected
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <div>
                <span className="text-slate-500 text-[11px]">Serial: </span>
                <span className="font-mono font-bold text-slate-900 block">{merchant.deviceInfo.soundboxSerial}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Battery: </span>
                <span className="font-mono text-emerald-700 font-bold flex items-center gap-1">
                  <BatteryCharging className="w-3.5 h-3.5" />
                  {merchant.deviceInfo.batteryLevel}% Healthy
                </span>
              </div>
            </div>

            <button
              onClick={onPlayTestChime}
              disabled={isChimePlaying}
              className="w-full py-2.5 rounded-xl bg-[#002970] hover:bg-[#001f55] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Volume2 className="w-4 h-4 text-[#00BAF2]" />
              <span>{isChimePlaying ? 'Playing Payment Announcement...' : 'Play Test Soundbox Chime'}</span>
            </button>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
