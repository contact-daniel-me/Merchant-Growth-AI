import React, { useState, useEffect } from 'react';
import { IndianLanguage } from '../types/index.ts';
import { translations } from '../utils/translations.ts';
import { api } from '../services/api.ts';
import {
  TrendingUp,
  Sparkles,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Landmark,
  ShieldCheck,
  Megaphone,
  CreditCard,
  ChevronRight,
  ArrowUpRight,
  Check,
  Building,
} from 'lucide-react';

interface BusinessGrowthScreenProps {
  merchantId: string;
  currentLanguage: IndianLanguage;
  onAskVoicePrompt?: (prompt: string) => void;
}

export const BusinessGrowthScreen: React.FC<BusinessGrowthScreenProps> = ({
  merchantId,
  currentLanguage,
  onAskVoicePrompt,
}) => {
  const t = translations[currentLanguage] || translations.en;

  const [activeSection, setActiveSection] = useState<'RECOMMENDATIONS' | 'LOANS' | 'CAMPAIGNS' | 'SUBSCRIPTION'>('RECOMMENDATIONS');
  const [declineData, setDeclineData] = useState<any>(null);
  const [loanData, setLoanData] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [subData, setSubData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Loan apply modal
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loanAmount, setLoanAmount] = useState('50000');
  const [tenure, setTenure] = useState(6);
  const [consentChecked, setConsentChecked] = useState(false);
  const [loanSuccessMsg, setLoanSuccessMsg] = useState('');

  useEffect(() => {
    loadAllGrowthData();
  }, [merchantId]);

  const loadAllGrowthData = async () => {
    setIsLoading(true);
    try {
      const [growthRes, loans, camps, sub] = await Promise.all([
        fetch(`/api/growth/${merchantId}`).then((r) => r.json()),
        api.getLoanProducts(merchantId),
        api.getCampaigns(merchantId),
        api.getSubscription(merchantId),
      ]);

      if (growthRes.fullAnalysis) {
        setDeclineData(growthRes.fullAnalysis);
      }
      if (loans) setLoanData(loans);
      if (camps) setCampaigns(camps);
      if (sub) setSubData(sub);
    } catch (err) {
      console.error('Failed to load growth intelligence:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !consentChecked) return;
    try {
      const res = await api.applyForLoan(merchantId, {
        productId: selectedProduct.id,
        requestedAmount: Number(loanAmount),
        tenureMonths: Number(tenure),
        consentGiven: true,
      });
      setLoanSuccessMsg(res.message || 'Loan application initiated successfully.');
      setSelectedProduct(null);
      await loadAllGrowthData();
    } catch (err: any) {
      alert(err.message || 'Application failed');
    }
  };

  const handleApproveCampaign = async (campaignId: string) => {
    try {
      await api.approveCampaign(merchantId, campaignId);
      await loadAllGrowthData();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleUpgradePlan = async (tier: string) => {
    try {
      await api.upgradeSubscription(merchantId, tier);
      await loadAllGrowthData();
    } catch (err: any) {
      alert(err.message || 'Upgrade failed');
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#00BAF2] uppercase tracking-wider">
              <TrendingUp className="w-4 h-4" />
              <span>Merchant Growth & Monetization Hub</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] mt-1 tracking-tight">
              {t.growYourBusiness}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Evidence-based retail analytics, authorized partner loans, promotional flyers, and premium plans.
            </p>
          </div>

          {/* Sub Navigation Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start sm:self-center text-xs font-semibold">
            <button
              onClick={() => setActiveSection('RECOMMENDATIONS')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSection === 'RECOMMENDATIONS' ? 'bg-white text-[#002970] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Intelligence
            </button>
            <button
              onClick={() => setActiveSection('LOANS')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSection === 'LOANS' ? 'bg-white text-[#002970] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Partner Loans
            </button>
            <button
              onClick={() => setActiveSection('CAMPAIGNS')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSection === 'CAMPAIGNS' ? 'bg-white text-[#002970] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setActiveSection('SUBSCRIPTION')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSection === 'SUBSCRIPTION' ? 'bg-white text-[#002970] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Plan
            </button>
          </div>
        </div>

        {loanSuccessMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
            <span>{loanSuccessMsg}</span>
            <button onClick={() => setLoanSuccessMsg('')} className="text-emerald-600 font-bold ml-2">✕</button>
          </div>
        )}
      </div>

      {/* SECTION 1: RECOMMENDATIONS & 4-WEEK SALES DECLINE ANALYSIS */}
      {activeSection === 'RECOMMENDATIONS' && (
        <div className="space-y-4">
          {/* Declining sales benchmark banner */}
          {declineData && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {declineData.analysisPeriod}
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                    <span>Current 7 Days: ₹{declineData.currentWeekCollections.toLocaleString('en-IN')}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      vs 4-Wk Avg: ₹{declineData.previousFourWeekAverage.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  Status:{' '}
                  <span className="font-bold text-emerald-700">
                    {declineData.trendStatus.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {declineData.rootCausesIdentified?.map((cause: string, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2">
                    <Clock className="w-4 h-4 text-[#00BAF2] shrink-0 mt-0.5" />
                    <span className="text-slate-700">{cause}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {declineData?.recommendations?.map((r: any) => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#002970] font-bold text-[10px] uppercase tracking-wide">
                      {r.category}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      Confidence: {r.confidenceScore}%
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900">{r.title}</h3>

                  <div className="mt-3 space-y-2 text-xs">
                    <div>
                      <strong className="text-slate-700">{t.whatWeNoticed}:</strong>{' '}
                      <span className="text-slate-600">{r.evidence}</span>
                    </div>
                    <div>
                      <strong className="text-slate-700">{t.whatYouCanDo}:</strong>{' '}
                      <span className="text-slate-600">{r.suggestedAction}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-900 font-medium">
                      Projected Outcome: {r.expectedOutcome}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Assumes standard store trading hours</span>
                  {onAskVoicePrompt && (
                    <button
                      onClick={() => onAskVoicePrompt(`How to implement: ${r.title}`)}
                      className="text-xs font-bold text-[#00BAF2] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ask Saathi</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: LOANS (Consent-Based Discovery) */}
      {activeSection === 'LOANS' && (
        <div className="space-y-4">
          {loanData?.disclaimer && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
              <strong>Regulatory Notice:</strong> {loanData.disclaimer}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loanData?.products?.map((p: any) => {
              const partner = loanData.partners?.find((pt: any) => pt.id === p.partnerId);
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-[#002970]">
                        {partner?.name || 'Authorized Bank Partner'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        RBI Registered
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900">{p.name}</h3>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div>Loan Amount: ₹{p.minAmount.toLocaleString('en-IN')} – ₹{p.maxAmount.toLocaleString('en-IN')}</div>
                      <div>Interest Rate: {p.interestRateRange}</div>
                      <div>Repayment: {p.repaymentFrequency.replace(/_/g, ' ')}</div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
                        {p.eligibilityCriteria}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700">
                      Pre-qualified up to ₹{(p.preQualifiedEstimate || 150000).toLocaleString('en-IN')}
                    </span>
                    <button
                      onClick={() => setSelectedProduct(p)}
                      className="px-4 py-2 rounded-xl bg-[#002970] hover:bg-[#001f55] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      Apply with Consent
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Past Applications */}
          {loanData?.applications?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Your Loan Applications</h3>
              <div className="divide-y divide-slate-100 text-xs">
                {loanData.applications.map((app: any) => (
                  <div key={app.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">Amount: ₹{app.requestedAmount.toLocaleString('en-IN')}</div>
                      <div className="text-[11px] text-slate-400">Ref: {app.partnerReferenceId} · {app.createdAt?.slice(0, 10)}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#002970]">
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: MARKETING CAMPAIGNS */}
      {activeSection === 'CAMPAIGNS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Customer Promotional Broadcasts</h3>
            <p className="text-xs text-slate-500 mb-4">
              Authorized WhatsApp flyers to drive off-peak footfall. Requires explicit merchant approval before execution.
            </p>

            {campaigns.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No active promotional campaigns. Ask Saathi voice assistant to draft an afternoon flyer!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {campaigns.map((c) => (
                  <div key={c.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{c.campaignName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#002970]">
                          {c.channel}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1 italic">
                        "{c.flyerText}"
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Target: {c.targetAudience} · Est. Reach: {c.estimatedReach} customers · Budget: ₹{c.budget}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.status}
                      </span>
                      {c.status === 'PENDING_APPROVAL' && (
                        <button
                          onClick={() => handleApproveCampaign(c.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          Authorize Broadcast
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: SUBSCRIPTIONS */}
      {activeSection === 'SUBSCRIPTION' && subData && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subData.availablePlans?.map((plan: any) => {
              const isCurrent = subData.currentPlan?.planTier === plan.tier;
              return (
                <div
                  key={plan.tier}
                  className={`bg-white rounded-2xl p-5 shadow-xs flex flex-col justify-between border-2 transition ${
                    isCurrent ? 'border-[#00BAF2]' : 'border-slate-200'
                  }`}
                >
                  <div>
                    {plan.popular && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#00BAF2] text-white text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                        Most Popular
                      </span>
                    )}
                    <h3 className="font-bold text-base text-slate-900">{plan.name}</h3>
                    <div className="mt-2 text-2xl font-bold text-[#002970]">
                      ₹{plan.monthlyFee}
                      <span className="text-xs font-normal text-slate-500"> / month</span>
                    </div>

                    <ul className="mt-4 space-y-2 text-xs text-slate-600">
                      {plan.features?.map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-[#00BAF2] shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    {isCurrent ? (
                      <div className="w-full py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl">
                        Active Current Plan
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgradePlan(plan.tier)}
                        className="w-full py-2.5 bg-[#002970] hover:bg-[#001f55] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        Switch to {plan.name}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Apply Loan Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-base text-slate-800">
              Apply for {selectedProduct.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Data will be transmitted to partner bank under RBI guidelines.
            </p>

            <form onSubmit={handleApplyLoan} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Requested Amount (₹)
                </label>
                <input
                  type="number"
                  min={selectedProduct.minAmount}
                  max={selectedProduct.maxAmount}
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tenure (Months)
                </label>
                <select
                  value={tenure}
                  onChange={(e) => setTenure(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00BAF2]"
                >
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={9}>9 Months</option>
                  <option value={12}>12 Months</option>
                </select>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 rounded text-[#00BAF2]"
                />
                <label htmlFor="consent" className="text-[11px] text-slate-600 leading-tight">
                  I hereby give my explicit consent to share verified Paytm Soundbox and shop collection records with the lending partner for loan underwriting.
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!consentChecked}
                  className="px-4 py-2 text-xs font-bold bg-[#002970] hover:bg-[#001f55] disabled:opacity-50 text-white rounded-xl shadow-xs"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
