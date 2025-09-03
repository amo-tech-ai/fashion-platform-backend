export type VerificationStatus = "pending" | "verified" | "rejected";
export type ProjectStatus = "planning" | "in_progress" | "completed" | "cancelled";
export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue" | "cancelled";
export type Priority = "low" | "medium" | "high" | "urgent";
export type StaffStatus = "assigned" | "confirmed" | "checked_in" | "completed" | "no_show";
export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled";
export type VendorStatus = "contracted" | "confirmed" | "in_progress" | "delivered" | "completed" | "cancelled";
export type LogisticsStatus = "ordered" | "confirmed" | "in_transit" | "delivered" | "setup" | "returned";
export type CommunicationType = "email" | "sms" | "call" | "meeting" | "announcement";
export type RecipientType = "all" | "designers" | "staff" | "vendors" | "attendees" | "sponsors" | "media";
export type CommunicationStatus = "draft" | "scheduled" | "sent" | "delivered" | "failed";
export type AlertType = "deadline" | "budget" | "capacity" | "payment" | "staff" | "vendor" | "system";
export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface EventOrganizer {
  id: number;
  userId: number;
  companyName: string;
  bio?: string;
  website?: string;
  phone?: string;
  email: string;
  verificationStatus: VerificationStatus;
  specializations: string[];
  yearsExperience: number;
  portfolioUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventProject {
  id: number;
  organizerId: number;
  eventId: number;
  projectName: string;
  projectStatus: ProjectStatus;
  budgetTotal: number;
  budgetSpent: number;
  startDate: Date;
  endDate: Date;
  description?: string;
  priority: Priority;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventTimeline {
  id: number;
  projectId: number;
  taskName: string;
  taskDescription?: string;
  assignedTo?: number;
  dueDate: Date;
  status: TaskStatus;
  priority: Priority;
  dependencies: number[];
  estimatedHours?: number;
  actualHours?: number;
  completionPercentage: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventStaffAssignment {
  id: number;
  projectId: number;
  staffUserId: number;
  role: string;
  hourlyRate?: number;
  startTime?: Date;
  endTime?: Date;
  responsibilities: string[];
  contactInfo: Record<string, any>;
  status: StaffStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventBudget {
  id: number;
  projectId: number;
  category: string;
  subcategory?: string;
  budgetedAmount: number;
  actualAmount: number;
  vendorName?: string;
  vendorContact?: string;
  paymentStatus: PaymentStatus;
  paymentDueDate?: Date;
  invoiceNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventDesignerCoordination {
  id: number;
  projectId: number;
  designerId: number;
  slotTime?: Date;
  slotDuration: number;
  collectionName?: string;
  modelCount: number;
  musicRequirements?: string;
  lightingRequirements?: string;
  specialRequests?: string;
  rehearsalTime?: Date;
  status: string;
  contactNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventVendorManagement {
  id: number;
  projectId: number;
  vendorName: string;
  vendorType: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  serviceDescription?: string;
  contractAmount?: number;
  paymentTerms?: string;
  deliveryDate?: Date;
  status: VendorStatus;
  performanceRating?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventLogistics {
  id: number;
  projectId: number;
  logisticsType: string;
  itemName: string;
  quantity: number;
  supplier?: string;
  deliveryTime?: Date;
  pickupTime?: Date;
  location?: string;
  status: LogisticsStatus;
  cost?: number;
  responsiblePerson?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventCommunication {
  id: number;
  projectId: number;
  communicationType: CommunicationType;
  recipientType: RecipientType;
  subject?: string;
  message: string;
  scheduledTime?: Date;
  sentTime?: Date;
  status: CommunicationStatus;
  recipientCount: number;
  deliveryCount: number;
  openCount: number;
  clickCount: number;
  createdBy: number;
  createdAt: Date;
}

export interface EventAnalytics {
  id: number;
  projectId: number;
  metricName: string;
  metricValue: number;
  metricDate: Date;
  metricCategory?: string;
  additionalData?: Record<string, any>;
  createdAt: Date;
}

export interface EventAlert {
  id: number;
  organizerId: number;
  projectId?: number;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  actionRequired: boolean;
  actionUrl?: string;
  isRead: boolean;
  isResolved: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

export interface DashboardSummary {
  todayEvents: Array<{
    id: number;
    projectName: string;
    eventTime: Date;
    status: ProjectStatus;
    attendeeCount: number;
    urgentTasks: number;
  }>;
  weekMetrics: {
    totalEvents: number;
    totalRevenue: number;
    averageAttendance: number;
    completedTasks: number;
    pendingTasks: number;
  };
  urgentTasks: Array<{
    id: number;
    taskName: string;
    projectName: string;
    dueDate: Date;
    priority: Priority;
    assignedTo?: string;
  }>;
  revenueTracking: {
    thisMonth: number;
    lastMonth: number;
    percentageChange: number;
    projectedRevenue: number;
  };
  alerts: EventAlert[];
}

export interface ProjectOverview {
  project: EventProject;
  timeline: EventTimeline[];
  budget: {
    total: number;
    spent: number;
    remaining: number;
    categories: Array<{
      category: string;
      budgeted: number;
      actual: number;
      variance: number;
    }>;
  };
  staff: EventStaffAssignment[];
  designers: EventDesignerCoordination[];
  vendors: EventVendorManagement[];
  logistics: EventLogistics[];
  recentCommunications: EventCommunication[];
}
