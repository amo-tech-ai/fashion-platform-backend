export type GDPRRequestType = "access" | "portability" | "deletion" | "rectification";
export type GDPRRequestStatus = "pending" | "processing" | "completed" | "rejected";

export interface AuditLog {
  id: number;
  userId?: number;
  action: string;
  resourceType: string;
  resourceId?: number;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface GDPRRequest {
  id: number;
  userId: number;
  requestType: GDPRRequestType;
  status: GDPRRequestStatus;
  requestDetails?: Record<string, any>;
  responseData?: Record<string, any>;
  requestedAt: Date;
  completedAt?: Date;
  notes?: string;
}
