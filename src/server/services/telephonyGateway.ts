import { AppDatabase } from '../db/database.ts';

export interface TelephonyConfig {
  provider: 'TWILIO' | 'EXOTEL' | 'SARVAM_SAMVAAD' | 'SIMULATION';
  isConfigured: boolean;
  callerNumber?: string;
  publicUrl?: string;
}

export interface DialResult {
  success: boolean;
  carrier: 'TWILIO' | 'EXOTEL' | 'SARVAM_SAMVAAD' | 'SIMULATION';
  carrierCallId?: string;
  status: 'DIALING' | 'QUEUED' | 'IN_CALL' | 'COMPLETED' | 'FAILED';
  recipientPhone: string;
  message: string;
  rawResponse?: any;
}

export class TelephonyGateway {
  /**
   * Detects the active carrier configuration from environment variables
   */
  public static getConfig(): TelephonyConfig {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioAuth && twilioPhone) {
      return {
        provider: 'TWILIO',
        isConfigured: true,
        callerNumber: twilioPhone,
        publicUrl: process.env.APP_URL || 'https://merchants.growiota.in',
      };
    }

    const exotelKey = process.env.EXOTEL_API_KEY;
    const exotelToken = process.env.EXOTEL_API_TOKEN;
    const exotelCaller = process.env.EXOTEL_CALLER_ID;

    if (exotelKey && exotelToken && exotelCaller) {
      return {
        provider: 'EXOTEL',
        isConfigured: true,
        callerNumber: exotelCaller,
        publicUrl: process.env.APP_URL || 'https://merchants.growiota.in',
      };
    }

    const sarvamWorkspace = process.env.SARVAM_WORKSPACE_ID;
    const sarvamAppId = process.env.SARVAM_APP_ID;

    if (sarvamWorkspace && sarvamAppId) {
      return {
        provider: 'SARVAM_SAMVAAD',
        isConfigured: true,
        callerNumber: process.env.SARVAM_CALLER_NUMBER || 'Sarvam AI Agent',
        publicUrl: process.env.APP_URL || 'https://merchants.growiota.in',
      };
    }

    return {
      provider: 'SIMULATION',
      isConfigured: false,
      callerNumber: '+91 1800-PAYTM-AI',
      publicUrl: process.env.APP_URL || 'https://merchants.growiota.in',
    };
  }

  /**
   * Initiates a real PSTN / Cellular outbound call to a physical mobile phone
   */
  public static async dialRealPhone(params: {
    callId: string;
    recipientPhone: string;
    recipientName: string;
    audioBase64?: string | null;
  }): Promise<DialResult> {
    const { callId, recipientPhone, recipientName } = params;
    const config = this.getConfig();
    const appUrl = config.publicUrl || 'https://merchants.growiota.in';

    // Format Indian mobile number (+91 98450 12890 -> +919845012890)
    const cleanPhone = recipientPhone.replace(/[\s-]/g, '');

    // 1. DIAL VIA TWILIO VOICE
    if (config.provider === 'TWILIO') {
      try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID!;
        const authToken = process.env.TWILIO_AUTH_TOKEN!;
        const fromPhone = process.env.TWILIO_PHONE_NUMBER!;

        const twimlUrl = `${appUrl}/api/telephony/twiml/${callId}`;

        const formData = new URLSearchParams();
        formData.append('To', cleanPhone);
        formData.append('From', fromPhone);
        formData.append('Url', twimlUrl);

        const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        const twilioRes = await res.json();
        if (res.ok) {
          return {
            success: true,
            carrier: 'TWILIO',
            carrierCallId: twilioRes.sid,
            status: 'QUEUED',
            recipientPhone: cleanPhone,
            message: `Real PSTN cellular call initiated to ${recipientName} (${cleanPhone}) via Twilio carrier gateway. Call SID: ${twilioRes.sid}`,
            rawResponse: twilioRes,
          };
        } else {
          console.warn('[TelephonyGateway] Twilio error:', twilioRes);
          return {
            success: false,
            carrier: 'TWILIO',
            status: 'FAILED',
            recipientPhone: cleanPhone,
            message: `Twilio call dispatch failed: ${twilioRes.message || 'Unknown carrier error'}`,
            rawResponse: twilioRes,
          };
        }
      } catch (err: any) {
        console.error('[TelephonyGateway] Twilio exception:', err);
        return {
          success: false,
          carrier: 'TWILIO',
          status: 'FAILED',
          recipientPhone: cleanPhone,
          message: `Twilio gateway exception: ${err.message}`,
        };
      }
    }

    // 2. DIAL VIA EXOTEL (India Native Telecom Gateway)
    if (config.provider === 'EXOTEL') {
      try {
        const apiKey = process.env.EXOTEL_API_KEY!;
        const apiToken = process.env.EXOTEL_API_TOKEN!;
        const subdomain = process.env.EXOTEL_SUBDOMAIN || 'api';
        const callerId = process.env.EXOTEL_CALLER_ID!;
        const accountSid = process.env.EXOTEL_ACCOUNT_SID || apiKey;

        const audioUrl = `${appUrl}/api/telephony/audio/${callId}.wav`;

        const formData = new URLSearchParams();
        formData.append('From', cleanPhone);
        formData.append('CallerId', callerId);
        formData.append('Url', audioUrl);

        const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiToken}`).toString('base64');
        const res = await fetch(`https://${apiKey}:${apiToken}@${subdomain}.exotel.com/v1/Accounts/${accountSid}/Calls/connect.json`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        const exotelRes = await res.json();
        if (res.ok) {
          return {
            success: true,
            carrier: 'EXOTEL',
            carrierCallId: exotelRes.Call?.Sid,
            status: 'QUEUED',
            recipientPhone: cleanPhone,
            message: `Real cellular call initiated to ${recipientName} (${cleanPhone}) via Exotel India Gateway.`,
            rawResponse: exotelRes,
          };
        } else {
          return {
            success: false,
            carrier: 'EXOTEL',
            status: 'FAILED',
            recipientPhone: cleanPhone,
            message: `Exotel call dispatch failed: ${JSON.stringify(exotelRes)}`,
            rawResponse: exotelRes,
          };
        }
      } catch (err: any) {
        return {
          success: false,
          carrier: 'EXOTEL',
          status: 'FAILED',
          recipientPhone: cleanPhone,
          message: `Exotel gateway exception: ${err.message}`,
        };
      }
    }

    // 3. DIAL VIA SARVAM SAMVAAD OUTBOUND API
    if (config.provider === 'SARVAM_SAMVAAD') {
      try {
        const apiKey = process.env.SARVAM_API_KEY || '';
        const orgId = process.env.SARVAM_ORG_ID || 'default';
        const workspaceId = process.env.SARVAM_WORKSPACE_ID!;
        const appId = process.env.SARVAM_APP_ID!;
        const callerPhone = process.env.SARVAM_CALLER_NUMBER;

        const body = {
          app_config: {
            app_id: appId,
            app_version: 1,
            connection_config: {
              agent_phone_number: callerPhone,
            },
          },
          user_config: {
            user_phone_number: cleanPhone,
          },
        };

        const res = await fetch(`https://apps.sarvam.ai/api/outbounds/v1/orgs/${orgId}/workspaces/${workspaceId}/outbounds`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          body: JSON.stringify(body),
        });

        const sarvamRes = await res.json();
        if (res.ok) {
          return {
            success: true,
            carrier: 'SARVAM_SAMVAAD',
            carrierCallId: sarvamRes.attempt_id,
            status: 'QUEUED',
            recipientPhone: cleanPhone,
            message: `Real outbound voice agent call dispatched to ${recipientName} (${cleanPhone}) via Sarvam Samvaad. Attempt ID: ${sarvamRes.attempt_id}`,
            rawResponse: sarvamRes,
          };
        } else {
          return {
            success: false,
            carrier: 'SARVAM_SAMVAAD',
            status: 'FAILED',
            recipientPhone: cleanPhone,
            message: `Sarvam Samvaad dispatch failed: ${sarvamRes.message || JSON.stringify(sarvamRes)}`,
            rawResponse: sarvamRes,
          };
        }
      } catch (err: any) {
        return {
          success: false,
          carrier: 'SARVAM_SAMVAAD',
          status: 'FAILED',
          recipientPhone: cleanPhone,
          message: `Sarvam Samvaad gateway exception: ${err.message}`,
        };
      }
    }

    // 4. SIMULATION FALLBACK (Carrier keys not set in .env)
    return {
      success: true,
      carrier: 'SIMULATION',
      status: 'COMPLETED',
      recipientPhone: cleanPhone,
      message: `Audio synthesized with Sarvam AI Bulbul neural voice and played via live web telephony console. To make physical mobile phone ring, connect Twilio, Exotel, or Sarvam Samvaad credentials in .env.`,
    };
  }
}
