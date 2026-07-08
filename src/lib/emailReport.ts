/**
 * emailReport.ts — Client-side email-ready report generation.
 * Prepares complaint data in a formatted HTML structure suitable for
 * embedding in emails or sending via a backend email service.
 */

import type { Complaint, AnalyticsSnapshot } from '../types'

// ==========================================
// Email Body Generation
// ==========================================

/**
 * Generates a styled HTML email body for a complaint report.
 * Compatible with most email clients (inline styles only).
 */
export function generateComplaintEmailHtml(complaint: Complaint): string {
  const statusColorMap: Record<string, string> = {
    Submitted: '#6366f1',
    'AI Verification': '#8b5cf6',
    'Admin Review': '#f59e0b',
    'Assigned to Department': '#3b82f6',
    'Sent to Authority': '#2563eb',
    'Officer Accepted': '#10b981',
    'Work Started': '#06b6d4',
    'Work Completed': '#22c55e',
    'Citizen Verification': '#a855f7',
    Resolved: '#16a34a',
    Archived: '#64748b',
    Reopened: '#ef4444',
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1e293b; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 20px;">
    <tr>
      <td>
        <table align="center" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px 32px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 22px; margin: 0;">JanVoice AI</h1>
              <p style="color: #c4b5fd; font-size: 14px; margin: 4px 0 0;">Community Complaint Management System</p>
            </td>
          </tr>

          <!-- Complaint ID & Status -->
          <tr>
            <td style="padding: 24px 32px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h2 style="font-size: 16px; margin: 0; color: #1e293b;">Complaint #${complaint.id}</h2>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background-color: ${statusColorMap[complaint.status] || '#94a3b8'}; color: #ffffff;">
                      ${complaint.status}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding: 0 32px;">
              <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
                <tr>
                  <td style="font-weight: 600; color: #64748b; width: 130px; font-size: 13px;">Category</td>
                  <td style="font-size: 13px;">${complaint.category}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #64748b; font-size: 13px;">Submitted By</td>
                  <td style="font-size: 13px;">${complaint.userName}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #64748b; font-size: 13px;">Date</td>
                  <td style="font-size: 13px;">${new Date(complaint.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #64748b; font-size: 13px;">Location</td>
                  <td style="font-size: 13px;">${complaint.location}</td>
                </tr>
                ${complaint.forwardedDepartment ? `<tr><td style="font-weight: 600; color: #64748b; font-size: 13px;">Department</td><td style="font-size: 13px;">${complaint.forwardedDepartment}</td></tr>` : ''}
                ${complaint.assignedOfficer ? `<tr><td style="font-weight: 600; color: #64748b; font-size: 13px;">Officer</td><td style="font-size: 13px;">${complaint.assignedOfficer}</td></tr>` : ''}
                ${complaint.aiAnalysis?.priority ? `<tr><td style="font-weight: 600; color: #64748b; font-size: 13px;">Priority</td><td style="font-size: 13px;">${complaint.aiAnalysis.priority}</td></tr>` : ''}
              </table>
            </td>
          </tr>

          <!-- Title & Description -->
          <tr>
            <td style="padding: 16px 32px 8px;">
              <h3 style="font-size: 15px; margin: 0 0 4px; color: #1e293b;">${complaint.title}</h3>
              <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 8px 0 0;">${complaint.description}</p>
            </td>
          </tr>

          <!-- AI Analysis -->
          ${complaint.aiAnalysis ? `
          <tr>
            <td style="padding: 16px 32px 8px;">
              <h3 style="font-size: 14px; margin: 0 0 8px; color: #4f46e5; border-bottom: 2px solid #e0e7ff; padding-bottom: 4px;">AI Analysis</h3>
              ${complaint.aiAnalysis.summary ? `<p style="font-size: 13px; color: #475569; margin: 6px 0;"><em>${complaint.aiAnalysis.summary}</em></p>` : ''}
              <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin-top: 8px;">
                ${complaint.aiAnalysis.sentiment ? `<tr><td style="font-weight: 600; color: #64748b; font-size: 12px; width: 120px;">Sentiment</td><td style="font-size: 12px;">${complaint.aiAnalysis.sentiment}</td></tr>` : ''}
                ${complaint.aiAnalysis.recommendedAction ? `<tr><td style="font-weight: 600; color: #64748b; font-size: 12px;">Recommended Action</td><td style="font-size: 12px;">${complaint.aiAnalysis.recommendedAction}</td></tr>` : ''}
                ${complaint.aiAnalysis.isSpam !== undefined ? `<tr><td style="font-weight: 600; color: #64748b; font-size: 12px;">Spam</td><td style="font-size: 12px; color: ${complaint.aiAnalysis.isSpam ? '#ef4444' : '#16a34a'}; font-weight: 600;">${complaint.aiAnalysis.isSpam ? '⚠ Flagged' : '✅ Clean'}</td></tr>` : ''}
                ${complaint.aiAnalysis.isDuplicate !== undefined ? `<tr><td style="font-weight: 600; color: #64748b; font-size: 12px;">Duplicate</td><td style="font-size: 12px;">${complaint.aiAnalysis.isDuplicate ? '⚠ Possible duplicate' : '✅ Unique'}</td></tr>` : ''}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Status History -->
          <tr>
            <td style="padding: 16px 32px 8px;">
              <h3 style="font-size: 14px; margin: 0 0 8px; color: #1e293b;">Status History</h3>
              ${complaint.statusHistory && complaint.statusHistory.length > 0
                ? `<table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse; border: 1px solid #e2e8f0;">
                    <thead>
                      <tr style="background-color: #f8fafc;">
                        <th style="text-align: left; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Status</th>
                        <th style="text-align: left; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Date</th>
                        <th style="text-align: left; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${complaint.statusHistory.map((h) => `
                        <tr>
                          <td style="font-size: 12px; border-bottom: 1px solid #f1f5f9;">${h.status}</td>
                          <td style="font-size: 12px; border-bottom: 1px solid #f1f5f9;">${new Date(h.timestamp).toLocaleDateString('en-IN')}</td>
                          <td style="font-size: 12px; border-bottom: 1px solid #f1f5f9;">${h.notes || '-'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>`
                : '<p style="font-size: 13px; color: #94a3b8;">No status history available.</p>'
              }
            </td>
          </tr>

          <!-- Officer / Resolution Notes -->
          ${complaint.officerNotes ? `
          <tr>
            <td style="padding: 8px 32px;">
              <h3 style="font-size: 14px; margin: 0 0 4px; color: #1e293b;">Officer Notes</h3>
              <p style="font-size: 13px; color: #475569;">${complaint.officerNotes}</p>
            </td>
          </tr>
          ` : ''}
          ${complaint.resolutionNotes ? `
          <tr>
            <td style="padding: 8px 32px;">
              <h3 style="font-size: 14px; margin: 0 0 4px; color: #1e293b;">Resolution</h3>
              <p style="font-size: 13px; color: #475569;">${complaint.resolutionNotes}</p>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">This is an automated report from JanVoice AI.</p>
              <p style="font-size: 11px; color: #94a3b8; margin: 4px 0 0;">For more details, visit the JanVoice AI portal.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ==========================================
// Email Subject Generation
// ==========================================

/**
 * Generates an email subject line for a complaint report.
 */
export function generateComplaintEmailSubject(complaint: Complaint): string {
  const prefix = complaint.status === 'Resolved' ? '✅ Resolved' : complaint.status === 'Work Completed' ? '🛠️ Work Completed' : complaint.status === 'Submitted' ? '🆕 New' : '📋 Updated'
  return `${prefix} Complaint #${complaint.id}: ${complaint.title} (${complaint.category})`
}

// ==========================================
// Analytics Email Report
// ==========================================

/**
 * Generates a summary analytics report HTML for email.
 */
export function generateAnalyticsEmailHtml(snapshot: AnalyticsSnapshot): string {
  const resolutionPercent = (snapshot.resolutionRate * 100).toFixed(1)

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1e293b; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 20px;">
    <tr>
      <td>
        <table align="center" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px 32px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 20px; margin: 0;">📊 JanVoice AI Analytics Report</h1>
              <p style="color: #c4b5fd; font-size: 13px; margin: 4px 0 0;">${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </td>
          </tr>

          <!-- Overview Cards -->
          <tr>
            <td style="padding: 24px 32px 16px;">
              <table width="100%" cellpadding="10" cellspacing="0">
                <tr>
                  <td width="25%" align="center" style="background: #f0fdf4; border-radius: 8px; padding: 12px;">
                    <div style="font-size: 24px; font-weight: 700; color: #16a34a;">${snapshot.totalComplaints}</div>
                    <div style="font-size: 11px; color: #64748b;">Total</div>
                  </td>
                  <td width="25%" align="center" style="background: #eff6ff; border-radius: 8px; padding: 12px;">
                    <div style="font-size: 24px; font-weight: 700; color: #2563eb;">${snapshot.resolvedComplaints}</div>
                    <div style="font-size: 11px; color: #64748b;">Resolved</div>
                  </td>
                  <td width="25%" align="center" style="background: #fefce8; border-radius: 8px; padding: 12px;">
                    <div style="font-size: 24px; font-weight: 700; color: #ca8a04;">${resolutionPercent}%</div>
                    <div style="font-size: 11px; color: #64748b;">Rate</div>
                  </td>
                  <td width="25%" align="center" style="background: #fef2f2; border-radius: 8px; padding: 12px;">
                    <div style="font-size: 24px; font-weight: 700; color: #dc2626;">${snapshot.averageResponseTime.toFixed(1)}h</div>
                    <div style="font-size: 11px; color: #64748b;">Avg Time</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Categories -->
          <tr>
            <td style="padding: 8px 32px;">
              <h3 style="font-size: 14px; margin: 0 0 8px; color: #1e293b;">Category Breakdown</h3>
              <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse; border: 1px solid #e2e8f0;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="text-align: left; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Category</th>
                    <th style="text-align: center; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Count</th>
                  </tr>
                </thead>
                <tbody>
                  ${snapshot.categoryDistribution.map((c) => `
                    <tr>
                      <td style="font-size: 12px; border-bottom: 1px solid #f1f5f9;">${c.category}</td>
                      <td style="font-size: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;">${c.count}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Department Performance -->
          ${snapshot.departmentPerformance.length > 0 ? `
          <tr>
            <td style="padding: 16px 32px 8px;">
              <h3 style="font-size: 14px; margin: 0 0 8px; color: #1e293b;">Department Load</h3>
              <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse; border: 1px solid #e2e8f0;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="text-align: left; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Department</th>
                    <th style="text-align: center; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Complaints</th>
                  </tr>
                </thead>
                <tbody>
                  ${snapshot.departmentPerformance.map((d) => `
                    <tr>
                      <td style="font-size: 12px; border-bottom: 1px solid #f1f5f9;">${d.department}</td>
                      <td style="font-size: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;">${d.count}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">JanVoice AI — Community Complaint Management System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ==========================================
// Clipboard / Email Launch
// ==========================================

/**
 * Copies the complaint report HTML to clipboard for pasting into email clients.
 */
export async function copyComplaintReportToClipboard(complaint: Complaint): Promise<void> {
  const html = generateComplaintEmailHtml(complaint)
  try {
    await navigator.clipboard.writeText(html)
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = html
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

/**
 * Opens the default email client with a pre-filled complaint report.
 * Uses the `mailto:` protocol with encoded body content.
 * Note: For rich HTML emails, a backend email service is required.
 */
export function openComplaintEmailClient(complaint: Complaint): void {
  const subject = encodeURIComponent(generateComplaintEmailSubject(complaint))
  // For plain text fallback (mailto: doesn't support HTML reliably)
  const plainBody = encodeURIComponent(
    `Complaint #${complaint.id}\n` +
    `Status: ${complaint.status}\n` +
    `Category: ${complaint.category}\n` +
    `Submitted by: ${complaint.userName}\n` +
    `Title: ${complaint.title}\n` +
    `Description: ${complaint.description}\n` +
    `Location: ${complaint.location}\n` +
    `Date: ${new Date(complaint.createdAt).toLocaleDateString('en-IN')}\n` +
    `${complaint.forwardedDepartment ? `Department: ${complaint.forwardedDepartment}\n` : ''}` +
    `${complaint.assignedOfficer ? `Officer: ${complaint.assignedOfficer}\n` : ''}` +
    `\nView in portal for full details.`
  )
  window.open(`mailto:?subject=${subject}&body=${plainBody}`, '_blank')
}