export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
type Table<
  Row extends Record<string, unknown>,
  Insert extends Record<string, unknown> = Row,
  Update extends Record<string, unknown> = Partial<Row>,
> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };
type Tenant = {
  id: string;
  name: string;
  slug: string;
  type: string;
  base_currency: string;
  timezone: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};
type Member = {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
};
type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};
type Category = {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  name: string;
  name_normalized: string | null;
  type: string;
  budget_group: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
type Invitation = {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  status: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  token_hash: string;
};
type Person = {
  id: string;
  tenant_id: string;
  name: string;
  name_normalized: string | null;
  linked_user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
type CostCenter = {
  id: string;
  tenant_id: string;
  name: string;
  name_normalized: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
type Account = {
  id: string;
  tenant_id: string;
  name: string;
  name_normalized: string | null;
  type: string;
  institution_name: string | null;
  currency: string;
  opening_balance: string | number;
  opening_date: string;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};
type CreditCard = {
  id: string;
  tenant_id: string;
  name: string;
  name_normalized: string;
  institution_name: string | null;
  credit_limit: string | number;
  currency: string;
  closing_day: number;
  due_day: number;
  payment_account_id: string | null;
  is_active: boolean;
  archived_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};
type InvoiceCycle = {
  id: string;
  tenant_id: string;
  card_id: string;
  cycle_start: string;
  cycle_end: string;
  due_date: string;
  status: string;
  created_at: string;
  updated_at: string;
};
type CardPurchase = {
  id: string;
  tenant_id: string;
  card_id: string;
  description: string;
  purchased_at: string;
  total_amount: string | number;
  currency: string;
  installments_count: number;
  category_id: string | null;
  person_id: string | null;
  cost_center_id: string | null;
  idempotency_key: string;
  status: string;
  cancelled_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};
type CardInstallment = {
  id: string;
  tenant_id: string;
  purchase_id: string;
  card_id: string;
  transaction_id: string;
  invoice_cycle_id: string;
  invoice_id: string | null;
  installment_number: number;
  total_installments: number;
  amount: string | number;
  currency: string;
  competence_date: string;
  status: string;
  created_at: string;
  updated_at: string;
};
type CardInvoice = {
  id: string;
  tenant_id: string;
  card_id: string;
  invoice_cycle_id: string;
  total_amount: string | number;
  currency: string;
  status: string;
  closed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};
type CardInvoicePayment = {
  id: string;
  tenant_id: string;
  invoice_id: string;
  account_id: string;
  movement_id: string;
  amount: string | number;
  currency: string;
  paid_at: string;
  idempotency_key: string;
  created_by: string;
  created_at: string;
  reversed_at: string | null;
  reversed_by: string | null;
  reversal_idempotency_key: string | null;
};
type FinancialGoal = {
  id: string;
  tenant_id: string;
  name: string;
  target_amount: string | number;
  currency: string;
  target_date: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};
type FinancialReserve = {
  id: string;
  tenant_id: string;
  goal_id: string | null;
  name: string;
  currency: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};
type ReserveMovement = {
  id: string;
  tenant_id: string;
  reserve_id: string;
  account_id: string;
  account_movement_id: string;
  kind: string;
  amount: string | number;
  currency: string;
  effective_at: string;
  idempotency_key: string;
  created_by: string;
  created_at: string;
};
type Transaction = {
  id: string;
  tenant_id: string;
  type: string;
  description: string;
  amount: string | number;
  currency: string;
  category_id: string | null;
  person_id: string | null;
  cost_center_id: string | null;
  account_id: string | null;
  competence_date: string;
  due_date: string | null;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  recurrence_rule_id: string | null;
  recurrence_occurrence_date: string | null;
};
type RecurrenceRule = {
  id: string;
  tenant_id: string;
  type: string;
  frequency: string;
  interval_count: number;
  start_date: string;
  end_date: string | null;
  max_occurrences: number | null;
  generated_count: number;
  next_run_at: string;
  day_of_month: number;
  amount: string | number;
  currency: string;
  description: string;
  category_id: string | null;
  person_id: string | null;
  cost_center_id: string | null;
  account_id: string | null;
  is_active: boolean;
  cancelled_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};
type TransactionSettlement = {
  id: string;
  tenant_id: string;
  transaction_id: string;
  account_id: string;
  amount: string | number;
  settled_at: string;
  idempotency_key: string;
  created_by: string;
  created_at: string;
  reversed_at: string | null;
  reversed_by: string | null;
  reversal_idempotency_key: string | null;
};
type AccountMovement = {
  id: string;
  tenant_id: string;
  account_id: string;
  settlement_id: string | null;
  amount: string | number;
  effective_at: string;
  created_at: string;
  reversal_of_id: string | null;
  transfer_id: string | null;
  card_invoice_payment_id: string | null;
  reserve_movement_id: string | null;
};
type Transfer = {
  id: string;
  tenant_id: string;
  source_account_id: string;
  target_account_id: string;
  amount: string | number;
  currency: string;
  effective_at: string;
  description: string | null;
  idempotency_key: string;
  created_by: string;
  created_at: string;
  reversed_at: string | null;
  reversed_by: string | null;
  reversal_idempotency_key: string | null;
};
type MonthlyPlan = {
  id: string;
  tenant_id: string;
  plan_year: number;
  plan_month: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};
type MonthlyPlanItem = {
  id: string;
  tenant_id: string;
  plan_id: string;
  type: string;
  category_id: string | null;
  account_id: string | null;
  person_id: string | null;
  currency: string;
  amount: string | number;
  created_at: string;
  updated_at: string;
};
type CategoryBudget = {
  id: string;
  tenant_id: string;
  category_id: string;
  budget_year: number;
  budget_month: number;
  currency: string;
  limit_amount: string | number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};
type AuditLog = {
  id: string;
  tenant_id: string | null;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Json;
  created_at: string;
};
type AnyFields = Record<string, unknown>;
export type Database = {
  public: {
    Tables: {
      tenants: Table<Tenant, AnyFields>;
      tenant_members: Table<Member, AnyFields>;
      profiles: Table<Profile, AnyFields>;
      categories: Table<Category, AnyFields>;
      tenant_invitations: Table<Invitation, AnyFields>;
      people: Table<Person, AnyFields>;
      cost_centers: Table<CostCenter, AnyFields>;
      accounts: Table<Account, AnyFields>;
      credit_cards: Table<CreditCard, AnyFields>;
      invoice_cycles: Table<InvoiceCycle, AnyFields>;
      card_purchases: Table<CardPurchase, AnyFields>;
      card_installments: Table<CardInstallment, AnyFields>;
      card_invoices: Table<CardInvoice, AnyFields>;
      card_invoice_payments: Table<CardInvoicePayment, AnyFields>;
      financial_goals: Table<FinancialGoal, AnyFields>;
      financial_reserves: Table<FinancialReserve, AnyFields>;
      reserve_movements: Table<ReserveMovement, AnyFields>;
      transactions: Table<Transaction, AnyFields>;
      recurrence_rules: Table<RecurrenceRule, AnyFields>;
      transaction_settlements: Table<TransactionSettlement, AnyFields>;
      account_movements: Table<AccountMovement, AnyFields>;
      transfers: Table<Transfer, AnyFields>;
      monthly_plans: Table<MonthlyPlan, AnyFields>;
      monthly_plan_items: Table<MonthlyPlanItem, AnyFields>;
      category_budgets: Table<CategoryBudget, AnyFields>;
      audit_logs: Table<AuditLog, AnyFields>;
    };
    Views: Record<string, never>;
    Functions: {
      create_tenant: {
        Args: {
          p_name: string;
          p_slug: string;
          p_type?: string;
          p_base_currency?: string;
          p_timezone?: string;
        };
        Returns: Tenant;
      };
      list_tenant_members: {
        Args: { p_tenant_id: string };
        Returns: Array<
          Member & { email: string | null; full_name: string | null }
        >;
      };
      update_tenant_member: { Args: AnyFields; Returns: Member };
      create_tenant_invitation: { Args: AnyFields; Returns: Invitation[] };
      revoke_tenant_invitation: { Args: AnyFields; Returns: Invitation };
      resend_tenant_invitation: { Args: AnyFields; Returns: Invitation[] };
      accept_tenant_invitation_by_hash: { Args: AnyFields; Returns: Member };
      settle_transaction: {
        Args: {
          p_transaction_id: string;
          p_account_id: string;
          p_amount: string | number;
          p_settled_at: string;
          p_idempotency_key: string;
        };
        Returns: TransactionSettlement;
      };
      reverse_transaction_settlement: {
        Args: {
          p_settlement_id: string;
          p_idempotency_key: string;
        };
        Returns: TransactionSettlement;
      };
      create_transfer: {
        Args: {
          p_source_account_id: string;
          p_target_account_id: string;
          p_amount: string | number;
          p_currency: string;
          p_effective_at: string;
          p_description?: string | null;
          p_idempotency_key: string;
        };
        Returns: Transfer;
      };
      reverse_transfer: {
        Args: { p_transfer_id: string; p_idempotency_key: string };
        Returns: Transfer;
      };
      require_balance_access: {
        Args: { p_tenant_id: string };
        Returns: undefined;
      };
      get_account_balance: {
        Args: { p_account_id: string; p_as_of?: string };
        Returns: {
          account_id: string;
          tenant_id: string;
          currency: string;
          opening_balance: string | number;
          movement_total: string | number;
          balance: string | number;
        }[];
      };
      get_account_balances: {
        Args: { p_tenant_id: string; p_as_of?: string };
        Returns: {
          account_id: string;
          tenant_id: string;
          account_name: string;
          account_type: string;
          currency: string;
          opening_balance: string | number;
          movement_total: string | number;
          balance: string | number;
          is_restricted: boolean;
        }[];
      };
      get_cash_result: {
        Args: {
          p_tenant_id: string;
          p_from: string;
          p_to: string;
          p_currency?: string;
        };
        Returns: {
          currency: string;
          income: string | number;
          expense: string | number;
          result: string | number;
        }[];
      };
      get_accrual_result: {
        Args: {
          p_tenant_id: string;
          p_from: string;
          p_to: string;
          p_currency?: string;
        };
        Returns: {
          currency: string;
          income: string | number;
          expense: string | number;
          result: string | number;
        }[];
      };
      get_projected_balance: {
        Args: { p_account_id: string; p_as_of?: string };
        Returns: {
          account_id: string;
          tenant_id: string;
          currency: string;
          current_balance: string | number;
          expected_inflows: string | number;
          expected_outflows: string | number;
          projected_balance: string | number;
        }[];
      };
      get_financial_summary: {
        Args: {
          p_tenant_id: string;
          p_from: string;
          p_to: string;
          p_as_of?: string;
        };
        Returns: {
          currency: string;
          cash_income: string | number;
          cash_expense: string | number;
          cash_result: string | number;
          accrual_income: string | number;
          accrual_expense: string | number;
          accrual_result: string | number;
          current_balance: string | number;
          projected_balance: string | number;
          restricted_balance: string | number;
          available_balance: string | number;
          receivables: string | number;
          payables: string | number;
        }[];
      };
      get_cash_flow_series: {
        Args: {
          p_tenant_id: string;
          p_from: string;
          p_to: string;
          p_account_id?: string;
          p_currency?: string;
          p_regime?: string;
          p_granularity?: string;
        };
        Returns: {
          period_start: string;
          currency: string;
          income: string | number;
          expense: string | number;
          result: string | number;
          cumulative_result: string | number;
        }[];
      };
      upsert_monthly_plan_item: {
        Args: {
          p_tenant_id: string;
          p_year: number;
          p_month: number;
          p_type: string;
          p_amount: string | number;
          p_currency: string;
          p_category_id: string | null;
          p_account_id: string | null;
          p_person_id: string | null;
        };
        Returns: MonthlyPlanItem;
      };
      copy_monthly_plan: {
        Args: {
          p_tenant_id: string;
          p_from_year: number;
          p_from_month: number;
          p_to_year: number;
          p_to_month: number;
        };
        Returns: number;
      };
      get_monthly_plan: {
        Args: { p_tenant_id: string; p_year: number; p_month: number };
        Returns: Array<
          Pick<
            MonthlyPlanItem,
            | "id"
            | "tenant_id"
            | "plan_id"
            | "type"
            | "category_id"
            | "account_id"
            | "person_id"
            | "currency"
            | "amount"
          >
        >;
      };
      get_monthly_comparison: {
        Args: {
          p_tenant_id: string;
          p_year: number;
          p_month: number;
          p_regime: string;
          p_category_id: string | null;
          p_account_id: string | null;
          p_person_id: string | null;
        };
        Returns: Array<{
          currency: string;
          type: string;
          category_id: string | null;
          account_id: string | null;
          person_id: string | null;
          planned: string | number;
          actual: string | number;
          variance: string | number;
          usage_percentage: string | number;
        }>;
      };
      get_monthly_summary: {
        Args: {
          p_tenant_id: string;
          p_year: number;
          p_month: number;
          p_regime: string;
        };
        Returns: Array<{
          currency: string;
          planned_income: string | number;
          actual_income: string | number;
          planned_expense: string | number;
          actual_expense: string | number;
          planned_result: string | number;
          actual_result: string | number;
          income_variance: string | number;
          expense_variance: string | number;
          budget_usage_percentage: string | number;
        }>;
      };
      upsert_category_budget: {
        Args: {
          p_tenant_id: string;
          p_category_id: string;
          p_year: number;
          p_month: number;
          p_currency: string;
          p_limit_amount: string | number;
        };
        Returns: CategoryBudget;
      };
      remove_category_budget: {
        Args: { p_tenant_id: string; p_budget_id: string };
        Returns: CategoryBudget;
      };
      get_budget_consumption: {
        Args: {
          p_tenant_id: string;
          p_year: number;
          p_month: number;
          p_regime: string;
          p_currency: string | null;
        };
        Returns: Array<{
          budget_id: string;
          category_id: string;
          category_name: string;
          currency: string;
          limit_amount: string | number;
          spent: string | number;
          remaining: string | number;
          usage_percentage: string | number;
          variance: string | number;
          alert_level: string;
        }>;
      };
      get_monthly_budgets: {
        Args: {
          p_tenant_id: string;
          p_year: number;
          p_month: number;
          p_regime: string;
          p_currency: string | null;
        };
        Returns: CategoryBudget[];
      };
      get_budget_alerts: {
        Args: {
          p_tenant_id: string;
          p_year: number;
          p_month: number;
          p_regime: string;
        };
        Returns: Array<{
          budget_id: string;
          category_id: string;
          category_name: string;
          currency: string;
          usage_percentage: string | number;
          alert_level: string;
        }>;
      };
      create_recurrence_rule: {
        Args: {
          p_tenant_id: string;
          p_type: string;
          p_frequency: string;
          p_interval: number;
          p_start_date: string;
          p_end_date: string | null;
          p_max_occurrences: number | null;
          p_amount: string | number;
          p_currency: string;
          p_description: string;
          p_category_id: string | null;
          p_person_id: string | null;
          p_cost_center_id: string | null;
          p_account_id: string | null;
        };
        Returns: RecurrenceRule;
      };
      update_recurrence_rule: {
        Args: {
          p_tenant_id: string;
          p_rule_id: string;
          p_type: string;
          p_frequency: string;
          p_interval: number;
          p_start_date: string;
          p_end_date: string | null;
          p_max_occurrences: number | null;
          p_amount: string | number;
          p_currency: string;
          p_description: string;
          p_category_id: string | null;
          p_person_id: string | null;
          p_cost_center_id: string | null;
          p_account_id: string | null;
        };
        Returns: RecurrenceRule;
      };
      set_recurrence_state: {
        Args: { p_tenant_id: string; p_rule_id: string; p_action: string };
        Returns: RecurrenceRule;
      };
      generate_due_occurrences: {
        Args: {
          p_tenant_id: string;
          p_until_date?: string;
          p_limit?: number;
        };
        Returns: number;
      };
      create_credit_card: {
        Args: {
          p_tenant_id: string;
          p_name: string;
          p_institution_name: string | null;
          p_credit_limit: string | number;
          p_currency: string;
          p_closing_day: number;
          p_due_day: number;
          p_payment_account_id: string | null;
        };
        Returns: CreditCard;
      };
      update_credit_card: {
        Args: {
          p_tenant_id: string;
          p_card_id: string;
          p_name: string;
          p_institution_name: string | null;
          p_credit_limit: string | number;
          p_currency: string;
          p_closing_day: number;
          p_due_day: number;
          p_payment_account_id: string | null;
        };
        Returns: CreditCard;
      };
      set_credit_card_state: {
        Args: { p_tenant_id: string; p_card_id: string; p_is_active: boolean };
        Returns: CreditCard;
      };
      create_card_purchase: {
        Args: {
          p_tenant_id: string;
          p_card_id: string;
          p_description: string;
          p_purchased_at: string;
          p_total_amount: string | number;
          p_currency: string;
          p_installments_count: number;
          p_category_id: string | null;
          p_person_id: string | null;
          p_cost_center_id: string | null;
          p_idempotency_key: string;
        };
        Returns: CardPurchase;
      };
      cancel_card_purchase: {
        Args: { p_tenant_id: string; p_purchase_id: string };
        Returns: CardPurchase;
      };
      generate_card_invoice: {
        Args: {
          p_tenant_id: string;
          p_card_id: string;
          p_invoice_cycle_id: string;
        };
        Returns: CardInvoice;
      };
      close_card_invoice: {
        Args: { p_tenant_id: string; p_invoice_id: string };
        Returns: CardInvoice;
      };
      pay_card_invoice: {
        Args: {
          p_tenant_id: string;
          p_invoice_id: string;
          p_account_id: string;
          p_amount: string | number;
          p_paid_at: string;
          p_idempotency_key: string;
        };
        Returns: CardInvoicePayment;
      };
      reverse_card_invoice_payment: {
        Args: { p_payment_id: string; p_idempotency_key: string };
        Returns: CardInvoicePayment;
      };
      create_financial_goal: {
        Args: {
          p_tenant_id: string;
          p_name: string;
          p_target_amount: string | number;
          p_currency: string;
          p_target_date?: string | null;
        };
        Returns: FinancialGoal;
      };
      update_financial_goal: {
        Args: {
          p_tenant_id: string;
          p_goal_id: string;
          p_name: string;
          p_target_amount: string | number;
          p_target_date?: string | null;
          p_status: string;
        };
        Returns: FinancialGoal;
      };
      create_financial_reserve: {
        Args: {
          p_tenant_id: string;
          p_goal_id?: string | null;
          p_name: string;
          p_currency: string;
        };
        Returns: FinancialReserve;
      };
      get_reserve_balance: {
        Args: { p_tenant_id: string; p_reserve_id: string };
        Returns: number;
      };
      get_goal_progress: {
        Args: { p_tenant_id: string; p_goal_id: string };
        Returns: number;
      };
      allocate_to_reserve: {
        Args: {
          p_tenant_id: string;
          p_reserve_id: string;
          p_account_id: string;
          p_amount: string | number;
          p_effective_at: string;
          p_idempotency_key: string;
        };
        Returns: ReserveMovement;
      };
      withdraw_from_reserve: {
        Args: {
          p_tenant_id: string;
          p_reserve_id: string;
          p_account_id: string;
          p_amount: string | number;
          p_effective_at: string;
          p_idempotency_key: string;
        };
        Returns: ReserveMovement;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
