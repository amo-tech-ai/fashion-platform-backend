import { api, APIError } from "encore.dev/api";
import { organizerDB } from "./db";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import type { EventProject, ProjectOverview } from "./types";

const eventDB = SQLDatabase.named("event");

export interface CreateProjectRequest {
  organizerId: number;
  eventId: number;
  projectName: string;
  budgetTotal: number;
  startDate: Date;
  endDate: Date;
  description?: string;
  priority?: string;
}

// Creates a new event project.
export const createProject = api<CreateProjectRequest, EventProject>(
  { expose: true, method: "POST", path: "/organizers/projects" },
  async (req) => {
    // Verify event exists
    const event = await eventDB.queryRow`
      SELECT id FROM events WHERE id = ${req.eventId}
    `;

    if (!event) {
      throw APIError.notFound("Event not found");
    }

    // Check if project already exists for this event
    const existing = await organizerDB.queryRow`
      SELECT id FROM event_projects 
      WHERE organizer_id = ${req.organizerId} AND event_id = ${req.eventId}
    `;

    if (existing) {
      throw APIError.alreadyExists("Project already exists for this event");
    }

    // Validate dates
    if (req.startDate >= req.endDate) {
      throw APIError.invalidArgument("Start date must be before end date");
    }

    const row = await organizerDB.queryRow`
      INSERT INTO event_projects (
        organizer_id, event_id, project_name, budget_total, 
        start_date, end_date, description, priority
      )
      VALUES (
        ${req.organizerId}, ${req.eventId}, ${req.projectName}, ${req.budgetTotal},
        ${req.startDate}, ${req.endDate}, ${req.description}, ${req.priority || 'medium'}
      )
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create project");
    }

    return {
      id: row.id,
      organizerId: row.organizer_id,
      eventId: row.event_id,
      projectName: row.project_name,
      projectStatus: row.project_status as any,
      budgetTotal: row.budget_total,
      budgetSpent: row.budget_spent,
      startDate: row.start_date,
      endDate: row.end_date,
      description: row.description,
      priority: row.priority as any,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);

export interface GetProjectOverviewParams {
  projectId: number;
}

// Gets comprehensive project overview with all related data.
export const getProjectOverview = api<GetProjectOverviewParams, ProjectOverview>(
  { expose: true, method: "GET", path: "/organizers/projects/:projectId/overview" },
  async ({ projectId }) => {
    // Get project details
    const project = await organizerDB.queryRow`
      SELECT * FROM event_projects WHERE id = ${projectId}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    // Get timeline tasks
    const timeline = await organizerDB.queryAll`
      SELECT 
        et.*,
        u.first_name || ' ' || u.last_name as assigned_to_name
      FROM event_timeline et
      LEFT JOIN users u ON et.assigned_to = u.id
      WHERE et.project_id = ${projectId}
      ORDER BY et.due_date ASC, et.priority DESC
    `;

    // Get budget breakdown
    const budgetItems = await organizerDB.queryAll`
      SELECT 
        category,
        SUM(budgeted_amount) as budgeted,
        SUM(actual_amount) as actual
      FROM event_budgets
      WHERE project_id = ${projectId}
      GROUP BY category
      ORDER BY budgeted DESC
    `;

    const budgetTotal = budgetItems.reduce((sum, item) => sum + item.budgeted, 0);
    const budgetSpent = budgetItems.reduce((sum, item) => sum + item.actual, 0);

    // Get staff assignments
    const staff = await organizerDB.queryAll`
      SELECT 
        esa.*,
        u.first_name || ' ' || u.last_name as staff_name,
        u.email as staff_email
      FROM event_staff_assignments esa
      JOIN users u ON esa.staff_user_id = u.id
      WHERE esa.project_id = ${projectId}
      ORDER BY esa.start_time ASC
    `;

    // Get designer coordination
    const designers = await organizerDB.queryAll`
      SELECT 
        edc.*,
        d.brand_name
      FROM event_designer_coordination edc
      JOIN designers d ON edc.designer_id = d.id
      WHERE edc.project_id = ${projectId}
      ORDER BY edc.slot_time ASC
    `;

    // Get vendor management
    const vendors = await organizerDB.queryAll`
      SELECT * FROM event_vendor_management
      WHERE project_id = ${projectId}
      ORDER BY delivery_date ASC
    `;

    // Get logistics
    const logistics = await organizerDB.queryAll`
      SELECT * FROM event_logistics
      WHERE project_id = ${projectId}
      ORDER BY delivery_time ASC
    `;

    // Get recent communications
    const recentCommunications = await organizerDB.queryAll`
      SELECT 
        ec.*,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM event_communications ec
      JOIN users u ON ec.created_by = u.id
      WHERE ec.project_id = ${projectId}
      ORDER BY ec.created_at DESC
      LIMIT 10
    `;

    return {
      project: {
        id: project.id,
        organizerId: project.organizer_id,
        eventId: project.event_id,
        projectName: project.project_name,
        projectStatus: project.project_status as any,
        budgetTotal: project.budget_total,
        budgetSpent: project.budget_spent,
        startDate: project.start_date,
        endDate: project.end_date,
        description: project.description,
        priority: project.priority as any,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
      },
      timeline: timeline.map(task => ({
        id: task.id,
        projectId: task.project_id,
        taskName: task.task_name,
        taskDescription: task.task_description,
        assignedTo: task.assigned_to,
        dueDate: task.due_date,
        status: task.status as any,
        priority: task.priority as any,
        dependencies: task.dependencies || [],
        estimatedHours: task.estimated_hours,
        actualHours: task.actual_hours,
        completionPercentage: task.completion_percentage,
        notes: task.notes,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      })),
      budget: {
        total: budgetTotal,
        spent: budgetSpent,
        remaining: budgetTotal - budgetSpent,
        categories: budgetItems.map(item => ({
          category: item.category,
          budgeted: item.budgeted,
          actual: item.actual,
          variance: item.budgeted - item.actual,
        })),
      },
      staff: staff.map(member => ({
        id: member.id,
        projectId: member.project_id,
        staffUserId: member.staff_user_id,
        role: member.role,
        hourlyRate: member.hourly_rate,
        startTime: member.start_time,
        endTime: member.end_time,
        responsibilities: member.responsibilities || [],
        contactInfo: member.contact_info || {},
        status: member.status as any,
        notes: member.notes,
        createdAt: member.created_at,
        updatedAt: member.updated_at,
      })),
      designers: designers.map(designer => ({
        id: designer.id,
        projectId: designer.project_id,
        designerId: designer.designer_id,
        slotTime: designer.slot_time,
        slotDuration: designer.slot_duration,
        collectionName: designer.collection_name,
        modelCount: designer.model_count,
        musicRequirements: designer.music_requirements,
        lightingRequirements: designer.lighting_requirements,
        specialRequests: designer.special_requests,
        rehearsalTime: designer.rehearsal_time,
        status: designer.status,
        contactNotes: designer.contact_notes,
        createdAt: designer.created_at,
        updatedAt: designer.updated_at,
      })),
      vendors: vendors.map(vendor => ({
        id: vendor.id,
        projectId: vendor.project_id,
        vendorName: vendor.vendor_name,
        vendorType: vendor.vendor_type,
        contactPerson: vendor.contact_person,
        email: vendor.email,
        phone: vendor.phone,
        serviceDescription: vendor.service_description,
        contractAmount: vendor.contract_amount,
        paymentTerms: vendor.payment_terms,
        deliveryDate: vendor.delivery_date,
        status: vendor.status as any,
        performanceRating: vendor.performance_rating,
        notes: vendor.notes,
        createdAt: vendor.created_at,
        updatedAt: vendor.updated_at,
      })),
      logistics: logistics.map(item => ({
        id: item.id,
        projectId: item.project_id,
        logisticsType: item.logistics_type,
        itemName: item.item_name,
        quantity: item.quantity,
        supplier: item.supplier,
        deliveryTime: item.delivery_time,
        pickupTime: item.pickup_time,
        location: item.location,
        status: item.status as any,
        cost: item.cost,
        responsiblePerson: item.responsible_person,
        notes: item.notes,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
      recentCommunications: recentCommunications.map(comm => ({
        id: comm.id,
        projectId: comm.project_id,
        communicationType: comm.communication_type as any,
        recipientType: comm.recipient_type as any,
        subject: comm.subject,
        message: comm.message,
        scheduledTime: comm.scheduled_time,
        sentTime: comm.sent_time,
        status: comm.status as any,
        recipientCount: comm.recipient_count,
        deliveryCount: comm.delivery_count,
        openCount: comm.open_count,
        clickCount: comm.click_count,
        createdBy: comm.created_by,
        createdAt: comm.created_at,
      })),
    };
  }
);

export interface UpdateProjectStatusRequest {
  projectId: number;
  status: string;
  notes?: string;
}

// Updates project status.
export const updateProjectStatus = api<UpdateProjectStatusRequest, EventProject>(
  { expose: true, method: "PUT", path: "/organizers/projects/:projectId/status" },
  async ({ projectId, status, notes }) => {
    const row = await organizerDB.queryRow`
      UPDATE event_projects 
      SET project_status = ${status}, updated_at = NOW()
      WHERE id = ${projectId}
      RETURNING *
    `;

    if (!row) {
      throw APIError.notFound("Project not found");
    }

    // Create alert for status change
    await organizerDB.exec`
      INSERT INTO event_alerts (
        organizer_id, project_id, alert_type, severity, title, message
      )
      VALUES (
        ${row.organizer_id}, ${projectId}, 'system', 'medium',
        'Project Status Updated', 
        'Project "${row.project_name}" status changed to ${status}'
      )
    `;

    return {
      id: row.id,
      organizerId: row.organizer_id,
      eventId: row.event_id,
      projectName: row.project_name,
      projectStatus: row.project_status as any,
      budgetTotal: row.budget_total,
      budgetSpent: row.budget_spent,
      startDate: row.start_date,
      endDate: row.end_date,
      description: row.description,
      priority: row.priority as any,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);
