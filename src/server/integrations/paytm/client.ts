import crypto from 'node:crypto';
import { getPaytmConfig, isPaytmConfigured } from './config.ts';

export class PaytmClient {
  /**
   * Generates Paytm Signature using HMAC-SHA256
   */
  public static generateSignature(payload: string, merchantKey: string): string {
    return crypto.createHmac('sha256', merchantKey).update(payload).digest('base64');
  }

  /**
   * Validates inbound Paytm Signature using constant-time comparison
   */
  public static verifySignature(payload: string, signature: string, merchantKey: string): boolean {
    try {
      const calculated = this.generateSignature(payload, merchantKey);
      return crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /**
   * Safe authorized HTTP request execution to Paytm Gateway Edge
   */
  public static async executeRequest<T>(endpoint: string, body: Record<string, any>): Promise<{
    success: boolean;
    data?: T;
    isFixture: boolean;
    error?: string;
  }> {
    const config = getPaytmConfig();

    if (!isPaytmConfigured()) {
      return {
        success: false,
        isFixture: true,
        error: 'Paytm credentials not configured in environment. System operating in development sandbox mode.',
      };
    }

    const payloadString = JSON.stringify(body);
    const signature = this.generateSignature(payloadString, config.merchantKey);

    try {
      const response = await fetch(`${config.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mid': config.mid,
          'x-checksum': signature,
        },
        body: payloadString,
      });

      if (!response.ok) {
        return {
          success: false,
          isFixture: false,
          error: `Paytm Gateway returned HTTP ${response.status}`,
        };
      }

      const resJson = await response.json();
      return {
        success: true,
        data: resJson,
        isFixture: false,
      };
    } catch (err: any) {
      console.error(`[Paytm Client] Request to ${endpoint} failed:`, err.message);
      return {
        success: false,
        isFixture: false,
        error: err.message || 'Network connection to Paytm Gateway failed',
      };
    }
  }

  /**
   * Returns current integration health status
   */
  public static getIntegrationStatus() {
    const configured = isPaytmConfigured();
    const config = getPaytmConfig();

    return {
      connected: configured,
      mode: configured ? config.environment : 'DEVELOPMENT_FIXTURE_MODE',
      midMasked: configured ? `${config.mid.slice(0, 4)}••••${config.mid.slice(-3)}` : 'NOT_CONFIGURED',
      gatewayBaseUrl: config.baseUrl,
      capabilities: [
        'Soundbox Instant Voice Push',
        'Dynamic QR Generation',
        'Midnight Batch Settlement Ingestion',
        'Chargeback & Dispute Ingestion',
        'Signed Webhook Idempotency Store',
      ],
      notice: configured
        ? 'Connected to official Paytm Gateway API endpoint.'
        : 'Running in safe local development mode with verified SQLite fixtures. Connect PAYTM_MID and PAYTM_MERCHANT_KEY for live gateway sync.',
    };
  }
}
