import React, { useState } from 'react';
import { MerchantProfile, IndianLanguage } from '../types/index.ts';
import { translations } from '../utils/translations.ts';
import {
  Home,
  CreditCard,
  Building,
  Sparkles,
  Mic,
  User,
  Radio,
  Check,
  ChevronDown,
} from 'lucide-react';

interface SimpleNavbarProps {
  currentMerchant: MerchantProfile;
  merchants: MerchantProfile[];
  onSelectMerchant: (merchantId: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentLanguage: IndianLanguage;
  onSelectLanguage: (lang: IndianLanguage) => void;
  onOpenProfile: () => void;
}

export const SimpleNavbar: React.FC<SimpleNavbarProps> = ({
  currentMerchant,
  merchants,
  onSelectMerchant,
  activeTab,
  onSelectTab,
  currentLanguage,
  onSelectLanguage,
  onOpenProfile,
}) => {
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const t = translations[currentLanguage] || translations.hi;

  const languages: { code: IndianLanguage; label: string; native: string }[] = [
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'en', label: 'English', native: 'English' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  ];

  const navItems = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'payments', label: t.navPayments, icon: CreditCard },
    { id: 'money', label: t.navMoney, icon: Building },
    { id: 'tips', label: t.navTips, icon: Sparkles },
    { id: 'assistant', label: t.navAssistant, icon: Mic, highlight: true },
  ];

  return (
    <>
      {/* Top Header Bar for Desktop & Mobile */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Brand & Store Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('home')}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              {/* Paytm-inspired iconic deep blue badge */}
              <div className="w-9 h-9 rounded-xl bg-[#002970] text-[#00BAF2] flex items-center justify-center font-bold text-lg shadow-sm border border-blue-900/10">
                ₹
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#002970] tracking-tight leading-tight">
                  {t.appName}
                </span>
                <span className="text-[11px] text-[#00BAF2] font-semibold -mt-0.5">
                  {t.tagline}
                </span>
              </div>
            </button>

            {/* Switch Shop Dropdown */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200/80 rounded-full text-xs font-medium text-[#172B4D] transition-colors"
              >
                <span className="max-w-[140px] truncate">{currentMerchant.businessName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {storeDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl py-2 z-50">
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Select Your Shop
                  </div>
                  {merchants.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSelectMerchant(m.id);
                        setStoreDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-blue-50/60 transition-colors text-xs ${
                        m.id === currentMerchant.id ? 'font-bold text-[#002970] bg-blue-50' : 'text-[#172B4D]'
                      }`}
                    >
                      <div>
                        <div className="truncate">{m.businessName}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{m.ownerName}</div>
                      </div>
                      {m.id === currentMerchant.id && <Check className="w-4 h-4 text-[#00BAF2]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation Links (5 Items Max) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    item.highlight && !isActive
                      ? 'bg-blue-50 text-[#002970] hover:bg-blue-100'
                      : isActive
                      ? 'bg-[#002970] text-white shadow-sm'
                      : 'text-slate-600 hover:text-[#002970] hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#00BAF2]' : item.highlight ? 'text-[#00BAF2]' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Section: Language Switcher & Profile */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#002970]"
              >
                <span>{languages.find((l) => l.code === currentLanguage)?.native}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-50 text-xs">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        onSelectLanguage(l.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-blue-50 transition-colors ${
                        currentLanguage === l.code ? 'font-bold text-[#002970] bg-blue-50/70' : 'text-[#172B4D]'
                      }`}
                    >
                      <span>{l.native}</span>
                      {currentLanguage === l.code && <Check className="w-3.5 h-3.5 text-[#00BAF2]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Merchant Profile Button */}
            <button
              onClick={onOpenProfile}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#002970] transition-colors"
              title="Shop details & Soundbox status"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (Large icons, large text, easy thumb access) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg px-2 py-1.5">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-all ${
                  isActive
                    ? 'text-[#002970] font-bold'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <div
                  className={`p-1 rounded-full ${
                    item.highlight && !isActive
                      ? 'bg-blue-50 text-[#00BAF2]'
                      : isActive
                      ? 'bg-[#002970] text-[#00BAF2]'
                      : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 whitespace-nowrap truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
