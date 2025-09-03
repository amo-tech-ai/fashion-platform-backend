import { api, APIError } from "encore.dev/api";
import { organizerDB } from "./db";
import type { EventBudget } from "./types";

export interface CreateBudgetItemRequest {
  projectId: number;
  category: string;
  subcategory?: string;
  budgetedAmount: number;
  vendorName?: string;
  vendorContact?: string;
  paymentDueDate?: Date;
  notes?: string;
}

// Creates a new budget item.
export const createBudgetItem = api<CreateBudgetItemRequest, EventBudget>(
  { expose: true, method: "POST", path: "/organizers/budget/items" },
  async (req) => {
    // Verify project exists
    const project = await organizerDB.queryRow`
      SELECT id FROM event_projects WHERE id = ${req.projectId}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    if (req.budgetedAmount < 0) {
      throw APIError.invalidArgument("Budgeted amount cannot be negative");
    }

    const row = await organizerDB.queryRow`
      INSERT INTO event_budgets (
        project_id, category, subcategory, budgeted_amount, vendor_name,
        vendor_contact, payment_due_date, notes
      )
      VALUES (
        ${req.projectId}, ${req.category}, ${req.subcategory}, ${req.budgetedAmount},
        ${req.vendorName}, ${req.vendorContact}, ${req.paymentDueDate}, ${req.notes}
      )
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create budget item");
    }

    return {
      id: row.id,
      projectId: row.project_id,
      category: row.category,
      subcategory: row.subcategory,
      budgetedAmount: row.budgeted_amount,
      actualAmount: row.actual_amount,
      vendorName: row.vendor_name,
      vendorContact: row.vendor_contact,
      paymentStatus: row.payment_status as any,
      paymentDueDate: row.payment_due_date,
      invoiceNumber: row.invoice_number,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);

export interface UpdateBudgetItemRequest {
  budgetItemId: number;
  actualAmount?: number;
  paymentStatus?: string;
  invoiceNumber?: string;
  notes?: string;
}

// Updates budget item with actual spending.
export const updateBudgetItem = api<UpdateBudgetItemRequest, EventBudget>(
  { expose: true, method: "PUT", path: "/organizers/budget/items/:budgetItemId" },
  async ({ budgetItemId, actualAmount, paymentStatus, invoiceNumber, notes }) => {
    const row = await organizerDB.queryRow`
      UPDATE event_budgets 
      SET 
        actual_amount = COALESCE(${actualAmount}, actual_amount),
        payment_status = COALESCE(${paymentStatus}, payment_status),
        invoice_number = COALESCE(${invoiceNumber}, invoice_number),
        notes = COALESCE(${notes}, notes),
        updated_at = NOW()
      WHERE id = ${budgetItemId}
      RETURNING *
    `;

    if (!row) {
      throw APIError.notFound("Budget item not found");
    }

    // Update project budget spent
    const projectBudgetUpdate = await organizerDB.queryRow`
      UPDATE event_projects 
      SET budget_spent = (
        SELECT COALESCE(SUM(actual_amount), 0)
        FROM event_budgets
        WHERE project_id = ${row.project_id}
      )
      WHERE id = ${row.project_id}
      RETURNING budget_total, budget_spent
    `;

    // Check for budget overruns and create alerts
    if (projectBudgetUpdate && projectBudgetUpdate.budget_spent > projectBudgetUpdate.budget_total) {
      const project = await organizerDB.queryRow`
        SELECT organizer_id, project_name FROM event_projects WHERE id = ${row.project_id}
      `;

      if (project) {
        const overrun = projectBudgetUpdate.budget_spent - projectBudgetUpdate.budget_total;
        await organizerDB.exec`
          INSERT INTO event_alerts (
            organizer_id, project_id, alert_type, severity, title, message, action_required
          )
          VALUES (
            ${project.organizer_id}, ${row.project_id}, 'budget', 'high',
            'Budget Overrun Alert', 
            'Project "${project.project_name}" is over budget by $${overrun.toFixed(2)}',
            true
          )
        `;
      }
    }

    return {
      id: row.id,
      projectId: row.project_id,
      category: row.category,
      subcategory: row.subcategory,
      budgetedAmount: row.budgeted_amount,
      actualAmount: row.actual_amount,
      vendorName: row.vendor_name,
      vendorContact: row.vendor_contact,
      paymentStatus: row.payment_status as any,
      paymentDueDate: row.payment_due_date,
      invoiceNumber: row.invoice_number,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);

export interface GetBudgetAnalysisParams {
  projectId: number;
}

export interface BudgetAnalysis {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  categories: Array<{
    category: string;
    budgeted: number;
    actual: number;
    variance: number;
    percentageUsed: number;
  }>;
  upcomingPayments: Array<{
    id: number;
    vendorName: string;
    amount: number;
    dueDate: Date;
    category: string;
  }>;
  overBudgetItems: Array<{
    id: number;
    category: string;
    budgeted: number;
    actual: number;
    overrun: number;
  }>;
}

// Gets comprehensive budget analysis for a project.
export const getBudgetAnalysis = api<GetBudgetAnalysisParams, BudgetAnalysis>(
  { expose: true, method: "GET", path: "/organizers/projects/:projectId/budget/analysis" },
  async ({ projectId }) => {
    // Get project budget totals
    const projectTotals = await organizerDB.queryRow`
      SELECT budget_total, budget_spent FROM event_projects WHERE id = ${projectId}
    `;

    if (!projectTotals) {
      throw APIError.notFound("Project not found");
    }

    // Get category breakdown
    const categories = await organizerDB.queryAll`
      SELECT 
        category,
        SUM(budgeted_amount) as budgeted,
        SUM(actual_amount) as actual
      FROM event_budgets
      WHERE project_id = ${projectId}
      GROUP BY category
      ORDER BY budgeted DESC
    `;

    // Get upcoming payments
    const upcomingPayments = await organizerDB.queryAll`
      SELECT id, vendor_name, budgeted_amount, payment_due_date, category
      FROM event_budgets
      WHERE project_id = ${projectId}
        AND payment_status = 'pending'
        AND payment_due_date IS NOT NULL
        AND payment_due_date <= NOW() + INTERVAL '30 days'
      ORDER BY payment_due_date ASC
    `;

    // Get over-budget items
    const overBudgetItems = await organizerDB.queryAll`
      SELECT id, category, budgeted_amount, actual_amount
      FROM event_budgets
      WHERE project_id = ${projectId}
        AND actual_amount > budgeted_amount
      ORDER BY (actual_amount - budgeted_amount) DESC
    `;

    const totalBudget = projectTotals.budget_total;
    const totalSpent = projectTotals.budget_spent;
    const remaining = totalBudget - totalSpent;
    const percentageUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return {
      totalBudget,
      totalSpent,
      remaining,
      percentageUsed,
      categories: categories.map(cat => ({
        category: cat.category,
        budgeted: cat.budgeted,
        actual: cat.actual,
        variance: cat.budgeted - cat.actual,
        percentageUsed: cat.budgeted > 0 ? (cat.actual / cat.budgeted) * 100 : 0,
      })),
      upcomingPayments: upcomingPayments.map(payment => ({
        id: payment.id,
        vendorName: payment.vendor_name || 'Unknown Vendor',
        amount: payment.budgeted_amount,
        dueDate: payment.payment_due_date,
        category: payment.category,
      })),
      overBudgetItems: overBudgetItems.map(item => ({
        id: item.id,
        category: item.category,
        budgeted: item.budgeted_amount,
        actual: item.actual_amount,
        overrun: item.actual_amount - item.budgeted_amount,
      })),
    };
  }
);

export interface BudgetForecastParams {
  projectId: number;
}

export interface BudgetForecast {
  projectedTotal: number;
  projectedOverrun: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  monthlyProjection: Array<{
    month: string;
    projectedSpend: number;
    cumulativeSpend: number;
  }>;
}

// Generates budget forecast and recommendations.
export const getBudgetForecast = api<BudgetForecastParams, BudgetForecast>(
  { expose: true, method: "GET", path: "/organizers/projects/:projectId/budget/forecast" },
  async ({ projectId }) => {
    // Get project details
    const project = await organizerDB.queryRow`
      SELECT budget_total, budget_spent, start_date, end_date FROM event_projects WHERE id = ${projectId}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    // Get spending pattern
    const spendingHistory = await organizerDB.queryAll`
      SELECT 
        DATE_TRUNC('month', updated_at) as month,
        SUM(actual_amount) as monthly_spend
      FROM event_budgets
      WHERE project_id = ${projectId}
        AND actual_amount > 0
      GROUP BY DATE_TRUNC('month', updated_at)
      ORDER BY month ASC
    `;

    // Get pending commitments
    const pendingCommitments = await organizerDB.queryRow`
      SELECT COALESCE(SUM(budgeted_amount), 0) as pending_amount
      FROM event_budgets
      WHERE project_id = ${projectId}
        AND payment_status = 'pending'
    `;

    // Calculate projections
    const currentSpent = project.budget_spent;
    const pendingAmount = pendingCommitments?.pending_amount || 0;
    const projectedTotal = currentSpent + pendingAmount;
    const projectedOverrun = Math.max(0, projectedTotal - project.budget_total);

    // Determine risk level
    const budgetUtilization = projectedTotal / project.budget_total;
    let riskLevel: 'low' | 'medium' | 'high';
    if (budgetUtilization <= 0.8) riskLevel = 'low';
    else if (budgetUtilization <= 1.0) riskLevel = 'medium';
    else riskLevel = 'high';

    // Generate recommendations
    const recommendations: string[] = [];
    if (riskLevel === 'high') {
      recommendations.push('Consider reducing scope or finding cost savings');
      recommendations.push('Review vendor contracts for potential renegotiation');
      recommendations.push('Prioritize essential items only');
    } else if (riskLevel === 'medium') {
      recommendations.push('Monitor spending closely');
      recommendations.push('Look for opportunities to optimize costs');
    } else {
      recommendations.push('Budget is on track');
      recommendations.push('Consider allocating remaining budget to enhance event quality');
    }

    // Generate monthly projection
    const monthlyProjection = [];
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);
    const monthsDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const monthlyBudget = project.budget_total / Math.max(1, monthsDiff);

    for (let i = 0; i < monthsDiff; i++) {
      const month = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      monthlyProjection.push({
        month: month.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        projectedSpend: monthlyBudget,
        cumulativeSpend: monthlyBudget * (i + 1),
      });
    }

    return {
      projectedTotal,
      projectedOverrun,
      riskLevel,
      recommendations,
      monthlyProjection,
    };
  }
);
