// client/src/components/Reports/reportsUtils.js
// Safe formatting and spreadsheet formula injection prevention utilities

import { formatDate } from '../../lib/dateFormat.js';

/**
 * Escapes a cell value for CSV output and prevents spreadsheet formula injection.
 * Any untrusted string starting with '=', '+', '-', or '@' is prepended with a single quote.
 */
export function escapeCsvValue(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  // Formula injection prevention (OWASP CSV Injection)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function formatPercent(val) {
  if (val === null || val === undefined || isNaN(val)) return '0%';
  return `${Math.round(Number(val) * 10) / 10}%`;
}

export function formatNumber(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Number(val).toLocaleString('en-US');
}

export function formatDays(val) {
  if (val === null || val === undefined || isNaN(val) || Number(val) === 0) return '0 days';
  const num = Math.round(Number(val) * 10) / 10;
  return `${num} ${num === 1 ? 'day' : 'days'}`;
}

/**
 * Generates and downloads the full workspace CSV report safely.
 */
export function exportWorkspaceReportCsv({ reportsData, workspace, selectedBoardId, selectedTimeframe, canViewTeam }) {
  if (!reportsData) return;

  const summary = reportsData.summary || {};
  const boards = reportsData.boards_breakdown || [];
  const members = canViewTeam ? (reportsData.members_workload || []) : [];
  const overdue = reportsData.overdue_tasks_list || [];

  let csv = `sep=,\n`;
  csv += `WORKSPACE MANAGEMENT REPORT\n`;
  csv += `Workspace,${escapeCsvValue(reportsData.workspace?.name || workspace?.name || 'Workspace')}\n`;
  csv += `Generated At,${escapeCsvValue(new Date().toISOString())}\n`;
  csv += `Board Filter,${escapeCsvValue(selectedBoardId === 'all' ? 'All Boards' : selectedBoardId)}\n`;
  csv += `Timeframe,${escapeCsvValue(selectedTimeframe)}\n\n`;

  // Section 1: Summary KPIs
  csv += `WORKSPACE SUMMARY METRICS\n`;
  csv += `Total Tasks,Completed Tasks,In Progress Tasks,To Do Tasks,Review Tasks,Overdue Tasks,Due Soon Tasks,Unassigned Tasks,Completion Rate,Overdue Rate,Avg Cycle Time\n`;
  csv += `${summary.total_tasks || 0},${summary.completed_tasks || 0},${summary.in_progress_tasks || 0},${summary.todo_tasks || 0},${summary.review_tasks || 0},${summary.overdue_tasks || 0},${summary.due_soon_tasks || 0},${summary.unassigned_tasks || 0},${formatPercent(summary.completion_rate)},${formatPercent(summary.overdue_rate)},${formatDays(summary.avg_cycle_days)}\n\n`;

  // Section 2: Board Breakdowns
  csv += `PROJECT & BOARD PERFORMANCE\n`;
  csv += `Board Name,Total Tasks,To Do,In Progress,Completed,Overdue,Completion Rate\n`;
  boards.forEach((b) => {
    csv += `${escapeCsvValue(b.name)},${b.total_tasks || 0},${b.todo_tasks || 0},${b.in_progress_tasks || 0},${b.completed_tasks || 0},${b.overdue_tasks || 0},${formatPercent(b.completion_rate)}\n`;
  });
  csv += `\n`;

  // Section 3: Team Workload (if permitted)
  if (canViewTeam && members.length > 0) {
    csv += `TEAM WORKLOAD & PERFORMANCE\n`;
    csv += `Name,Email,Role,Assigned Tasks,To Do,In Progress,Review,Completed,Overdue,Completion Rate\n`;
    members.forEach((m) => {
      csv += `${escapeCsvValue(m.name)},${escapeCsvValue(m.email)},${escapeCsvValue(m.role || 'Member')},${m.assigned_tasks || 0},${m.todo_tasks || 0},${m.in_progress_tasks || 0},${m.review_tasks || 0},${m.completed_tasks || 0},${m.overdue_tasks || 0},${formatPercent(m.completion_rate)}\n`;
    });
    csv += `\n`;
  }

  // Section 4: Overdue Tasks
  if (overdue.length > 0) {
    csv += `OVERDUE TASKS REQUIRING ATTENTION\n`;
    csv += `Task Title,Board,List,Due Date,Days Overdue,Assignees\n`;
    overdue.forEach((t) => {
      const assigneesStr = canViewTeam ? (t.members || []).map((m) => m.name).join('; ') : '';
      csv += `${escapeCsvValue(t.title)},${escapeCsvValue(t.board_name)},${escapeCsvValue(t.list_name)},${escapeCsvValue(t.due_date ? formatDate(t.due_date) : '')},${t.days_overdue || 0},${escapeCsvValue(assigneesStr)}\n`;
    });
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeWorkspaceName = (workspace?.name || 'workspace').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  link.setAttribute('download', `${safeWorkspaceName}-report-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads individual member dossier CSV report safely.
 */
export function exportMemberDossierCsv({ member, workspace }) {
  if (!member) return;

  let csv = `sep=,\n`;
  csv += `MEMBER PERFORMANCE REPORT\n`;
  csv += `Name,${escapeCsvValue(member.name)}\n`;
  csv += `Email,${escapeCsvValue(member.email)}\n`;
  csv += `Role,${escapeCsvValue(member.role || 'Member')}\n`;
  csv += `Workspace,${escapeCsvValue(workspace?.name || 'Workspace')}\n`;
  csv += `Total Assigned,${member.assigned_tasks || 0}\n`;
  csv += `Completed,${member.completed_tasks || 0}\n`;
  csv += `In Progress,${member.in_progress_tasks || 0}\n`;
  csv += `To Do,${member.todo_tasks || 0}\n`;
  csv += `Overdue,${member.overdue_tasks || 0}\n`;
  csv += `Completion Rate,${formatPercent(member.completion_rate)}\n\n`;

  csv += `ASSIGNED TASKS BREAKDOWN\n`;
  csv += `Task Title,Board,List,Stage,Due Date,Status\n`;
  (member.tasks || []).forEach((t) => {
    let status = 'In Progress';
    if (t.is_complete || t.stage === 'done') status = 'Completed';
    else if (t.is_overdue) status = 'Overdue';
    else if (t.stage === 'todo') status = 'To Do';
    else if (t.stage === 'review') status = 'In Review';
    else if (t.is_due_soon) status = 'Due Soon';

    csv += `${escapeCsvValue(t.title)},${escapeCsvValue(t.board_name)},${escapeCsvValue(t.list_name)},${escapeCsvValue(t.stage || 'in_progress')},${escapeCsvValue(t.due_date ? formatDate(t.due_date) : 'No due date')},${escapeCsvValue(status)}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeUserName = (member.name || 'user').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  link.setAttribute('download', `${safeUserName}-workload-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
