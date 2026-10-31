import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { AppDatabase } from './src/server/db/database.ts';
import { AuthService } from './src/server/auth/authService.ts';
import { FinancialEngine } from './src/server/services/financialEngine.ts';
import { KhataService } from './src/server/services/khataService.ts';
import { ActionService } from './src/server/services/actionService.ts';
import { MonetizationService } from './src/server/services/monetizationService.ts';
import { SarvamAgentService } from './src/server/services/sarvam/agentService.ts';
import { SpeechToTextService } from './src/server/services/sarvam/speechToText.ts';
import { TextToSpeechService } from './src/server/services/sarvam/textToSpeech.ts';
import { BriefService } from './src/server/services/briefService.ts';
import { GeminiAnalyticsService } from './src/server/services/geminiAnalyticsService.ts';
import { OutboundCallService } from './src/server/services/sarvam/outboundCallService.ts';
import { DataSanitizer } from './src/server/services/dataSanitizer.ts';
import { PaytmClient } from './src/server/integrations/paytm/client.ts';
import { PaytmWebhookHandler } from './src/server/integrations/paytm/webhooks.ts';
import { IndianLanguage } from './src/types/index.ts';
import { SecurityMiddleware } from './src/server/middleware/securityMiddleware.ts';
import { PaymentVerificationService } from './src/server/services/paymentVerificationService.ts';
import { MerchantFeeAdvisor } from './src/server/services/fees/merchantFeeAdvisor.ts';
import { DeviceHealthService } from './src/server/services/devices/deviceHealthService.ts';
import { RepaymentScenarioEngine } from './src/server/services/loans/repaymentScenarioEngine.ts';
import { CustomerSegmentationService } from './src/server/services/marketing/customerSegmentationService.ts';
import { PaymentLinkService } from './src/server/services/payments/paymentLinkService.ts';
import { DailyBriefScheduler } from './src/server/services/scheduler/dailyBriefScheduler.ts';
import { AiCostService } from './src/server/services/ai/aiCostService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createExpressApp() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // Security Headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options)
  app.use(SecurityMiddleware.applySecurityHeaders);

  // Contextual Rate Limiting
  const authLimiter = SecurityMiddleware.createRateLimiter(20, 60);
  const voiceLimiter = SecurityMiddleware.createRateLimiter(60, 60);
  const generalLimiter = SecurityMiddleware.createRateLimiter(240, 60);
  app.use('/api/auth', authLimiter);
  app.use('/api/voice', voiceLimiter);
  app.use('/api', generalLimiter);

  // Initialize SQLite database schema and seed data
  AppDatabase.getDB();

  // Audit and diagnostics request logger
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API ${new Date().toISOString().slice(11, 19)}] ${req.method} ${req.path}`);
    }
    next();
  });

  // ----------------------------------------------------
  // Authentication & Session Routes
  // ----------------------------------------------------
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password are required.' });
      }

      const authResult = AuthService.authenticateUser(username, password);
      if (!authResult) {
        return res.status(401).json({ success: false, error: 'Invalid merchant credentials.' });
      }

      res.json({ success: true, data: authResult });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 1. Merchant Identity & Tenant Selection
  // ----------------------------------------------------
  app.get('/api/merchants', (req, res) => {
    try {
      const db = AppDatabase.getDB();
      const merchants = db.prepare('SELECT * FROM merchants ORDER BY business_name ASC').all();
      res.json({
        success: true,
        data: merchants.map((m: any) => ({
          id: m.id,
          businessName: m.business_name,
          ownerName: m.owner_name,
          email: m.email,
          phone: m.phone,
          businessCategory: m.business_category,
          gstin: m.gstin,
          pan: m.pan,
          mid: m.mid,
          terminalId: m.terminal_id,
          primaryLanguage: m.primary_language || 'en',
          settlementAccount: {
            bankName: m.bank_name,
            accountNumber: m.bank_account_number,
            ifsc: m.bank_ifsc,
            accountHolder: m.bank_account_holder,
          },
          deviceInfo: {
            soundboxSerial: m.soundbox_serial,
            soundboxModel: m.soundbox_model,
            batteryLevel: m.soundbox_battery,
            networkStatus: m.soundbox_status,
            soundVolume: m.soundbox_volume,
            languageAnnouncement: m.primary_language || 'en',
          },
          role: 'OWNER',
        })),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/merchants/:merchantId', (req, res) => {
    try {
      const db = AppDatabase.getDB();
      const m = db.prepare('SELECT * FROM merchants WHERE id = ?').get(req.params.merchantId) as any;
      if (!m) {
        return res.status(404).json({ success: false, error: 'Merchant not found.' });
      }

      res.json({
        success: true,
        data: {
          id: m.id,
          businessName: m.business_name,
          ownerName: m.owner_name,
          email: m.email,
          phone: m.phone,
          businessCategory: m.business_category,
          gstin: m.gstin,
          pan: m.pan,
          mid: m.mid,
          terminalId: m.terminal_id,
          primaryLanguage: m.primary_language || 'en',
          settlementAccount: {
            bankName: m.bank_name,
            accountNumber: m.bank_account_number,
            ifsc: m.bank_ifsc,
            accountHolder: m.bank_account_holder,
          },
          deviceInfo: {
            soundboxSerial: m.soundbox_serial,
            soundboxModel: m.soundbox_model,
            batteryLevel: m.soundbox_battery,
            networkStatus: m.soundbox_status,
            soundVolume: m.soundbox_volume,
            languageAnnouncement: m.primary_language || 'en',
          },
          role: 'OWNER',
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update merchant profile language preference
  app.patch('/api/merchants/:merchantId/language', (req, res) => {
    try {
      const { language } = req.body;
      const db = AppDatabase.getDB();
      db.prepare('UPDATE merchants SET primary_language = ? WHERE id = ?').run(language, req.params.merchantId);
      res.json({ success: true, language });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 2. Financial Overview & Daily Collections
  // ----------------------------------------------------
  app.get('/api/overview/:merchantId', (req, res) => {
    try {
      const overview = FinancialEngine.getFinancialOverview(req.params.merchantId);
      res.json({ success: true, data: overview });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 3. Transactions & Instant Payments
  // ----------------------------------------------------
  app.get('/api/transactions/:merchantId', (req, res) => {
    try {
      const db = AppDatabase.getDB();
      const txns = db.prepare(`
        SELECT * FROM transactions 
        WHERE merchant_id = ? 
        ORDER BY timestamp DESC 
        LIMIT 100
      `).all(req.params.merchantId) as any[];

      res.json({
        success: true,
        data: txns.map((t) => ({
          id: t.id,
          merchantId: t.merchant_id,
          orderId: t.order_id,
          amount: Number(t.amount),
          feeMdr: Number(t.fee_mdr),
          gstOnMdr: Number(t.gst_on_mdr),
          netSettlementAmount: Number(t.net_settlement_amount),
          paymentMethod: t.payment_method,
          customerName: t.customer_name,
          customerVpa: t.customer_vpa,
          timestamp: t.timestamp,
          status: t.status,
          settlementBatchId: t.settlement_batch_id,
          isFlaggedForDiscrepancy: Boolean(t.is_flagged_for_discrepancy),
          discrepancyReason: t.discrepancy_reason,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/transactions/:merchantId', (req, res) => {
    try {
      const merchantId = req.params.merchantId;
      const { amount, paymentMethod, customerName, customerVpa } = req.body;
      const numAmt = Number(amount) || 100;
      const isCard = (paymentMethod || '').includes('CARD');
      const feeMdr = isCard ? Math.round(numAmt * 0.01) : 0;
      const gstOnMdr = isCard ? Math.round(numAmt * 0.0018) : 0;
      const net = numAmt - feeMdr - gstOnMdr;
      const now = new Date().toISOString();
      const id = `TXN-${Date.now().toString().slice(-4)}`;
      const orderId = `ORD-${Date.now().toString().slice(-6)}`;

      const db = AppDatabase.getDB();
      db.prepare(`
        INSERT INTO transactions (
          id, merchant_id, order_id, amount, fee_mdr, gst_on_mdr, 
          net_settlement_amount, payment_method, customer_name, customer_vpa, 
          timestamp, status, settlement_batch_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_SETTLEMENT', 'SETTLE-TODAY-01')
      `).run(
        id,
        merchantId,
        orderId,
        numAmt,
        feeMdr,
        gstOnMdr,
        net,
        paymentMethod || 'SOUNDBOX_UPI',
        customerName || 'Retail Customer',
        customerVpa || 'customer@upi',
        now
      );

      res.json({
        success: true,
        data: {
          id,
          merchantId,
          orderId,
          amount: numAmt,
          feeMdr,
          gstOnMdr,
          netSettlementAmount: net,
          paymentMethod: paymentMethod || 'SOUNDBOX_UPI',
          customerName: customerName || 'Retail Customer',
          customerVpa: customerVpa || 'customer@upi',
          timestamp: now,
          status: 'PENDING_SETTLEMENT',
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 4. Settlement Reconciliation (Problem A)
  // ----------------------------------------------------
  app.get('/api/settlements/:merchantId', (req, res) => {
    try {
      const reconciliation = FinancialEngine.reconcileSettlements(req.params.merchantId);
      res.json({
        success: true,
        data: {
          settlements: reconciliation.batches,
          reconciliation,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 5. Cash Flow & Financial Planning (Problem C)
  // ----------------------------------------------------
  app.get('/api/cashflow/:merchantId', (req, res) => {
    try {
      const cashflow = FinancialEngine.getCashFlowForecast(req.params.merchantId);
      res.json({ success: true, data: cashflow });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 6. Customer Khata Book & Dues (Problem D)
  // ----------------------------------------------------
  app.get('/api/khata/:merchantId', (req, res) => {
    try {
      const analysis = KhataService.getKhataOverview(req.params.merchantId);
      res.json({ success: true, data: analysis });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/khata/:merchantId', (req, res) => {
    try {
      const overview = KhataService.addCreditRecord(req.params.merchantId, req.body);
      res.json({ success: true, data: overview });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/khata/:merchantId/repay', (req, res) => {
    try {
      const { customerId, amount, paymentMode, note } = req.body;
      const overview = KhataService.recordRepayment(
        req.params.merchantId,
        customerId,
        Number(amount),
        paymentMode,
        note
      );
      res.json({ success: true, data: overview });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/khata/:merchantId/remind/:customerId', (req, res) => {
    try {
      const draft = KhataService.prepareReminderAction(req.params.merchantId, req.params.customerId);
      res.json({ success: true, data: draft });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 7. Growth & Declining Sales Intelligence (Problem E)
  // ----------------------------------------------------
  app.get('/api/growth/:merchantId', (req, res) => {
    try {
      const declineAnalysis = FinancialEngine.getSalesDeclineAnalysis(req.params.merchantId);
      res.json({ success: true, data: declineAnalysis.recommendations, fullAnalysis: declineAnalysis });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 8. Action Center Management (Sensitive Actions Workflow)
  // ----------------------------------------------------
  app.get('/api/actions/:merchantId', (req, res) => {
    try {
      const actions = ActionService.getActions(req.params.merchantId);
      res.json({ success: true, data: actions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/actions/:merchantId', (req, res) => {
    try {
      const action = ActionService.createAction(req.params.merchantId, req.body);
      res.json({ success: true, data: action });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.patch('/api/actions/:merchantId/:actionId', (req, res) => {
    try {
      const { merchantId, actionId } = req.params;
      const { status, actor } = req.body;
      const updated = ActionService.updateActionStatus(merchantId, actionId, status, actor || 'Merchant Owner');
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 9. Paytm Monetization: Subscriptions
  // ----------------------------------------------------
  app.get('/api/monetization/subscriptions/:merchantId', (req, res) => {
    try {
      const sub = MonetizationService.getSubscription(req.params.merchantId);
      res.json({ success: true, data: sub });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/monetization/subscriptions/:merchantId/upgrade', (req, res) => {
    try {
      const sub = MonetizationService.upgradeSubscription(req.params.merchantId, req.body.planTier);
      res.json({ success: true, data: sub });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 10. Paytm Monetization: Lending Partner Loan Discovery
  // ----------------------------------------------------
  app.get('/api/monetization/loans/:merchantId', (req, res) => {
    try {
      const loanInfo = MonetizationService.getLoanProducts(req.params.merchantId);
      res.json({ success: true, data: loanInfo });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/monetization/loans/:merchantId/apply', (req, res) => {
    try {
      const application = MonetizationService.applyForLoan(req.params.merchantId, req.body);
      res.json({ success: true, data: application });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 11. Paytm Monetization: Marketing & Advertising Campaigns
  // ----------------------------------------------------
  app.get('/api/monetization/campaigns/:merchantId', (req, res) => {
    try {
      const campaigns = MonetizationService.getCampaigns(req.params.merchantId);
      res.json({ success: true, data: campaigns });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/monetization/campaigns/:merchantId', (req, res) => {
    try {
      const campaigns = MonetizationService.createCampaignDraft(req.params.merchantId, req.body);
      res.json({ success: true, data: campaigns });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/monetization/campaigns/:merchantId/approve', (req, res) => {
    try {
      const campaigns = MonetizationService.approveCampaign(
        req.params.merchantId,
        req.body.campaignId,
        req.body.approverName || 'Sunil Sharma'
      );
      res.json({ success: true, data: campaigns });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 12. Sarvam AI Voice Agent Integration
  // ----------------------------------------------------
  // Speech-to-Text: Dedicated Saaras v4 STT Endpoint
  app.post('/api/voice/stt', async (req, res) => {
    try {
      const { audioBase64, language = 'en', mimeType = 'audio/wav' } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ success: false, error: 'audioBase64 is required.' });
      }

      const result = await SpeechToTextService.transcribeAudio(audioBase64, language, mimeType);
      res.json({
        success: true,
        transcript: result.transcript,
        detectedLanguage: result.detectedLanguage,
      });
    } catch (err: any) {
      console.error('[Voice STT Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Text-to-Speech: Dedicated Bulbul v4 Flash TTS Endpoint
  app.post('/api/voice/tts', async (req, res) => {
    try {
      const { text, language = 'en', speaker } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ success: false, error: 'text is required.' });
      }

      const result = await TextToSpeechService.synthesizeSpeech(text, language, speaker);
      res.json({
        success: true,
        text,
        language,
        audioBase64: result.audioBase64,
      });
    } catch (err: any) {
      console.error('[Voice TTS Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Voice Query (Full Flow: STT -> Intent & Facts -> Sarvam LLM/Deterministic -> TTS)
  app.post('/api/voice/query', async (req, res) => {
    try {
      const { merchantId, query, language, audioBase64 } = req.body;
      if (!merchantId) {
        return res.status(400).json({ success: false, error: 'MerchantId is required.' });
      }

      const result = await SarvamAgentService.processVoiceQuery({
        merchantId,
        query,
        language: language || 'en',
        audioBase64,
      });

      res.json({ success: true, data: result });
    } catch (err: any) {
      console.error('[Voice Query Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 13. Paytm Gateway Integration & Webhooks
  // ----------------------------------------------------
  app.get('/api/integrations/paytm/status', (req, res) => {
    try {
      const status = PaytmClient.getIntegrationStatus();
      res.json({ success: true, data: status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/integrations/paytm/webhook', (req, res) => {
    try {
      const result = PaytmWebhookHandler.handleWebhook(req.body);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 14. Spoken Daily Briefings (Grounded Facts + Bulbul v4 Voice)
  // ----------------------------------------------------
  app.get('/api/briefings/:merchantId', async (req, res) => {
    try {
      const lang = (req.query.lang as IndianLanguage) || 'en';
      const briefing = await BriefService.getLatestBriefing(req.params.merchantId, lang);
      res.json({ success: true, data: [briefing] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/briefings/:merchantId/generate', async (req, res) => {
    try {
      const { language = 'en' } = req.body;
      const briefing = await BriefService.generateDailyBrief(req.params.merchantId, language);
      res.json({ success: true, data: briefing });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 15. Gemini Analytics Engine (Data -> Insight)
  // ----------------------------------------------------
  app.get('/api/analytics/gemini/:merchantId', async (req, res) => {
    try {
      const lang = (req.query.lang as IndianLanguage) || 'en';
      const report = await GeminiAnalyticsService.generateMerchantInsights(req.params.merchantId, lang);
      res.json({ success: true, data: report });
    } catch (err: any) {
      console.error('[Gemini Analytics Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/analytics/gemini/:merchantId/refresh', async (req, res) => {
    try {
      const { language = 'en' } = req.body;
      const report = await GeminiAnalyticsService.generateMerchantInsights(req.params.merchantId, language);
      res.json({ success: true, data: report });
    } catch (err: any) {
      console.error('[Gemini Analytics Refresh Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 16. Sarvam AI Automated Customer Voice Outreach (Insight -> Action)
  // ----------------------------------------------------
  app.get('/api/outreach/calls/:merchantId', (req, res) => {
    try {
      const calls = OutboundCallService.getCalls(req.params.merchantId);
      res.json({ success: true, data: calls });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/outreach/calls/:merchantId/dispatch', async (req, res) => {
    try {
      const {
        customerId,
        recipientName,
        recipientPhone,
        callPurpose = 'PAYMENT_REMINDER',
        language = 'en',
        scriptText,
        actionId,
      } = req.body;

      if (!recipientName || !recipientPhone || !scriptText) {
        return res.status(400).json({
          success: false,
          error: 'recipientName, recipientPhone, and scriptText are required.',
        });
      }

      // Sanitize phone number before dispatch
      const sanitizedPhone = DataSanitizer.sanitizePhone(recipientPhone);

      const callResult = await OutboundCallService.dispatchCustomerCall({
        merchantId: req.params.merchantId,
        customerId,
        recipientName: DataSanitizer.cleanText(recipientName),
        recipientPhone: sanitizedPhone,
        callPurpose,
        language,
        scriptText,
        actionId,
      });

      res.json({ success: true, data: callResult });
    } catch (err: any) {
      console.error('[Outbound Call Dispatch Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 17. Production Live Data Ingestion & Sanitization Protocols
  // ----------------------------------------------------
  app.post('/api/production/ingest/transaction/:merchantId', (req, res) => {
    try {
      const merchantId = req.params.merchantId;
      const { amount, paymentMethod, customerName, customerVpa, customerPhone } = req.body;

      const numAmt = DataSanitizer.sanitizeAmount(amount);
      const vpa = DataSanitizer.sanitizeVpa(customerVpa);
      const cleanName = DataSanitizer.cleanText(customerName) || 'Walk-in Retail Customer';
      const cleanPhone = customerPhone ? DataSanitizer.sanitizePhone(customerPhone) : null;

      const isCard = (paymentMethod || '').includes('CARD');
      const feeMdr = isCard ? Math.round(numAmt * 0.01) : 0;
      const gstOnMdr = isCard ? Math.round(numAmt * 0.0018) : 0;
      const net = numAmt - feeMdr - gstOnMdr;

      const now = new Date().toISOString();
      const id = `TXN-LIVE-${Date.now().toString().slice(-6)}`;
      const orderId = `ORD-${Date.now().toString().slice(-8)}`;

      const db = AppDatabase.getDB();
      db.prepare(`
        INSERT INTO transactions (
          id, merchant_id, order_id, amount, fee_mdr, gst_on_mdr, 
          net_settlement_amount, payment_method, customer_name, customer_vpa, 
          timestamp, status, settlement_batch_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_SETTLEMENT', 'SETTLE-TODAY-01')
      `).run(
        id,
        merchantId,
        orderId,
        numAmt,
        feeMdr,
        gstOnMdr,
        net,
        paymentMethod || 'SOUNDBOX_UPI',
        cleanName,
        vpa,
        now
      );

      res.json({
        success: true,
        data: {
          id,
          orderId,
          amount: numAmt,
          netSettlementAmount: net,
          customerName: cleanName,
          status: 'PENDING_SETTLEMENT',
          timestamp: now,
        },
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/production/ingest/khata/:merchantId', (req, res) => {
    try {
      const merchantId = req.params.merchantId;
      const { customerName, customerPhone, amount, dueDate, notes } = req.body;

      const numAmt = DataSanitizer.sanitizeAmount(amount);
      const cleanPhone = DataSanitizer.sanitizePhone(customerPhone);
      const cleanName = DataSanitizer.cleanText(customerName);
      const cleanNotes = DataSanitizer.cleanText(notes);

      const overview = KhataService.addCreditRecord(merchantId, {
        customerName: cleanName,
        customerPhone: cleanPhone,
        amount: numAmt,
        dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        notes: cleanNotes,
      });

      res.json({ success: true, data: overview });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/production/purge-synthetic/:merchantId', (req, res) => {
    try {
      const merchantId = req.params.merchantId;
      const db = AppDatabase.getDB();

      // Purge any mock prefix items for live environment
      const deletedTxns = db.prepare("DELETE FROM transactions WHERE merchant_id = ? AND id NOT LIKE 'TXN-LIVE-%'").run(merchantId);
      res.json({
        success: true,
        message: 'Synthetic data purged. Ready for 100% live POS & Soundbox ingestion.',
        purgedTransactionsCount: deletedTxns.changes,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // Payment Verification (Part 5)
  // ----------------------------------------------------
  app.post('/api/payments/verify/:merchantId', (req, res) => {
    try {
      const { amount, payerQuery, timeWindowHours } = req.body;
      const result = PaymentVerificationService.verifyPayment({
        merchantId: req.params.merchantId,
        amount: Number(amount) || 0,
        payerQuery,
        timeWindowHours: Number(timeWindowHours) || 24,
      });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // Configurable UPI Fee Advisor (Part 4 / 2026 Framework)
  // ----------------------------------------------------
  app.get('/api/fees/assessment/:merchantId', (req, res) => {
    try {
      const assessment = MerchantFeeAdvisor.evaluateMerchantFees(req.params.merchantId);
      res.json({ success: true, data: assessment });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/fees/policies', (req, res) => {
    try {
      MerchantFeeAdvisor.initDefaultPolicies();
      const db = AppDatabase.getDB();
      const policies = db.prepare('SELECT * FROM merchant_fee_policies ORDER BY effective_from DESC').all();
      res.json({ success: true, data: policies });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // Device Health & Operations Monitoring (Part 6)
  // ----------------------------------------------------
  app.get('/api/devices/health/:merchantId', (req, res) => {
    try {
      const health = DeviceHealthService.getDeviceHealth(req.params.merchantId);
      res.json({ success: true, data: health });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/devices/support-ticket/:merchantId', (req, res) => {
    try {
      const { serialNumber, issueDescription } = req.body;
      const ticket = DeviceHealthService.createSupportTicket(
        req.params.merchantId,
        serialNumber || 'UNKNOWN_DEVICE',
        issueDescription || 'Soundbox connectivity issue reported.'
      );
      res.json({ success: true, data: ticket });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // Repayment & Cash-Flow Scenarios (Part 7)
  // ----------------------------------------------------
  app.get('/api/loans/scenarios/:merchantId', (req, res) => {
    try {
      const scenarios = RepaymentScenarioEngine.generateScenarios(req.params.merchantId);
      res.json({ success: true, data: scenarios });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // Targeted Customer Marketing (Part 8)
  // ----------------------------------------------------
  app.get('/api/marketing/segments/:merchantId', (req, res) => {
    try {
      const segments = CustomerSegmentationService.computeSegments(req.params.merchantId);
      res.json({ success: true, data: segments });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/marketing/campaigns/:merchantId/dispatch', (req, res) => {
    try {
      const { segmentCode, customMessage, approverName } = req.body;
      const result = CustomerSegmentationService.dispatchCampaign({
        merchantId: req.params.merchantId,
        segmentCode: segmentCode || 'REGULAR',
        customMessage,
        approverName: approverName || 'Merchant Owner',
      });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // Authorized Payment Links & Autopay Mandates (Part 9)
  // ----------------------------------------------------
  app.post('/api/payments/links/:merchantId', (req, res) => {
    try {
      const { customerId, customerName, customerPhone, amount, purpose } = req.body;
      const link = PaymentLinkService.createPaymentLink({
        merchantId: req.params.merchantId,
        customerId,
        customerName: customerName || 'Retail Customer',
        customerPhone: customerPhone || '+91 98450 12890',
        amount: Number(amount) || 100,
        purpose,
      });
      res.json({ success: true, data: link });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/payments/autopay/mandate/:merchantId', (req, res) => {
    try {
      const { customerId, maxAmount, frequency } = req.body;
      const mandate = PaymentLinkService.createAutopayMandate({
        merchantId: req.params.merchantId,
        customerId,
        maxAmount: Number(maxAmount) || 2000,
        frequency: frequency || 'AS_PRESENTED',
      });
      res.json({ success: true, data: mandate });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.get('/api/payments/agent/permissions/:merchantId', (req, res) => {
    try {
      const evaluation = PaymentLinkService.evaluateAutonomousAgentPayment(
        req.params.merchantId,
        Number(req.query.amount) || 500
      );
      res.json({ success: true, data: evaluation });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // Proactive Daily Brief Schedule & Archive (Part 3)
  // ----------------------------------------------------
  app.get('/api/briefings/schedule/:merchantId', (req, res) => {
    try {
      const config = DailyBriefScheduler.getScheduleConfig(req.params.merchantId);
      res.json({ success: true, data: config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/briefings/schedule/:merchantId', (req, res) => {
    try {
      const { openingTime, briefingTime, preferredLanguage, isEnabled } = req.body;
      const db = AppDatabase.getDB();
      db.prepare(`
        UPDATE daily_brief_schedules 
        SET opening_time = COALESCE(?, opening_time),
            briefing_time = COALESCE(?, briefing_time),
            preferred_language = COALESCE(?, preferred_language),
            is_enabled = COALESCE(?, is_enabled),
            updated_at = CURRENT_TIMESTAMP
        WHERE merchant_id = ?
      `).run(
        openingTime || null,
        briefingTime || null,
        preferredLanguage || null,
        isEnabled !== undefined ? (isEnabled ? 1 : 0) : null,
        req.params.merchantId
      );
      const updated = DailyBriefScheduler.getScheduleConfig(req.params.merchantId);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.get('/api/briefings/archive/:merchantId', (req, res) => {
    try {
      const archive = DailyBriefScheduler.getBriefArchive(req.params.merchantId);
      res.json({ success: true, data: archive });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/briefings/scheduler/trigger', async (req, res) => {
    try {
      const runResult = await DailyBriefScheduler.executeScheduledRun();
      res.json({ success: true, data: runResult });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // AI Metering & Operating Cost Intelligence (Part 11)
  // ----------------------------------------------------
  app.get('/api/admin/ai/cost-summary', (req, res) => {
    try {
      const summary = AiCostService.getCostSummary();
      res.json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/admin/ai/usage/:merchantId', (req, res) => {
    try {
      const summary = AiCostService.getCostSummary(req.params.merchantId);
      res.json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return app;
}

async function startServer() {
  const app = await createExpressApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Start background periodic brief scheduler
  DailyBriefScheduler.startBackgroundWorker();

  // ----------------------------------------------------
  // Vite Integration (Dev Middleware or Production Static)
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Merchant by GrowIOTA] Server running on http://0.0.0.0:${PORT} (merchant.growiota.in)`);
  });
}

// Start standalone if invoked directly
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
