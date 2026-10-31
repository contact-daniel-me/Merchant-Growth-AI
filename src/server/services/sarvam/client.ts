import { getSarvamConfig, isSarvamConfigured } from './config.ts';

export class SarvamClient {
  /**
   * Safe authorized POST request to Sarvam AI endpoints
   */
  public static async post(url: string, body: Record<string, any>, customHeaders: Record<string, string> = {}): Promise<any> {
    const config = getSarvamConfig();
    if (!isSarvamConfigured()) {
      throw new Error('Sarvam API key not configured in environment.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'api-subscription-key': config.apiKey,
      ...customHeaders,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Sarvam API error (HTTP ${response.status}): ${errText}`);
    }

    return response.json();
  }

  /**
   * Multipart POST for audio file uploads (STT)
   */
  public static async postMultipart(url: string, formData: FormData): Promise<any> {
    const config = getSarvamConfig();
    if (!isSarvamConfigured()) {
      throw new Error('Sarvam API key not configured in environment.');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-subscription-key': config.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Sarvam STT API error (HTTP ${response.status}): ${errText}`);
    }

    return response.json();
  }
}
