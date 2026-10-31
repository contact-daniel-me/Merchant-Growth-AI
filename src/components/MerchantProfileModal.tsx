import React, { useState } from 'react';
import { MerchantProfile, IndianLanguage } from '../types/index.ts';
import {
  Building,
  User,
  CreditCard,
  Radio,
  FileCheck,
  ShieldCheck,
  X,
  Volume2,
  CheckCircle2,
} from 'lucide-react';

interface MerchantProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchant: MerchantProfile;
  onChangeRole: (role: MerchantProfile['role']) => void;
  onUpdateLanguage: (lang: IndianLanguage) => void;
}

export const MerchantProfileModal: React.FC<MerchantProfileModalProps> = ({
  isOpen,
  onClose,
  merchant,
  onChangeRole,
  onUpdateLanguage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#002970] text-white flex items-center justify-center font-bold text-sm">
              ₹
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Merchant Identity & Device Profile
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                MID: {merchant.mid} · Terminal: {merchant.terminalId}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Tenant Isolation Badge */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-lg flex items-center gap-2 text-[#002970]">
            <ShieldCheck className="w-4 h-4 shrink-0 text-[#002970]" />
            <span className="text-[11px] font-medium leading-tight">
              Strict Multi-Tenant Isolation Active: Ledger, settlements, and AI conversational context are exclusively isolated to {merchant.businessName}.
            </span>
          </div>

          {/* Business Overview */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-2.5">
            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#002970]" />
              <span>Business Entity Details</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <div>
                <span className="text-slate-500">Business Name: </span>
                <span className="font-semibold text-slate-900">{merchant.businessName}</span>
              </div>
              <div>
                <span className="text-slate-500">Owner Name: </span>
                <span className="font-medium text-slate-900">{merchant.ownerName}</span>
              </div>
              <div>
                <span className="text-slate-500">Category: </span>
                <span className="font-medium text-slate-900">{merchant.businessCategory}</span>
              </div>
              <div>
                <span className="text-slate-500">GSTIN: </span>
                <span className="font-mono text-slate-900">{merchant.gstin}</span>
              </div>
              <div>
                <span className="text-slate-500">PAN: </span>
                <span className="font-mono text-slate-900">{merchant.pan}</span>
              </div>
              <div>
                <span className="text-slate-500">Contact: </span>
                <span className="font-mono text-slate-900">{merchant.phone}</span>
              </div>
            </div>
          </div>

          {/* Settlement Bank Details */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-2.5">
            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
              <span>Auto-Settlement Destination Bank</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-700 font-mono">
              <div>
                <span className="text-slate-500 font-sans">Bank: </span>
                <span className="font-semibold text-slate-900 font-sans">{merchant.settlementAccount.bankName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans">Account: </span>
                <span className="font-bold text-slate-900">{merchant.settlementAccount.accountNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans">IFSC: </span>
                <span className="text-slate-900">{merchant.settlementAccount.ifsc}</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans">Holder: </span>
                <span className="text-slate-900 font-sans">{merchant.settlementAccount.accountHolder}</span>
              </div>
            </div>
          </div>

          {/* Soundbox Device Hardware */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-2.5">
            <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#002970]" />
                <span>Paytm Soundbox 4G Pro Diagnostics</span>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-bold">
                {merchant.deviceInfo.networkStatus}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <div>
                <span className="text-slate-500">Serial No: </span>
                <span className="font-mono font-medium text-slate-900">{merchant.deviceInfo.soundboxSerial}</span>
              </div>
              <div>
                <span className="text-slate-500">Battery Level: </span>
                <span className="font-mono text-emerald-700 font-bold">{merchant.deviceInfo.batteryLevel}%</span>
              </div>
              <div>
                <span className="text-slate-500">Model: </span>
                <span className="text-slate-900">{merchant.deviceInfo.soundboxModel}</span>
              </div>
              <div>
                <span className="text-slate-500">Current Volume: </span>
                <span className="text-slate-900">Level {merchant.deviceInfo.soundVolume} / 10</span>
              </div>
            </div>
          </div>

          {/* Role-Based Access Control Switcher */}
          <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-600" />
              <span>Simulate Role-Based Access Control (RBAC)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Different roles govern action permissions (Owner can approve disputes; Cashiers can only view and capture).
            </p>
            <div className="flex items-center gap-2 pt-1">
              {(['OWNER', 'STORE_MANAGER', 'CASHIER'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => onChangeRole(r)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    merchant.role === r
                      ? 'bg-[#002970] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {r.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#002970] text-white font-semibold rounded-md hover:bg-[#001f52]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
