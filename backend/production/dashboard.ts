import { api, APIError } from "encore.dev/api";
import { db } from "./db";

export interface GetPlanDashboardParams {
  planId: number;
}

export interface BudgetStatus {
  category: string;
  allocated: number;
  spent: number;
  variance: number;
  percentage: number;
}

export interface TimelineStatus {
  totalMilestones: number;
  completed: number;
  inProgress: number;
  pending: number;
  delayed: number;
  completionPercentage: number;
}

export interface PlanDashboardResponse {
  planId: number;
  eventName: string;
  budgetStatus: BudgetStatus[];
  timelineStatus: TimelineStatus;
  totalBudget: number;
  totalSpent: number;
  budgetVariance: number;
}

// Get dashboard data for a production plan
export const getDashboard = api<GetPlanDashboardParams, PlanDashboardResponse>(
  { method: "GET", path: "/production/plans/:planId/dashboard" },
  async ({ planId }) => {
    const plan = await db.queryRow`
      SELECT pp.id, pp.budget, e.name as event_name
      FROM production_plans pp
      JOIN events e ON pp.event_id = e.id
      WHERE pp.id = ${planId}
    `;
    if (!plan) throw APIError.notFound("Production plan not found");

    // Budget status
    const budgetAllocations = await db.queryAll`
      SELECT * FROM plan_budget_allocations WHERE plan_id = ${planId}
    `;

    const budgetStatus: BudgetStatus[] = [];
    let totalSpent = 0;

    for (const alloc of budgetAllocations) {
      const contracts = await db.queryAll`
        SELECT contract_value FROM plan_vendor_contracts 
        WHERE budget_allocation_id = ${alloc.id} AND status != 'cancelled'
      `;
      const spent = contracts.reduce((sum, c) => sum + c.contract_value, 0);
      totalSpent += spent;

      budgetStatus.push({
        category: alloc.category,
        allocated: alloc.allocated_amount,
        spent,
        variance: alloc.allocated_amount - spent,
        percentage: alloc.percentage,
      });
    }

    // Timeline status
    const milestones = await db.queryAll`
      SELECT status FROM plan_timeline_milestones WHERE plan_id = ${planId}
    `;

    const timelineStatus: TimelineStatus = {
      totalMilestones: milestones.length,
      completed: milestones.filter(m => m.status === 'completed').length,
      inProgress: milestones.filter(m => m.status === 'in_progress').length,
      pending: milestones.filter(m => m.status === 'pending').length,
      delayed: milestones.filter(m => m.status === 'delayed').length,
      completionPercentage: milestones.length > 0 ? (milestones.filter(m => m.status === 'completed').length / milestones.length) * 100 : 0,
    };

    return {
      planId: plan.id,
      eventName: plan.event_name,
      budgetStatus,
      timelineStatus,
      totalBudget: plan.budget,
      totalSpent,
      budgetVariance: plan.budget - totalSpent,
    };
  }
);
