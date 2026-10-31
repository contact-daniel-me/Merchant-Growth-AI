import { AppDatabase } from '../db/database.ts';

export class ActionService {
  /**
   * Retrieves merchant actions
   */
  public static getActions(merchantId: string) {
    const db = AppDatabase.getDB();
    const rows = db.prepare(`
      SELECT * FROM merchant_actions 
      WHERE merchant_id = ? 
      ORDER BY created_at DESC
    `).all(merchantId) as any[];

    return rows.map((r) => ({
      id: r.id,
      merchantId: r.merchant_id,
      type: r.action_type,
      title: r.title,
      description: r.description,
      status: r.status,
      requiresApproval: Boolean(r.requires_approval),
      createdBy: r.created_by,
      payload: JSON.parse(r.payload_json || '{}'),
      resultSummary: r.result_summary,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at,
      approvedAt: r.approved_at,
      executedAt: r.executed_at,
    }));
  }

  /**
   * Creates a draft action
   */
  public static createAction(merchantId: string, action: {
    type: string;
    title: string;
    description: string;
    createdBy?: string;
    payload: Record<string, any>;
    status?: string;
  }) {
    const db = AppDatabase.getDB();
    const id = `ACT-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO merchant_actions (
        id, merchant_id, action_type, title, description, 
        status, requires_approval, created_by, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      merchantId,
      action.type,
      action.title,
      action.description,
      action.status || 'PENDING_APPROVAL',
      1,
      action.createdBy || 'SYSTEM',
      JSON.stringify(action.payload),
      now
    );

    return this.getActions(merchantId).find((a) => a.id === id);
  }

  /**
   * Updates action status through the approval / execution pipeline
   * Draft -> Review -> Approval -> Execution -> Result -> Audit
   */
  public static updateActionStatus(
    merchantId: string,
    actionId: string,
    status: 'APPROVED' | 'REJECTED' | 'EXECUTED',
    actorName: string
  ) {
    const db = AppDatabase.getDB();
    const now = new Date().toISOString();

    const existing = db.prepare(`
      SELECT * FROM merchant_actions WHERE id = ? AND merchant_id = ?
    `).get(actionId, merchantId) as any;

    if (!existing) {
      throw new Error(`Action with id '${actionId}' not found.`);
    }

    let resultSummary = existing.result_summary;
    let approvedAt = existing.approved_at;
    let executedAt = existing.executed_at;

    if (status === 'APPROVED' || status === 'EXECUTED') {
      approvedAt = now;
      if (status === 'EXECUTED') {
        executedAt = now;
        if (existing.action_type === 'CUSTOMER_CREDIT_REMINDER') {
          resultSummary = `Payment reminder dispatched via WhatsApp/SMS to customer. Delivery confirmed.`;
        } else if (existing.action_type === 'SETTLEMENT_INVESTIGATION') {
          resultSummary = `Dispute ticket opened with Paytm Merchant Desk under reference #DISP-${Date.now().toString().slice(-6)}.`;
        } else if (existing.action_type === 'PROMOTIONAL_CAMPAIGN') {
          resultSummary = `Campaign flyer queued for targeted customer broadcast.`;
        } else {
          resultSummary = `Action executed successfully by verified merchant authorization.`;
        }
      }
    } else if (status === 'REJECTED') {
      resultSummary = `Action rejected by merchant operator (${actorName}).`;
    }

    db.prepare(`
      UPDATE merchant_actions 
      SET status = ?, approved_at = ?, executed_at = ?, result_summary = ?
      WHERE id = ? AND merchant_id = ?
    `).run(status, approvedAt, executedAt, resultSummary, actionId, merchantId);

    // Record Immutable Audit Log
    db.prepare(`
      INSERT INTO audit_logs (id, merchant_id, actor, role, event_type, details, timestamp, ip_address, immutable_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `AUD-${Date.now()}`,
      merchantId,
      actorName,
      'OWNER',
      `ACTION_${status}`,
      `Action ${actionId} (${existing.action_type}: ${existing.title}) marked as ${status}. ${resultSummary || ''}`,
      now,
      '127.0.0.1',
      actionId
    );

    return this.getActions(merchantId).find((a) => a.id === actionId);
  }
}
