export interface PaytmConfig {
  mid: string;
  merchantKey: string;
  clientId: string;
  clientSecret: string;
  environment: 'STAGE' | 'PROD';
  baseUrl: string;
  webhookSecret: string;
}

export function getPaytmConfig(): PaytmConfig {
  const env = (process.env.PAYTM_ENVIRONMENT || 'STAGE').toUpperCase() as 'STAGE' | 'PROD';
  const isProd = env === 'PROD';

  return {
    mid: process.env.PAYTM_MID || '',
    merchantKey: process.env.PAYTM_MERCHANT_KEY || '',
    clientId: process.env.PAYTM_CLIENT_ID || '',
    clientSecret: process.env.PAYTM_CLIENT_SECRET || '',
    environment: env,
    baseUrl: isProd
      ? 'https://securegw.paytm.in/merchant-edge/v1'
      : 'https://securegw-stage.paytm.in/merchant-edge/v1',
    webhookSecret: process.env.PAYTM_WEBHOOK_SECRET || 'paytm-webhook-verification-secret',
  };
}

export function isPaytmConfigured(): boolean {
  const cfg = getPaytmConfig();
  return Boolean(cfg.mid && cfg.merchantKey && cfg.mid !== 'MY_PAYTM_MID');
}
