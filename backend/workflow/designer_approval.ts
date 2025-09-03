import { api, APIError } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { notification } from "~encore/clients";
import { audit } from "~encore/clients";

const designerDB = SQLDatabase.named("designer");
const userDB = SQLDatabase.named("user");

export interface ProcessDesignerApplicationRequest {
  designerId: number;
  action: "approve" | "reject";
  notes?: string;
  reviewerId: number;
}

export interface ProcessDesignerApplicationResponse {
  success: boolean;
  status: string;
  message: string;
}

// Processes a designer application approval or rejection.
export const processDesignerApplication = api<ProcessDesignerApplicationRequest, ProcessDesignerApplicationResponse>(
  { expose: true, method: "POST", path: "/workflow/designer/process" },
  async ({ designerId, action, notes, reviewerId }) => {
    // Get designer details
    const designer = await designerDB.queryRow`
      SELECT d.*, u.email, u.first_name, u.last_name 
      FROM designers d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = ${designerId}
    `;

    if (!designer) {
      throw APIError.notFound("Designer not found");
    }

    if (designer.verification_status !== 'pending') {
      throw APIError.failedPrecondition("Designer application has already been processed");
    }

    const newStatus = action === 'approve' ? 'verified' : 'rejected';

    try {
      // Update designer status
      await designerDB.exec`
        UPDATE designers 
        SET verification_status = ${newStatus}, 
            verification_notes = ${notes || ''},
            updated_at = NOW()
        WHERE id = ${designerId}
      `;

      // Log the action for audit
      await audit.logAction({
        userId: reviewerId,
        action: `designer_${action}`,
        resourceType: 'designer',
        resourceId: designerId,
        oldValues: { verification_status: 'pending' },
        newValues: { verification_status: newStatus, verification_notes: notes },
      });

      // Send notification email
      await notification.sendDesignerVerification({
        designerEmail: designer.email,
        designerName: `${designer.first_name} ${designer.last_name}`,
        status: newStatus,
        notes,
      });

      return {
        success: true,
        status: newStatus,
        message: `Designer application ${action}d successfully`,
      };

    } catch (error: any) {
      throw APIError.internal(`Failed to process designer application: ${error.message}`);
    }
  }
);

export interface GetPendingApplicationsResponse {
  applications: Array<{
    id: number;
    brandName: string;
    bio?: string;
    website?: string;
    instagram?: string;
    userName: string;
    userEmail: string;
    submittedAt: Date;
    portfolioCount: number;
  }>;
  total: number;
}

// Retrieves pending designer applications for review.
export const getPendingApplications = api<void, GetPendingApplicationsResponse>(
  { expose: true, method: "GET", path: "/workflow/designer/pending" },
  async () => {
    const applications = await designerDB.queryAll`
      SELECT d.id, d.brand_name, d.bio, d.website, d.instagram, d.created_at,
             u.first_name, u.last_name, u.email,
             COUNT(pi.id) as portfolio_count
      FROM designers d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN portfolio_items pi ON d.id = pi.designer_id
      WHERE d.verification_status = 'pending'
      GROUP BY d.id, d.brand_name, d.bio, d.website, d.instagram, d.created_at,
               u.first_name, u.last_name, u.email
      ORDER BY d.created_at ASC
    `;

    const formattedApplications = applications.map(app => ({
      id: app.id,
      brandName: app.brand_name,
      bio: app.bio,
      website: app.website,
      instagram: app.instagram,
      userName: `${app.first_name} ${app.last_name}`,
      userEmail: app.email,
      submittedAt: app.created_at,
      portfolioCount: app.portfolio_count || 0,
    }));

    return {
      applications: formattedApplications,
      total: formattedApplications.length,
    };
  }
);
