import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { merchantDB } from './src/server/mockDb.ts';
import { DeterministicAnalyticsEngine } from './src/server/analyticsEngine.ts';
import { AgentOrchestrator } from './src/server/agentOrchestrator.ts';
import { DailyBriefing, IndianLanguage } from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Request logger for audit and debugging
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // ----------------------------------------------------
  // API Endpoints
  // ----------------------------------------------------

  // 1. Merchant Identity & Tenant Selection
  app.get('/api/merchants', (req, res) => {
    try {
      const merchants = merchantDB.getMerchants();
      res.json({ success: true, data: merchants });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/merchants/:merchantId', (req, res) => {
    try {
      const merchant = merchantDB.getMerchant(req.params.merchantId);
      res.json({ success: true, data: merchant });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  });

  // 2. Financial Overview
  app.get('/api/overview/:merchantId', (req, res) => {
    try {
      const overview = DeterministicAnalyticsEngine.getFinancialOverview(req.params.merchantId);
      res.json({ success: true, data: overview });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  });

  // 3. Transactions & Payment Intelligence
  app.get('/api/transactions/:merchantId', (req, res) => {
    try {
      const transactions = merchantDB.getTransactions(req.params.merchantId);
      res.json({ success: true, data: transactions });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  });

  app.post('/api/transactions/:merchantId', (req, res) => {
    try {
      const merchantId = req.params.merchantId;
      const { amount, paymentMethod, customerName, customerVpa } = req.body;
      const newTxn = merchantDB.addTransaction(merchantId, {
        id: `TXN-${Date.now().toString().slice(-4)}`,
        merchantId,
        orderId: `ORD-${Date.now().toString().slice(-6)}`,
        amount: Number(amount) || 100,
        feeMdr: paymentMethod.includes('CARD') ? Math.round(amount * 0.01) : 0,
        gstOnMdr: paymentMethod.includes('CARD') ? Math.round(amount * 0.0018) : 0,
        netSettlementAmount: paymentMethod.includes('CARD') ? Math.round(amount * 0.9882) : Number(amount),
        paymentMethod: paymentMethod || 'SOUNDBOX_UPI',
        customerName: customerName || 'Retail Customer',
        customerVpa: customerVpa || 'customer@upi',
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        settlementBatchId: 'SETTLE-TODAY-01',
      });

      merchantDB.addAuditLog(merchantId, {
        actor: 'Paytm Payment Gateway / Soundbox',
        role: 'SYSTEM',
        eventType: 'PAYMENT_RECEIVED',
        details: `Payment received: ₹${newTxn.amount} via ${newTxn.paymentMethod} from ${newTxn.customerName}`,
      });

      res.json({ success: true, data: newTxn });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 4. Settlement Reconciliation
  app.get('/api/settlements/:merchantId', (req, res) => {
    try {
      const settlements = merchantDB.getSettlements(req.params.merchantId);
      const reconciliation = DeterministicAnalyticsEngine.reconcileSettlements(req.params.merchantId);
      res.json({ success: true, data: { settlements, reconciliation } });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  });

  // 5. Cash Flow & Credit Intelligence
  app.get('/api/cashflow/:merchantId', (req, res) => {
    try {
      const cashflow = DeterministicAnalyticsEngine.getCashFlowForecast(req.params.merchantId);
      res.json({ success: true, data: cashflow });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  });

  // 6. Customer Khata Book
  app.get('/api/khata/:merchantId', (req, res) => {
    try {
      const analysis = DeterministicAnalyticsEngine.getKhataAnalysis(req.params.merchantId);
      res.json({ success: true, data: analysis });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  });

  app.post('/api/khata/:merchantId', (req, res) => {
    try {
      const merchantId = req.params.merchantId;
      const { customerName, customerPhone, amount, dueDate, notes } = req.body;
      const newRecord = merchantDB.addCreditRecord(merchantId, {
        id: `KHATA-${Date.now().toString().slice(-4)}`,
        merchantId,
        customerName,
        customerPhone,
        outstandingBalance: Number(amount) || 0,
        totalCreditGiven: Number(amount) || 0,
        totalRepaid: 0,
        lastPurchaseDate: new Date().toISOString().slice(0, 10),
        dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        status: 'CURRENT',
        notes: notes || 'New store credit ledger entry.',
      });

      merchantDB.addAuditLog(merchantId, {
        actor: 'Merchant Operator',
        role: 'OWNER',
        eventType: 'KHATA_ENTRY_CREATED',
        details: `Customer credit recorded: ₹${newRecord.outstandingBalance} for ${newRecord.customerName}`,
      });

      res.json({ success: true, data: newRecord });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 7. Growth Intelligence
  app.get('/api/growth/:merchantId', (req, res) => {
    try {
      const insights = merchantDB.getGrowthInsights(req.params.merchantId);
      res.json({ success: true, data: insights });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  });

  // 8. Action Center Management
  app.get('/api/actions/:merchantId', (req, res) => {
    try {
      const actions = merchantDB.getActions(req.params.merchantId);
      res.json({ success: true, data: actions });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  });

  app.post('/api/actions/:merchantId', (req, res) => {
    try {
      const merchantId = req.params.merchantId;
      const action = merchantDB.createAction(merchantId, req.body);
      res.json({ success: true, data: action });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.patch('/api/actions/:merchantId/:actionId', (req, res) => {
    try {
      const { merchantId, actionId } = req.params;
      const { status, actor } = req.body;
      const updated = merchantDB.updateActionStatus(merchantId, actionId, status, actor || 'Merchant Owner');
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 9. Immutable Audit Logs
  app.get('/api/audit/:merchantId', (req, res) => {
    try {
      const logs = merchantDB.getAuditLogs(req.params.merchantId);
      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  });

  // 10. Daily Business Briefings
  app.get('/api/briefings/:merchantId', (req, res) => {
    try {
      const briefings = merchantDB.getBriefings(req.params.merchantId);
      res.json({ success: true, data: briefings });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  });

  app.post('/api/briefings/:merchantId/generate', (req, res) => {
    try {
      const merchantId = req.params.merchantId;
      const language: IndianLanguage = req.body.language || 'hi';
      const overview = DeterministicAnalyticsEngine.getFinancialOverview(merchantId);
      const khata = DeterministicAnalyticsEngine.getKhataAnalysis(merchantId);

      const todayStr = new Date().toISOString().slice(0, 10);
      const briefing: DailyBriefing = {
        id: `BRIEF-${Date.now()}`,
        merchantId,
        date: todayStr,
        language,
        todayCollections: overview.todayCollections,
        todayTransactions: overview.todayTransactionsCount,
        settlementStatus: `₹${overview.inTransitSettlementAmount.toLocaleString('en-IN')} इन-ट्रांजिट है। रात 11:30 बजे बैंक में जमा हो जाएगा।`,
        settledAmount: overview.settledAmount,
        pendingAmount: overview.pendingSettlementAmount,
        refundsCount: overview.refundsCount,
        refundsAmount: overview.refundsAmount,
        exceptionsNotice: overview.discrepanciesCount > 0 ? `${overview.discrepanciesCount} विसंगति की जांच चल रही है।` : 'शून्य विसंगति, सभी लेनदेन सत्यापित।',
        cashFlowHighlight: 'दैनिक ₹350 लोन ईएमआई कटने के बाद कल का शुद्ध प्रवाह ₹28,000+ रहेगा।',
        creditOverdueSummary: `खाता बही में ₹${khata.overdueAmount.toLocaleString('en-IN')} बकाया देय तिथि पार कर चुका है।`,
        keyGrowthOpportunity: 'शाम के पीक आवर्स (6:30 - 9:00 PM) में 68% बिक्री हो रही है।',
        spokenAudioText: `आज की कुल बिक्री ${overview.todayCollections} रुपये रही। ${overview.inTransitSettlementAmount} रुपये आज रात आपके बैंक खाते में जमा हो जाएंगे।`,
        audioDurationSeconds: 24,
      };

      merchantDB.saveBriefing(merchantId, briefing);
      res.json({ success: true, data: briefing });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 11. Agentic AI & Voice Query Interface
  app.post('/api/voice/query', async (req, res) => {
    try {
      const { merchantId, query, language, audioBase64 } = req.body;
      if (!merchantId || !query) {
        return res.status(400).json({ success: false, error: 'MerchantId and query are required.' });
      }

      const result = await AgentOrchestrator.processMerchantQuery({
        merchantId,
        query,
        language: language || 'hi',
        audioBase64,
      });

      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // Vite Integration (Dev Middleware or Production Static)
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Paytm Merchant Intelligence] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
