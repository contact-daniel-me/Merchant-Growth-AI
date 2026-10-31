import { AppDatabase } from '../../db/database.ts';

export interface DeviceTelemetry {
  deviceId: string;
  merchantId: string;
  deviceType: string;
  serialNumber: string;
  model: string;
  batteryLevel: number;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  volume: number;
  language: string;
  lastPingAt: string;
  minutesSinceLastPing: number;
  batteryStatus: 'NORMAL' | 'LOW' | 'CRITICAL';
  connectionStatus: 'HEALTHY' | 'STALE' | 'OFFLINE';
}

export interface ChurnRiskFactor {
  factor: string;
  points: number;
  evidence: string;
}

export interface MerchantChurnRiskAssessment {
  merchantId: string;
  churnRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  compositeRiskScore: number; // 0 to 100
  explainableSignals: ChurnRiskFactor[];
  recommendedAction: string;
  evaluatedAt: string;
}

export interface DeviceHealthSummary {
  merchantId: string;
  devices: DeviceTelemetry[];
  overallHardwareStatus: 'ALL_ONLINE' | 'ATTENTION_NEEDED' | 'OFFLINE_CRITICAL';
  activeAlertsCount: number;
  alerts: Array<{
    type: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    recommendedStep: string;
  }>;
  churnRisk: MerchantChurnRiskAssessment;
}

export class DeviceHealthService {
  /**
   * Retrieves live device health, telemetry, and automated diagnostic alerts
   */
  public static getDeviceHealth(merchantId: string): DeviceHealthSummary {
    const db = AppDatabase.getDB();
    const rows = db.prepare('SELECT * FROM devices WHERE merchant_id = ?').all(merchantId) as any[];

    const now = Date.now();
    const alerts: Array<{
      type: string;
      severity: 'INFO' | 'WARNING' | 'CRITICAL';
      message: string;
      recommendedStep: string;
    }> = [];

    const devices: DeviceTelemetry[] = rows.map((r) => {
      const pingTime = new Date(r.last_ping_at).getTime();
      const minsDiff = Math.max(0, Math.floor((now - pingTime) / 60000));
      const battery = Number(r.battery_level ?? 100);

      let batteryStatus: 'NORMAL' | 'LOW' | 'CRITICAL' = 'NORMAL';
      if (battery < 10) batteryStatus = 'CRITICAL';
      else if (battery < 20) batteryStatus = 'LOW';

      let connectionStatus: 'HEALTHY' | 'STALE' | 'OFFLINE' = 'HEALTHY';
      if (minsDiff > 1440) connectionStatus = 'STALE';
      else if (minsDiff > 30 || r.status === 'OFFLINE') connectionStatus = 'OFFLINE';

      // Alert rule 1: Low battery
      if (batteryStatus === 'CRITICAL') {
        alerts.push({
          type: 'CRITICAL_BATTERY',
          severity: 'CRITICAL',
          message: `Soundbox battery is critically low (${battery}%). Device may turn off and miss payment chimes.`,
          recommendedStep: 'Connect Soundbox to the 5V Type-C charger immediately.',
        });
      } else if (batteryStatus === 'LOW') {
        alerts.push({
          type: 'LOW_BATTERY',
          severity: 'WARNING',
          message: `Soundbox battery is at ${battery}%. Please plug in charging cable.`,
          recommendedStep: 'Charge device before evening peak business rush hours.',
        });
      }

      // Alert rule 2: Offline duration
      if (connectionStatus === 'OFFLINE') {
        alerts.push({
          type: 'SOUNDBOX_OFFLINE',
          severity: 'CRITICAL',
          message: `Soundbox (${r.serial_number}) has not checked in for ${minsDiff} minutes.`,
          recommendedStep: 'Check SIM card signal LED or restart device by holding the power button for 5 seconds.',
        });
      }

      return {
        deviceId: r.id,
        merchantId: r.merchant_id,
        deviceType: r.device_type,
        serialNumber: r.serial_number,
        model: r.model,
        batteryLevel: battery,
        status: (r.status || 'ONLINE') as any,
        volume: Number(r.volume || 8),
        language: r.language || 'en',
        lastPingAt: r.last_ping_at,
        minutesSinceLastPing: minsDiff,
        batteryStatus,
        connectionStatus,
      };
    });

    // Compute explainable churn risk
    const churnRisk = this.assessChurnRisk(merchantId, devices);

    let overallHardwareStatus: 'ALL_ONLINE' | 'ATTENTION_NEEDED' | 'OFFLINE_CRITICAL' = 'ALL_ONLINE';
    if (alerts.some((a) => a.severity === 'CRITICAL')) {
      overallHardwareStatus = 'OFFLINE_CRITICAL';
    } else if (alerts.length > 0) {
      overallHardwareStatus = 'ATTENTION_NEEDED';
    }

    return {
      merchantId,
      devices,
      overallHardwareStatus,
      activeAlertsCount: alerts.length,
      alerts,
      churnRisk,
    };
  }

  /**
   * Transparent, explainable churn risk assessment based on measurable signals
   */
  private static assessChurnRisk(merchantId: string, devices: DeviceTelemetry[]): MerchantChurnRiskAssessment {
    const db = AppDatabase.getDB();
    const riskFactors: ChurnRiskFactor[] = [];
    let score = 0;

    // Signal 1: Hardware downtime
    const offlineDevice = devices.find((d) => d.connectionStatus === 'OFFLINE' || d.connectionStatus === 'STALE');
    if (offlineDevice) {
      const pts = offlineDevice.minutesSinceLastPing > 120 ? 35 : 20;
      score += pts;
      riskFactors.push({
        factor: 'HARDWARE_CONNECTIVITY_DROPOUT',
        points: pts,
        evidence: `Soundbox ${offlineDevice.serialNumber} inactive for ${offlineDevice.minutesSinceLastPing} minutes.`,
      });
    }

    // Signal 2: Recent transaction volume drop
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCountRow = db
      .prepare('SELECT COUNT(*) as c FROM transactions WHERE merchant_id = ? AND timestamp LIKE ?')
      .get(merchantId, `${todayStr}%`) as any;
    const todayCount = Number(todayCountRow?.c || 0);

    if (todayCount === 0) {
      score += 25;
      riskFactors.push({
        factor: 'ZERO_PAYMENTS_RECORDED_TODAY',
        points: 25,
        evidence: 'Zero transactions processed today during shop business hours.',
      });
    }

    // Signal 3: Unresolved disputes or variances
    const flaggedRow = db
      .prepare('SELECT COUNT(*) as c FROM transactions WHERE merchant_id = ? AND is_flagged_for_discrepancy = 1')
      .get(merchantId) as any;
    const flaggedCount = Number(flaggedRow?.c || 0);
    if (flaggedCount > 0) {
      score += 15;
      riskFactors.push({
        factor: 'UNRESOLVED_SETTLEMENT_DISPUTES',
        points: 15,
        evidence: `${flaggedCount} transaction(s) currently held under discrepancy audit.`,
      });
    }

    let churnRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (score >= 45) churnRiskLevel = 'HIGH';
    else if (score >= 20) churnRiskLevel = 'MEDIUM';

    const recommendedAction =
      churnRiskLevel === 'HIGH'
        ? 'Dispatch Field Service Agent to inspect Soundbox network antenna and assist shopkeeper.'
        : churnRiskLevel === 'MEDIUM'
        ? 'Trigger merchant support push notification with Soundbox connection troubleshooting guide.'
        : 'Merchant operating normally with healthy payment and Soundbox velocity.';

    return {
      merchantId,
      churnRiskLevel,
      compositeRiskScore: Math.min(100, score),
      explainableSignals: riskFactors,
      recommendedAction,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Creates an official Paytm operations support ticket for hardware issues
   */
  public static createSupportTicket(merchantId: string, deviceSerial: string, issueDescription: string) {
    const db = AppDatabase.getDB();
    const ticketId = `TCK-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    // Resolve device ID if serial number or id was provided to respect FK constraint
    const dev = db.prepare('SELECT id FROM devices WHERE id = ? OR serial_number = ?').get(deviceSerial, deviceSerial) as any;
    const resolvedDeviceId = dev ? dev.id : deviceSerial;

    db.prepare(`
      INSERT INTO device_health_events (
        id, device_id, merchant_id, event_type, severity, battery_level, minutes_offline, diagnostic_message, resolution_status, support_ticket_id, created_at
      ) VALUES (?, ?, ?, 'HARDWARE_TICKET_RAISED', 'WARNING', 94, 0, ?, 'OPEN', ?, ?)
    `).run(
      `EV-${Date.now()}`,
      resolvedDeviceId,
      merchantId,
      issueDescription,
      ticketId,
      now
    );

    return {
      ticketId,
      status: 'OPEN',
      assignedTeam: 'Paytm Field Operations (Tier 2)',
      slaHours: 24,
      createdAt: now,
    };
  }
}
