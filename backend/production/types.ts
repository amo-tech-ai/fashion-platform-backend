export interface ProductionPlan {
  id: number;
  eventId: number;
  eventType: string;
  attendeeCount: number;
  budget: number;
  timelineDays: number;
  venueRequirements: Record<string, any>;
  staffingPlan: Record<string, any>;
  vendorRequirements: Record<string, any>;
  successCriteria: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimelineMilestone {
  id: number;
  planId: number;
  name: string;
  description?: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  assignedTo?: string;
}

export interface BudgetAllocation {
  id: number;
  planId: number;
  category: string;
  allocatedAmount: number;
  actualAmount: number;
  percentage: number;
}

export interface Stakeholder {
  id: number;
  planId: number;
  role: string;
  name?: string;
  email?: string;
  responsibilities?: string;
}

export interface FullProductionPlan extends ProductionPlan {
  eventName: string;
  eventDate: Date;
  eventStatus: string;
  milestones: TimelineMilestone[];
  budgetAllocations: BudgetAllocation[];
  stakeholders: Stakeholder[];
}
