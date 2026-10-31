import React from 'react';
import { MerchantProfile, IndianLanguage } from '../types/index.ts';
import { Radio, Sparkles, Building2, ChevronDown, Check } from 'lucide-react';

interface NavbarProps {
  currentMerchant: MerchantProfile;
  merchants: MerchantProfile[];
  onSelectMerchant: (merchantId: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenBriefing: () => void;
  onOpenVoiceAssistant: () => void;
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMerchant,
  merchants,
  onSelectMerchant,
  activeTab,
  onSelectTab,
  onOpenBriefing,
  onOpenVoiceAssistant,
  onOpenProfile,
}) => {
  const [storeDropdownOpen, setStoreDropdownOpen] = React.useState(false);

  const navLinks = [
    { id: 'overview', label: 'Overview' },
    { id: 'voice', label: 'Voice Assistant' },
    { id: 'payments', label: 'Payment Intel' },
    { id: 'settlements', label: 'Settlements' },
    { id: 'cashflow', label: 'Cash Flow & Khata' },
    { id: 'growth', label: 'Growth Engine' },
    { id: 'actions', label: 'Action Centre' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Strict Top Bar Contract: 3 zones separated by gap-8 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Single-element Brand Wordmark */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#002970] flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-sm">
              ₹
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-[#002970] whitespace-nowrap">
                Paytm Merchant Intelligence
              </span>
              <span className="text-[10px] text-slate-500 font-medium -mt-1">
                Enterprise Business & Voice Suite
              </span>
            </div>
          </div>

          {/* Tenant Store Switcher with strict isolation notice */}
          <div className="relative">
            <button
              onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-md transition-colors whitespace-nowrap"
              title="Switch tenant to test isolation"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="max-w-[140px] truncate">{currentMerchant.businessName}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {storeDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-lg border border-slate-200 shadow-lg py-1.5 z-50 text-xs">
                <div className="px-3 py-1 text-[11px] font-medium text-slate-600 uppercase tracking-wider border-b border-slate-100">
                  Select Merchant Tenant (Isolated)
                </div>
                {merchants.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectMerchant(m.id);
                      setStoreDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      m.id === currentMerchant.id ? 'bg-blue-50/60 font-semibold text-[#002970]' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="truncate">{m.businessName}</div>
                      <div className="text-[11px] text-slate-600 font-normal">
                        MID: {m.mid} · {m.businessCategory}
                      </div>
                    </div>
                    {m.id === currentMerchant.id && <Check className="w-3.5 h-3.5 text-[#002970]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onSelectTab(link.id)}
                className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 text-xs font-semibold uppercase tracking-wider ${
                  isActive
                    ? 'border-[#002970] text-[#002970]'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Utilities */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Soundbox device signal button */}
          <button
            onClick={onOpenProfile}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            title="Paytm Soundbox 4G Pro Connected"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span className="font-mono text-[11px] font-medium">{currentMerchant.deviceInfo.soundboxSerial}</span>
          </button>

          {/* Daily Briefing CTA */}
          <button
            onClick={onOpenBriefing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#002970] bg-blue-50/80 hover:bg-blue-100 border border-blue-200/60 rounded-md transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#002970]" />
            <span>Daily Briefing</span>
          </button>

          {/* Primary Voice Assistant Button */}
          <button
            onClick={onOpenVoiceAssistant}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#002970] hover:bg-[#001f52] rounded-md shadow-sm transition-colors whitespace-nowrap"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Voice Assistant</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="lg:hidden flex overflow-x-auto px-4 py-2 border-t border-slate-100 gap-4 bg-slate-50/60 text-xs">
        {navLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => onSelectTab(link.id)}
            className={`whitespace-nowrap px-2.5 py-1 rounded font-medium ${
              activeTab === link.id ? 'bg-[#002970] text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {link.label}
          </button>
        ))}
      </div>
    </header>
  );
};
