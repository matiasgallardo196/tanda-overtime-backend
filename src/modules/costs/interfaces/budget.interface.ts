export interface BudgetConfig {
  /** Total wage budget (no on-costs) for the period below. */
  totalBudget: number;
  /** First day the budget covers (yyyy-MM-dd). */
  startDate: string;
  /** Last day the budget covers (yyyy-MM-dd), typically the fiscal year end. */
  endDate: string;
  updatedAt: string;
}
