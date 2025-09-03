import { api, APIError } from "encore.dev/api";
import { organizerDB } from "./db";
import { notification } from "~encore/clients";
import type { EventTimeline } from "./types";

export interface CreateTimelineTaskRequest {
  projectId: number;
  taskName: string;
  taskDescription?: string;
  assignedTo?: number;
  dueDate: Date;
  priority?: string;
  dependencies?: number[];
  estimatedHours?: number;
}

// Creates a new timeline task.
export const createTimelineTask = api<CreateTimelineTaskRequest, EventTimeline>(
  { expose: true, method: "POST", path: "/organizers/timeline/tasks" },
  async (req) => {
    // Verify project exists
    const project = await organizerDB.queryRow`
      SELECT id, project_name FROM event_projects WHERE id = ${req.projectId}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    // Validate dependencies exist
    if (req.dependencies && req.dependencies.length > 0) {
      const dependencyCount = await organizerDB.queryRow`
        SELECT COUNT(*) as count 
        FROM event_timeline 
        WHERE id = ANY(${req.dependencies}) AND project_id = ${req.projectId}
      `;

      if (dependencyCount.count !== req.dependencies.length) {
        throw APIError.invalidArgument("One or more dependencies do not exist in this project");
      }
    }

    const row = await organizerDB.queryRow`
      INSERT INTO event_timeline (
        project_id, task_name, task_description, assigned_to, due_date,
        priority, dependencies, estimated_hours
      )
      VALUES (
        ${req.projectId}, ${req.taskName}, ${req.taskDescription}, ${req.assignedTo},
        ${req.dueDate}, ${req.priority || 'medium'}, ${req.dependencies || []}, ${req.estimatedHours}
      )
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create timeline task");
    }

    // Send notification to assigned person
    if (req.assignedTo) {
      const assignee = await organizerDB.queryRow`
        SELECT email, first_name FROM users WHERE id = ${req.assignedTo}
      `;

      if (assignee) {
        await notification.sendEmail({
          to: assignee.email,
          subject: `New Task Assigned: ${req.taskName}`,
          htmlContent: `
            <h2>New Task Assignment</h2>
            <p>Hello ${assignee.first_name},</p>
            <p>You have been assigned a new task in project "${project.project_name}":</p>
            <div style="background-color: #f5f5f5; padding: 15px; margin: 15px 0;">
              <h3>${req.taskName}</h3>
              <p><strong>Due Date:</strong> ${req.dueDate.toLocaleDateString()}</p>
              <p><strong>Priority:</strong> ${req.priority || 'medium'}</p>
              ${req.taskDescription ? `<p><strong>Description:</strong> ${req.taskDescription}</p>` : ''}
            </div>
            <p>Please log in to the organizer dashboard to view more details and update your progress.</p>
          `,
        });
      }
    }

    return {
      id: row.id,
      projectId: row.project_id,
      taskName: row.task_name,
      taskDescription: row.task_description,
      assignedTo: row.assigned_to,
      dueDate: row.due_date,
      status: row.status as any,
      priority: row.priority as any,
      dependencies: row.dependencies || [],
      estimatedHours: row.estimated_hours,
      actualHours: row.actual_hours,
      completionPercentage: row.completion_percentage,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);

export interface UpdateTaskStatusRequest {
  taskId: number;
  status: string;
  completionPercentage?: number;
  actualHours?: number;
  notes?: string;
}

// Updates task status and progress.
export const updateTaskStatus = api<UpdateTaskStatusRequest, EventTimeline>(
  { expose: true, method: "PUT", path: "/organizers/timeline/tasks/:taskId/status" },
  async ({ taskId, status, completionPercentage, actualHours, notes }) => {
    const row = await organizerDB.queryRow`
      UPDATE event_timeline 
      SET 
        status = ${status},
        completion_percentage = COALESCE(${completionPercentage}, completion_percentage),
        actual_hours = COALESCE(${actualHours}, actual_hours),
        notes = COALESCE(${notes}, notes),
        updated_at = NOW()
      WHERE id = ${taskId}
      RETURNING *
    `;

    if (!row) {
      throw APIError.notFound("Task not found");
    }

    // Check for overdue tasks and create alerts
    if (status === 'overdue' || (row.due_date < new Date() && status !== 'completed')) {
      const project = await organizerDB.queryRow`
        SELECT organizer_id, project_name FROM event_projects WHERE id = ${row.project_id}
      `;

      if (project) {
        await organizerDB.exec`
          INSERT INTO event_alerts (
            organizer_id, project_id, alert_type, severity, title, message, action_required
          )
          VALUES (
            ${project.organizer_id}, ${row.project_id}, 'deadline', 'high',
            'Task Overdue', 
            'Task "${row.task_name}" in project "${project.project_name}" is overdue',
            true
          )
        `;
      }
    }

    // Check if task completion unblocks dependent tasks
    if (status === 'completed') {
      const dependentTasks = await organizerDB.queryAll`
        SELECT id, task_name, dependencies
        FROM event_timeline
        WHERE project_id = ${row.project_id}
          AND ${taskId} = ANY(dependencies)
          AND status = 'pending'
      `;

      for (const dependentTask of dependentTasks) {
        // Check if all dependencies are completed
        const incompleteDeps = await organizerDB.queryRow`
          SELECT COUNT(*) as count
          FROM event_timeline
          WHERE id = ANY(${dependentTask.dependencies})
            AND status != 'completed'
        `;

        if (incompleteDeps.count === 0) {
          // All dependencies completed, task can start
          await organizerDB.exec`
            UPDATE event_timeline
            SET status = 'in_progress'
            WHERE id = ${dependentTask.id}
          `;

          // Notify assigned person
          const assignedUser = await organizerDB.queryRow`
            SELECT u.email, u.first_name
            FROM event_timeline et
            JOIN users u ON et.assigned_to = u.id
            WHERE et.id = ${dependentTask.id}
          `;

          if (assignedUser) {
            await notification.sendEmail({
              to: assignedUser.email,
              subject: `Task Ready to Start: ${dependentTask.task_name}`,
              htmlContent: `
                <h2>Task Dependencies Completed</h2>
                <p>Hello ${assignedUser.first_name},</p>
                <p>All dependencies for your task "${dependentTask.task_name}" have been completed.</p>
                <p>You can now start working on this task.</p>
              `,
            });
          }
        }
      }
    }

    return {
      id: row.id,
      projectId: row.project_id,
      taskName: row.task_name,
      taskDescription: row.task_description,
      assignedTo: row.assigned_to,
      dueDate: row.due_date,
      status: row.status as any,
      priority: row.priority as any,
      dependencies: row.dependencies || [],
      estimatedHours: row.estimated_hours,
      actualHours: row.actual_hours,
      completionPercentage: row.completion_percentage,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);

export interface GetProjectTimelineParams {
  projectId: number;
  status?: string;
  assignedTo?: number;
}

export interface GetProjectTimelineResponse {
  tasks: EventTimeline[];
  summary: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    upcomingDeadlines: number;
    averageCompletionTime: number;
  };
}

// Gets project timeline with filtering and summary.
export const getProjectTimeline = api<GetProjectTimelineParams, GetProjectTimelineResponse>(
  { expose: true, method: "GET", path: "/organizers/projects/:projectId/timeline" },
  async ({ projectId, status, assignedTo }) => {
    let whereClause = "WHERE project_id = $1";
    const params: any[] = [projectId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (assignedTo) {
      whereClause += ` AND assigned_to = $${paramIndex}`;
      params.push(assignedTo);
      paramIndex++;
    }

    const query = `
      SELECT 
        et.*,
        u.first_name || ' ' || u.last_name as assigned_to_name
      FROM event_timeline et
      LEFT JOIN users u ON et.assigned_to = u.id
      ${whereClause}
      ORDER BY et.due_date ASC, et.priority DESC
    `;

    const tasks = await organizerDB.rawQueryAll(query, ...params);

    // Get summary statistics
    const summary = await organizerDB.queryRow`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'overdue' OR (due_date < NOW() AND status != 'completed') THEN 1 END) as overdue_tasks,
        COUNT(CASE WHEN due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND status != 'completed' THEN 1 END) as upcoming_deadlines,
        AVG(CASE WHEN status = 'completed' AND actual_hours IS NOT NULL THEN actual_hours END) as avg_completion_time
      FROM event_timeline
      WHERE project_id = ${projectId}
    `;

    return {
      tasks: tasks.map(task => ({
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
      summary: {
        totalTasks: summary?.total_tasks || 0,
        completedTasks: summary?.completed_tasks || 0,
        overdueTasks: summary?.overdue_tasks || 0,
        upcomingDeadlines: summary?.upcoming_deadlines || 0,
        averageCompletionTime: summary?.avg_completion_time || 0,
      },
    };
  }
);

export interface BulkUpdateTasksRequest {
  taskIds: number[];
  updates: {
    status?: string;
    assignedTo?: number;
    priority?: string;
    dueDate?: Date;
  };
}

// Updates multiple tasks at once.
export const bulkUpdateTasks = api<BulkUpdateTasksRequest, { updated: number }>(
  { expose: true, method: "PUT", path: "/organizers/timeline/tasks/bulk" },
  async ({ taskIds, updates }) => {
    if (taskIds.length === 0) {
      throw APIError.invalidArgument("No task IDs provided");
    }

    let updateClause = "SET updated_at = NOW()";
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.status) {
      updateClause += `, status = $${paramIndex}`;
      params.push(updates.status);
      paramIndex++;
    }

    if (updates.assignedTo) {
      updateClause += `, assigned_to = $${paramIndex}`;
      params.push(updates.assignedTo);
      paramIndex++;
    }

    if (updates.priority) {
      updateClause += `, priority = $${paramIndex}`;
      params.push(updates.priority);
      paramIndex++;
    }

    if (updates.dueDate) {
      updateClause += `, due_date = $${paramIndex}`;
      params.push(updates.dueDate);
      paramIndex++;
    }

    const query = `
      UPDATE event_timeline 
      ${updateClause}
      WHERE id = ANY($${paramIndex})
    `;
    params.push(taskIds);

    await organizerDB.rawExec(query, ...params);

    return { updated: taskIds.length };
  }
);
