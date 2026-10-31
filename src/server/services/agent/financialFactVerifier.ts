import { IndianLanguage } from '../../../types/index.ts';
import { BriefService } from '../briefService.ts';

export interface AuthoritativeFactsPacket {
  intent: string;
  toolInvoked: string;
  source: string;
  calculatedAt: string;
  facts: Record<string, number | string | boolean>;
  allowedAmounts: number[]; // Set of numerical currency amounts permitted in the response
}

export interface VerificationResult {
  isValid: boolean;
  unverifiedNumbersFound: number[];
  verifiedResponseText: string;
  spokenResponseText: string;
  auditTrace: {
    source: string;
    calculatedAt: string;
    allowedAmountsCount: number;
    rule: string;
  };
}

export class FinancialFactVerifier {
  /**
   * Extracts all standalone numbers or currency figures from a generated response string
   * e.g., "₹11,785 across 26 payments" -> [11785, 26]
   */
  public static extractNumbersFromText(text: string): number[] {
    const cleaned = text.replace(/,/g, '');
    const matches = cleaned.match(/\b\d+(\.\d+)?\b/g) || [];
    return matches.map((m) => Number(m)).filter((n) => !isNaN(n));
  }

  /**
   * Validates generated LLM response against strict authoritative facts.
   * If an ungrounded or hallucinated number is detected, regenerates the message
   * using deterministic, approved financial facts.
   */
  public static verifyAndEnforce(
    responseText: string,
    packet: AuthoritativeFactsPacket,
    language: IndianLanguage = 'en'
  ): VerificationResult {
    const extractedNumbers = this.extractNumbersFromText(responseText);

    // Permitted numbers include explicit allowedAmounts plus small integers (counts, percentages, dates)
    const allowedSet = new Set<number>(packet.allowedAmounts.map((n) => Math.round(n)));

    // Also allow integer rounded amounts and 100/1000 multipliers
    for (const a of packet.allowedAmounts) {
      allowedSet.add(Math.floor(a));
      allowedSet.add(Math.ceil(a));
    }

    const unverifiedNumbers: number[] = [];

    for (const num of extractedNumbers) {
      const rounded = Math.round(num);

      // Allow small numbers 0-31 as days/hours/percentages/counts if they appear in facts values
      const isKnownFactValue = Object.values(packet.facts).some((v) => {
        if (typeof v === 'number') {
          return Math.abs(v - num) < 0.1 || Math.round(v) === rounded;
        }
        return false;
      });

      if (!isKnownFactValue && !allowedSet.has(rounded) && num > 100) {
        // High-value currency figure found that is not in the approved fact sheet
        unverifiedNumbers.push(num);
      }
    }

    const isValid = unverifiedNumbers.length === 0;

    let verifiedText = responseText;
    let spokenText = responseText;

    // If ungrounded numbers were found, enforce the deterministic verified fact narrative
    if (!isValid) {
      console.warn(
        `[FinancialFactVerifier] Rejected unverified numbers ${JSON.stringify(unverifiedNumbers)} for intent '${packet.intent}'. Enforcing authoritative facts.`
      );
      verifiedText = this.buildDeterministicFactNarrative(packet, language);
    }

    spokenText = this.convertToSpokenIndicators(verifiedText, language);

    return {
      isValid,
      unverifiedNumbersFound: unverifiedNumbers,
      verifiedResponseText: verifiedText,
      spokenResponseText: spokenText,
      auditTrace: {
        source: packet.source,
        calculatedAt: packet.calculatedAt,
        allowedAmountsCount: packet.allowedAmounts.length,
        rule: 'ZERO_HALLUCINATION_FINANCIAL_GUARD',
      },
    };
  }

  /**
   * Deterministically converts numbers and currency signs into locale-aware spoken words for Indic speech synthesis
   */
  public static convertToSpokenIndicators(text: string, language: IndianLanguage = 'en'): string {
    // Replace ₹<number> with spoken currency words
    return text.replace(/₹\s*([0-9,]+(\.[0-9]+)?)/g, (match, numStr) => {
      const num = Number(numStr.replace(/,/g, ''));
      if (isNaN(num)) return match;
      return BriefService.formatSpokenAmount(num, language);
    });
  }

  /**
   * Produces a 100% grounded deterministic summary from facts when LLM introduces ungrounded numbers
   */
  private static buildDeterministicFactNarrative(
    packet: AuthoritativeFactsPacket,
    language: IndianLanguage
  ): string {
    const f = packet.facts;

    if (packet.intent === 'get_daily_collections') {
      const gross = Number(f.todayGrossCollections || 0);
      const count = Number(f.todayTransactionsCount || 0);
      const inTransit = Number(f.inTransitAmount || 0);

      if (language === 'hi') {
        return `आज कुल ₹${gross.toLocaleString('en-IN')} की बिक्री ${count} भुगतानों से हुई है। ₹${inTransit.toLocaleString('en-IN')} आज रात आपके बैंक खाते में जमा हो जाएंगे।`;
      }
      if (language === 'ta') {
        return `இன்று ${count} பரிவர்த்தனைகள் மூலம் ₹${gross.toLocaleString('en-IN')} வசூலாகியுள்ளது. ₹${inTransit.toLocaleString('en-IN')} இன்று இரவு உங்கள் வங்கிக் கணக்கில் வரவு வைக்கப்படும்.`;
      }
      return `Today's gross collections stand at ₹${gross.toLocaleString('en-IN')} across ${count} payments. Bank settlement of ₹${inTransit.toLocaleString('en-IN')} is scheduled for tonight.`;
    }

    if (packet.intent === 'get_customer_dues') {
      const totalDue = Number(f.totalOutstandingDues || 0);
      const overdue = Number(f.totalOverdueAmount || 0);
      const debtorCount = Number(f.overdueCustomersCount || 0);

      if (language === 'hi') {
        return `आपके खाता बही में कुल ₹${totalDue.toLocaleString('en-IN')} का बकाया है, जिसमें से ₹${overdue.toLocaleString('en-IN')} की उधारी ${debtorCount} ग्राहकों पर अतिदेय है।`;
      }
      return `Total store credit is ₹${totalDue.toLocaleString('en-IN')}, with ₹${overdue.toLocaleString('en-IN')} overdue across ${debtorCount} customers.`;
    }

    // Generic safe fact list
    const entries = Object.entries(f)
      .filter(([k, v]) => typeof v === 'number' || typeof v === 'string')
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    return `Verified ledger facts: ${entries}.`;
  }
}

