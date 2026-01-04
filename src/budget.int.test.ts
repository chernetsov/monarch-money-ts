import { describe, test, expect } from "vitest";
import { getIntegrationContext } from "./test-utils.js";
import { getBudgetReport, getBudgetStatus, getBudgetSettings } from "./budget.api.js";

describe("integration: budget", () => {
  test("getBudgetStatus returns budget status information", async () => {
    const { auth, client } = getIntegrationContext();
    const status = await getBudgetStatus(auth, client);

    expect(status).toBeDefined();
    expect(typeof status.hasBudget).toBe("boolean");
    expect(typeof status.hasTransactions).toBe("boolean");
    expect(typeof status.willCreateBudgetFromEmptyDefaultCategories).toBe("boolean");
  });

  test("getBudgetSettings returns budget settings", async () => {
    const { auth, client } = getIntegrationContext();
    const settings = await getBudgetSettings(auth, client);

    expect(settings).toBeDefined();
    expect(settings.budgetSystem).toBeDefined();
    expect(["groups_and_categories"]).toContain(settings.budgetSystem);
  });

  test("getBudgetReport returns comprehensive budget data", async () => {
    const { auth, client } = getIntegrationContext();
    
    // Get budget data for a 4-month period
    const report = await getBudgetReport(auth, client, {
      startDate: "2025-12-01",
      endDate: "2026-03-01",
    });

    // Validate top-level structure
    expect(report).toBeDefined();
    expect(report.budgetSystem).toBeDefined();
    expect(report.budgetData).toBeDefined();
    expect(Array.isArray(report.categoryGroups)).toBe(true);
    expect(Array.isArray(report.goalsV2)).toBe(true);
    expect(Array.isArray(report.savingsGoalMonthlyBudgetAmounts)).toBe(true);

    // Validate budget data structure
    const { budgetData } = report;
    expect(Array.isArray(budgetData.monthlyAmountsByCategory)).toBe(true);
    expect(Array.isArray(budgetData.monthlyAmountsByCategoryGroup)).toBe(true);
    expect(budgetData.monthlyAmountsForFlexExpense).toBeDefined();
    expect(Array.isArray(budgetData.totalsByMonth)).toBe(true);

    // If there are monthly amounts by category, validate structure
    if (budgetData.monthlyAmountsByCategory.length > 0) {
      const firstCategoryAmount = budgetData.monthlyAmountsByCategory[0];
      expect(firstCategoryAmount.category).toBeDefined();
      expect(firstCategoryAmount.category.id).toBeDefined();
      expect(Array.isArray(firstCategoryAmount.monthlyAmounts)).toBe(true);

      if (firstCategoryAmount.monthlyAmounts.length > 0) {
        const amount = firstCategoryAmount.monthlyAmounts[0];
        expect(amount.month).toBeDefined();
        expect(typeof amount.plannedCashFlowAmount).toBe("number");
        expect(typeof amount.actualAmount).toBe("number");
        expect(typeof amount.remainingAmount).toBe("number");
        expect(typeof amount.cumulativeActualAmount).toBe("number");
      }
    }

    // Validate totals by month
    if (budgetData.totalsByMonth.length > 0) {
      const firstMonthTotals = budgetData.totalsByMonth[0];
      expect(firstMonthTotals.month).toBeDefined();
      expect(firstMonthTotals.totalIncome).toBeDefined();
      expect(firstMonthTotals.totalExpenses).toBeDefined();
      expect(firstMonthTotals.totalFixedExpenses).toBeDefined();
      expect(firstMonthTotals.totalFlexibleExpenses).toBeDefined();

      expect(typeof firstMonthTotals.totalIncome.actualAmount).toBe("number");
      expect(typeof firstMonthTotals.totalIncome.plannedAmount).toBe("number");
    }

    // Validate category groups
    if (report.categoryGroups.length > 0) {
      const firstGroup = report.categoryGroups[0];
      expect(firstGroup.id).toBeDefined();
      expect(firstGroup.name).toBeDefined();
      expect(typeof firstGroup.order).toBe("number");
      expect(firstGroup.type).toBeDefined();
      expect(["income", "expense", "transfer"]).toContain(firstGroup.type);
      expect(Array.isArray(firstGroup.categories)).toBe(true);

      // Validate categories within group
      if (firstGroup.categories.length > 0) {
        const firstCategory = firstGroup.categories[0];
        expect(firstCategory.id).toBeDefined();
        expect(firstCategory.name).toBeDefined();
        expect(firstCategory.icon).toBeDefined();
        expect(typeof firstCategory.order).toBe("number");
        expect(typeof firstCategory.excludeFromBudget).toBe("boolean");
        expect(typeof firstCategory.isSystemCategory).toBe("boolean");
        expect(firstCategory.group).toBeDefined();
        expect(firstCategory.group.id).toBe(firstGroup.id);
      }
    }

    // Validate goals V2
    if (report.goalsV2.length > 0) {
      const firstGoal = report.goalsV2[0];
      expect(firstGoal.id).toBeDefined();
      expect(firstGoal.name).toBeDefined();
      expect(typeof firstGoal.priority).toBe("number");
      expect(Array.isArray(firstGoal.plannedContributions)).toBe(true);
      expect(Array.isArray(firstGoal.monthlyContributionSummaries)).toBe(true);
    }
  });

  test("getBudgetReport works with different date ranges", async () => {
    const { auth, client } = getIntegrationContext();
    
    // Test with a single month
    const singleMonthReport = await getBudgetReport(auth, client, {
      startDate: "2026-01-01",
      endDate: "2026-01-01",
    });

    expect(singleMonthReport).toBeDefined();
    expect(singleMonthReport.budgetData).toBeDefined();
    
    // Test with a longer period
    const longPeriodReport = await getBudgetReport(auth, client, {
      startDate: "2025-01-01",
      endDate: "2025-12-01",
    });

    expect(longPeriodReport).toBeDefined();
    expect(longPeriodReport.budgetData).toBeDefined();
  });
});

