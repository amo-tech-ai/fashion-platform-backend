import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import type { FullProductionPlan } from "./types";
import { getPlanFramework } from "./frameworks";

export interface CreatePlanRequest {
  eventName: string;
  eventType: 'designer_showcase' | 'fashion_networking' | 'product_launch';
  attendeeCount: number;
  budget: number;
  timelineDays: number;
  organizerId: number;
}

// Create a new production plan
export const create = api<CreatePlanRequest, { planId: number }>(
  { method: "POST", path: "/production/plans" },
  async ({ eventName, eventType, attendeeCount, budget, timelineDays, organizerId }) => {
    await using tx = await db.begin();

    try {
      const framework = getPlanFramework(eventType, attendeeCount, budget, timelineDays);

      // Create a draft event
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + timelineDays);

      const event = await tx.queryRow`
        INSERT INTO events (name, date, venue, capacity, description, organizer_id, status)
        VALUES (
          ${eventName}, ${eventDate}, ${framework.venueRequirements.type}, 
          ${attendeeCount}, 'Event created via production plan.', ${organizerId}, 'draft'
        )
        RETURNING id
      `;
      if (!event) throw APIError.internal("Failed to create event");

      // Create the production plan
      const plan = await tx.queryRow`
        INSERT INTO production_plans (
          event_id, event_type, attendee_count, budget, timeline_days,
          venue_requirements, staffing_plan, vendor_requirements, success_criteria
        )
        VALUES (
          ${event.id}, ${eventType}, ${attendeeCount}, ${budget}, ${timelineDays},
          ${JSON.stringify(framework.venueRequirements)}, 
          ${JSON.stringify(framework.staffingPlan)}, 
          ${JSON.stringify(framework.vendorRequirements)}, 
          ${JSON.stringify(framework.successCriteria)}
        )
        RETURNING id
      `;
      if (!plan) throw APIError.internal("Failed to create production plan");

      // Link plan to event
      await tx.exec`
        UPDATE events SET production_plan_id = ${plan.id} WHERE id = ${event.id}
      `;

      // Create budget allocations
      for (const item of framework.budgetAllocations) {
        await tx.exec`
          INSERT INTO plan_budget_allocations (plan_id, category, allocated_amount, percentage)
          VALUES (${plan.id}, ${item.category}, ${item.allocatedAmount}, ${item.percentage})
        `;
      }

      // Create timeline milestones
      for (const milestone of framework.timelineMilestones) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + milestone.dueInDays);
        await tx.exec`
          INSERT INTO plan_timeline_milestones (plan_id, name, description, due_date, assigned_to)
          VALUES (${plan.id}, ${milestone.name}, ${milestone.description}, ${dueDate}, ${milestone.assignedTo})
        `;
      }

      // Create stakeholders
      for (const stakeholder of framework.stakeholders) {
        await tx.exec`
          INSERT INTO plan_stakeholders (plan_id, role, responsibilities)
          VALUES (${plan.id}, ${stakeholder.role}, ${stakeholder.responsibilities})
        `;
      }

      await tx.commit();
      return { planId: plan.id };
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }
);
