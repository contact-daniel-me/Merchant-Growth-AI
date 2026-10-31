import { AppDatabase } from '../../db/database.ts';

export interface AiUsageEventInput {
  merchantId: string;
  modelName: string;
  feature: 'VOICE_ASSISTANT' | 'GEMINI_AUDIT' | 'DAILY_BRIEF' | 'OUTBOUND_CALL';
  inputTokens?: number;
  outputTokens?: number;
  sttAudioSeconds?: number;
  ttsAudioSeconds?: number;
  latencyMs?: number;
  status?: 'SUCCESS' | 'FAILED';
}

export interface AiCostSummary {
  totalCostInr: number;
  totalEventsCount: number;
  costByFeature: Record<string, number>;
  costByModel: Record<string, number>;
  topActiveMerchants: Array<{ merchantId: string; totalCost: number; eventsCount: number }>;
  quotaUsagePercent: number;
  monthlyQuotaInr: number;
}

export class AiCostService {
  // Configurable pricing registry in INR (as of 2026)
  private static readonly PRICING = {
    // Gemini 2.5 Flash per 1000 tokens
    'gemini-2.5-flash': { inputPer1k: 0.006, outputPer1k: 0.024 },
    // Sarvam STT per second (₹0.15/min)
    'sarvam-stt': 0.0025,
    // Sarvam TTS Bulbul v4 per second (₹0.20/min)
    'sarvam-tts': 0.0033,
  };

  /**
   * Records a billable or telemetry AI usage event into SQLite with exact cost attribution
   */
  public static recordUsage(input: AiUsageEventInput): number {
    const db = AppDatabase.getDB();
    const id = `AI-EV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const inTokens = input.inputTokens || 0;
    const outTokens = input.outputTokens || 0;
    const sttSecs = input.sttAudioSeconds || 0;
    const ttsSecs = input.ttsAudioSeconds || 0;
    const latency = input.latencyMs || 0;
    const status = input.status || 'SUCCESS';

    // Calculate cost in INR
    let cost = 0;
    if (input.modelName.includes('gemini')) {
      cost += (inTokens / 1000) * this.PRICING['gemini-2.5-flash'].inputPer1k;
      cost += (outTokens / 1000) * this.PRICING['gemini-2.5-flash'].outputPer1k;
    }
    if (sttSecs > 0) {
      cost += sttSecs * this.PRICING['sarvam-stt'];
    }
    if (ttsSecs > 0) {
      cost += ttsSecs * this.PRICING['sarvam-tts'];
    }

    const roundedCost = Math.round(cost * 10000) / 10000;

    try {
      db.prepare(`
        INSERT INTO ai_usage_events (
          id, merchant_id, model_name, feature, input_tokens, output_tokens,
          stt_audio_seconds, tts_audio_seconds, estimated_cost_inr, latency_ms, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.merchantId,
        input.modelName,
        input.feature,
        inTokens,
        outTokens,
        sttSecs,
        ttsSecs,
        roundedCost,
        latency,
        status,
        now
      );
    } catch (e: any) {
      console.warn('[AiCostService] Failed to record AI usage event:', e.message);
    }

    return roundedCost;
  }

  /**
   * Retrieves aggregated AI cost intelligence and admin metrics
   */
  public static getCostSummary(merchantId?: string): AiCostSummary {
    const db = AppDatabase.getDB();

    let sql = 'SELECT * FROM ai_usage_events';
    const params: any[] = [];
    if (merchantId) {
      sql += ' WHERE merchant_id = ?';
      params.push(merchantId);
    }

    const rows = db.prepare(sql).all(...params) as any[];

    let totalCost = 0;
    const costByFeature: Record<string, number> = {};
    const costByModel: Record<string, number> = {};
    const merchantMap = new Map<string, { totalCost: number; count: number }>();

    for (const r of rows) {
      const c = Number(r.estimated_cost_inr || 0);
      totalCost += c;

      costByFeature[r.feature] = (costByFeature[r.feature] || 0) + c;
      costByModel[r.model_name] = (costByModel[r.model_name] || 0) + c;

      const curr = merchantMap.get(r.merchant_id) || { totalCost: 0, count: 0 };
      curr.totalCost += c;
      curr.count += 1;
      merchantMap.set(r.merchant_id, curr);
    }

    const topMerchants = Array.from(merchantMap.entries())
      .map(([mId, data]) => ({
        merchantId: mId,
        totalCost: Math.round(data.totalCost * 100) / 100,
        eventsCount: data.count,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);

    const monthlyQuota = 500.0; // ₹500 monthly cap per merchant
    const usagePercent = Math.min(100, Math.round((totalCost / monthlyQuota) * 100));

    return {
      totalCostInr: Math.round(totalCost * 100) / 100,
      totalEventsCount: rows.length,
      costByFeature,
      costByModel,
      topActiveMerchants: topMerchants,
      quotaUsagePercent: usagePercent,
      monthlyQuotaInr: monthlyQuota,
    };
  }
}
