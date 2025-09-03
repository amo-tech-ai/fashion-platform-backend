import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import type { FullProductionPlan } from "./types";

export interface GetPlanParams {
  planId: number;
}

// Get a full production plan
export const get = api<GetPlanParams, FullProductionPlan>(
  { method: "GET", path: "/production/plans/:planId" },
  async ({ planId }) => {
    const plan = await db.queryRow`
      SELECT 
        pp.*,
        e.name as event_name,
        e.date as event_date,
        e.status as event_status
      FROM production_plans pp
      JOIN events e ON pp.event_id = e.id
      WHERE pp.id = ${planId}
    `;
    if (!plan) throw APIError.notFound("Production plan not found");

    const milestones = await db.queryAll`
      SELECT * FROM plan_timeline_milestones WHERE plan_id = ${planId} ORDER BY due_date ASC
    `;
    const budgetAllocations = await db.queryAll`
      SELECT * FROM plan_budget_allocations WHERE plan_id = ${planId}
    `;
    const stakeholders = await db.queryAll`
      SELECT * FROM plan_stakeholders WHERE plan_id = ${planId}
    `;

    return {
      id: plan.id,
      eventId: plan.event_id,
      eventType: plan.event_type,
      attendeeCount: plan.attendee_count,
      budget: plan.budget,
      timelineDays: plan.timeline_days,
      venueRequirements: plan.venue_requirements,
      staffingPlan: plan.staffing_plan,
      vendorRequirements: plan.vendor_requirements,
      successCriteria: plan.success_criteria,
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
      eventName: plan.event_name,
      eventDate: plan.event_date,
      eventStatus: plan.event_status,
      milestones: milestones.map(m => ({ ...m, planId: m.plan_id, dueDate: m.due_date, assignedTo: m.assigned_to })),
      budgetAllocations: budgetAllocations.map(b => ({ ...b, planId: b.plan_id, allocatedAmount: b.allocated_amount, actualAmount: b.actual_amount })),
      stakeholders: stakeholders.map(s => ({ ...s, planId: s.plan_id })),
    };
  }
);
