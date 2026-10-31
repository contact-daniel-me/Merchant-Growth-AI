import { AppDatabase } from '../../db/database.ts';
import { FinancialEngine } from '../financialEngine.ts';
import { KhataService } from '../khataService.ts';
import { ActionService } from '../actionService.ts';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export const REGISTERED_AGENT_TOOLS: ToolDefinition[] = [
  {
    name: 'get_daily_collections',
    description: 'Retrieves verified today sales, gross collections, payment count, and in-transit bank settlements.',
    parameters: {
      type: 'object',
      properties: {
        merchant_id: { type: 'string', description: 'Unique merchant identifier' },
      },
      required: ['merchant_id'],
    },
  },
  {
    name: 'verify_payment',
    description: 'Verifies whether a specific payment from a customer actually arrived in the authoritative merchant ledger.',
    parameters: {
      type: 'object',
      properties: {
        merchant_id: { type: 'string', description: 'Unique merchant identifier' },
        amount: { type: 'number', description: 'Payment amount in Rupees' },
        payer_name_or_vpa: { type: 'string', description: 'Customer name or UPI VPA (e.g., Ravi, ravi@upi)' },
        time_window_hours: { type: 'number', description: 'Time window to search in hours (default: 24)' },
      },
      required: ['merchant_id', 'amount'],
    },
  },
  {
    name: 'get_settlement_status',
    description: 'Checks bank settlement batches, pending in-transit amounts, and detects any held variance.',
    parameters: {
      type: 'object',
      properties: {
        merchant_id: { type: 'string', description: 'Unique merchant identifier' },
      },
      required: ['merchant_id'],
    },
  },
  {
    name: 'investigate_settlement',
    description: 'Prepares a formal settlement investigation and dispute ticket for unexplained variances or held funds.',
    parameters: {
      type: 'object',
      properties: {
        merchant_id: { type: 'string', description: 'Unique merchant identifier' },
        batch_id: { type: 'string', description: 'Specific batch ID if known' },
        reason: { type: 'string', description: 'Merchant stated reason for dispute' },
      },
      required: ['merchant_id'],
    },
  },
  {
    name: 'get_customer_dues',
    description: 'Retrieves outstanding customer credit records, overdue balances, and top overdue debtors from the Khata ledger.',
    parameters: {
      type: 'object',
      properties: {
        merchant_id: { type: 'string', description: 'Unique merchant identifier' },
        customer_name: { type: 'string', description: 'Specific customer name if filtering' },
      },
      required: ['merchant_id'],
    },
  },
  {
    name: 'prepare_customer_reminder',
    description: 'Prepares a draft payment reminder card for an overdue Khata debtor for explicit merchant approval.',
    parameters: {
      type: 'object',
      properties: {
        merchant_id: { type: 'string', description: 'Unique merchant identifier' },
        customer_name: { type: 'string', description: 'Name of the debtor to remind' },
      },
      required: ['merchant_id', 'customer_name'],
    },
  },
  {
    name: 'get_sales_trends',
    description: 'Analyzes rolling 4-week sales trends, peak rush hours, and historical velocity changes.',
    parameters: {
      type: 'object',
      properties: {
        merchant_id: { type: 'string', description: 'Unique merchant identifier' },
      },
      required: ['merchant_id'],
    },
  },
  {
    name: 'get_device_health',
    description: 'Checks connected Paytm Soundbox and POS terminal telemetry, battery percentage, and connectivity status.',
    parameters: {
      type: 'object',
      properties: {
        merchant_id: { type: 'string', description: 'Unique merchant identifier' },
      },
      required: ['merchant_id'],
    },
  },
  {
    name: 'get_merchant_fee_estimate',
    description: 'Analyzes payment processing fees and evaluates applicability of the 2026 UPI MDR policy framework.',
    parameters: {
      type: 'object',
      properties: {
        merchant_id: { type: 'string', description: 'Unique merchant identifier' },
      },
      required: ['merchant_id'],
    },
  },
  {
    name: 'get_cashflow_summary',
    description: 'Forecasts upcoming 7-day cash flow, loan EMI deductions, and working capital availability.',
    parameters: {
      type: 'object',
      properties: {
        merchant_id: { type: 'string', description: 'Unique merchant identifier' },
      },
      required: ['merchant_id'],
    },
  },
];

