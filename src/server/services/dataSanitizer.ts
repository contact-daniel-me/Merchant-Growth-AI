/**
 * Production Data Sanitization & Validation Service
 * Enforces strict financial security, PII masking, and anti-injection hygiene.
 */

export class DataSanitizer {
  /**
   * Sanitizes and normalizes an Indian phone number.
   * Format: +91 XXXXX XXXXX
   */
  public static sanitizePhone(input: string): string {
    if (!input || typeof input !== 'string') {
      throw new Error('Phone number is required.');
    }

    const digitsOnly = input.replace(/\D/g, '');
    let core10 = '';

    if (digitsOnly.length === 10) {
      core10 = digitsOnly;
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      core10 = digitsOnly.slice(2);
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      core10 = digitsOnly.slice(1);
    } else {
      throw new Error(`Invalid Indian phone number format: '${input}'. Must be 10 digits.`);
    }

    if (!/^[6-9]\d{9}$/.test(core10)) {
      throw new Error(`Invalid mobile prefix in '${input}'. Indian mobile numbers must start with 6, 7, 8, or 9.`);
    }

    return `+91 ${core10.slice(0, 5)} ${core10.slice(5)}`;
  }

  /**
   * Masks a phone number for DPDP Act compliance and PII protection on dashboards
   * e.g., '+91 98450 12890' -> '+91 98*** **890'
   */
  public static maskPhone(phone: string): string {
    const clean = this.sanitizePhone(phone);
    // +91 98450 12890 -> +91 98*** **890
    return `${clean.slice(0, 6)}*** **${clean.slice(-3)}`;
  }

  /**
   * Validates and rounds financial currency amounts to 2 decimal places.
   */
  public static sanitizeAmount(amount: any): number {
    const num = Number(amount);
    if (!Number.isFinite(num) || num < 0) {
      throw new Error(`Invalid financial amount: '${amount}'. Must be a non-negative finite number.`);
    }
    return Math.round(num * 100) / 100;
  }

  /**
   * Sanitizes and validates a UPI Virtual Payment Address (VPA).
   */
  public static sanitizeVpa(vpa?: string): string {
    if (!vpa || typeof vpa !== 'string') {
      return 'retail.customer@upi';
    }
    const trimmed = vpa.trim().toLowerCase();
    const vpaRegex = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9.\-_]{2,64}$/;
    if (!vpaRegex.test(trimmed)) {
      throw new Error(`Invalid UPI VPA handle: '${vpa}'.`);
    }
    return trimmed;
  }

  /**
   * Validates Indian GSTIN format (15 characters)
   */
  public static validateGstin(gstin?: string): boolean {
    if (!gstin) return false;
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin.trim().toUpperCase());
  }

  /**
   * Validates Indian PAN format (10 characters)
   */
  public static validatePan(pan?: string): boolean {
    if (!pan) return false;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.trim().toUpperCase());
  }

  /**
   * Prevents HTML / script injection in customer notes and transaction descriptions.
   */
  public static cleanText(input?: string): string {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .trim();
  }
}
