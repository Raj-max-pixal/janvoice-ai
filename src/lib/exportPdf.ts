/**
 * exportPdf.ts — Client-side PDF export for complaints and reports.
 * Uses the native print API as a lightweight alternative to heavy libraries.
 * For production, consider replacing with jsPDF or @react-pdf/renderer.
 */

import type { Complaint, AnalyticsSnapshot } from '../types'

interface PdfMargins {
  top: number
  right: number
  bottom: number
  left: number
}

interface PdfStyles {
  fontFamily: string
  fontSize: number
  headerFontSize: number
  titleFontSize: number
  margins: PdfMargins
  color: string
  secondaryColor: string
}

const DEFAULT_STYLES: PdfStyles = {
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 11,
  headerFontSize: 14,
  titleFontSize: 18,
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  color: '#1e293b',
  secondaryColor: '#64748b',
}

/**
 * Generates a styled HTML document for printing/PDF, then triggers print.
 */
function printHtml(
  title: string,
  bodyHtml: string,
  styles: PdfStyles = DEFAULT_STYLES,
): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    console.error('[exportPdf] Unable to open print window. Popup blocker may be active.')
    return
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: ${styles.fontFamily};
          font-size: ${styles.fontSize}px;
          color: ${styles.color};
          padding: ${styles.margins.top}px ${styles.margins.right}px ${styles.margins.bottom}px ${styles.margins.left}px;
          line-height: 1.6;
        }
        h1 { font-size: ${styles.titleFontSize}px; margin-bottom: 8px; color: ${styles.color}; }
        h2 { font-size: ${styles.headerFontSize}px; margin: 16px 0 8px; color: ${styles.color}; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-size: ${styles.fontSize}px; }
        th { background: #f1f5f9; font-weight: 600; }
        .meta { color: ${styles.secondaryColor}; font-size: 10px; margin-bottom: 20px; }
        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
        .badge-resolved { background: #dcfce7; color: #166534; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .badge-default { background: #f1f5f9; color: #475569; }
        .section { margin-bottom: 16px; }
        .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; }
        @media print {
          body { padding: 0.5in; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align:right;margin-bottom:10px;">
        <button onclick="window.print()" style="padding:6px 16px;background:#2563eb;color:white;border:none;border-radius:4px;cursor:pointer;">Print / Save PDF</button>
        <button onclick="window.close()" style="padding:6px 16px;background:#e2e8f0;color:#1e293b;border:none;border-radius:4px;cursor:pointer;margin-left:8px;">Close</button>
      </div>
      <h1>${title}</h1>
      <div class="meta">Generated on ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      ${bodyHtml}
      <div class="footer">JanVoice AI — Community Complaint Management System</div>
      <script>
        // Auto-print after a short delay to ensure styles are loaded
        setTimeout(() => { window.print(); }, 500);
      <\/script>
    </body>
    </html>
  `)

  printWindow.document.close()
}

// ==========================================
// Single Complaint PDF
// ==========================================

/**
 * Exports a single complaint detail as a printable PDF.
 */
export function exportComplaintPdf(complaint: Complaint): void {
  const statusClass =
    complaint.status === 'Resolved'
      ? 'badge-resolved'
      : complaint.status === 'Submitted'
        ? 'badge-default'
        : 'badge-pending'

  const body = `
    <div class="section">
      <p><strong>Complaint ID:</strong> ${complaint.id}</p>
      <p><strong>Status:</strong> <span class="status-badge ${statusClass}">${complaint.status}</span></p>
      <p><strong>Category:</strong> ${complaint.category}</p>
      <p><strong>Submitted by:</strong> ${complaint.userName}</p>
      <p><strong>Date:</strong> ${new Date(complaint.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      <p><strong>Location:</strong> ${complaint.location}</p>
      ${complaint.address ? `<p><strong>Address:</strong> ${[
        complaint.address.street,
        complaint.address.city,
        complaint.address.district,
        complaint.address.state,
        complaint.address.country,
      ].filter(Boolean).join(', ')}</p>` : ''}
      ${complaint.forwardedDepartment ? `<p><strong>Forwarded to:</strong> ${complaint.forwardedDepartment}</p>` : ''}
      ${complaint.assignedOfficer ? `<p><strong>Assigned Officer:</strong> ${complaint.assignedOfficer}</p>` : ''}
    </div>

    <div class="section">
      <h2>Description</h2>
      <p>${complaint.description}</p>
    </div>

    ${complaint.aiAnalysis ? `
      <div class="section">
        <h2>AI Analysis</h2>
        <table>
          <tr><th>Priority</th><td>${complaint.aiAnalysis.priority}</td></tr>
          ${complaint.aiAnalysis.summary ? `<tr><th>Summary</th><td>${complaint.aiAnalysis.summary}</td></tr>` : ''}
          ${complaint.aiAnalysis.sentiment ? `<tr><th>Sentiment</th><td>${complaint.aiAnalysis.sentiment}</td></tr>` : ''}
          ${complaint.aiAnalysis.recommendedAction ? `<tr><th>Recommended Action</th><td>${complaint.aiAnalysis.recommendedAction}</td></tr>` : ''}
          ${complaint.aiAnalysis.isSpam !== undefined ? `<tr><th>Spam Flag</th><td>${complaint.aiAnalysis.isSpam ? '⚠️ Flagged' : '✅ Clean'}</td></tr>` : ''}
          ${complaint.aiAnalysis.isDuplicate !== undefined ? `<tr><th>Duplicate</th><td>${complaint.aiAnalysis.isDuplicate ? '⚠️ Possible duplicate' : '✅ Unique'}</td></tr>` : ''}
        </table>
      </div>
    ` : ''}

    <div class="section">
      <h2>Status History</h2>
      <table>
        <thead><tr><th>Status</th><th>Date</th><th>Notes</th><th>Updated By</th></tr></thead>
        <tbody>
          ${complaint.statusHistory && complaint.statusHistory.length > 0
            ? complaint.statusHistory.map(
                (h) => `
                  <tr>
                    <td><span class="status-badge badge-default">${h.status}</span></td>
                    <td>${new Date(h.timestamp).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${h.notes || '-'}</td>
                    <td>${h.updatedBy || '-'}</td>
                  </tr>
                `,
              ).join('')
            : '<tr><td colspan="4" style="text-align:center;color:#94a3b8;">No status history available</td></tr>'
          }
        </tbody>
      </table>
    </div>

    ${complaint.officerNotes ? `<div class="section"><h2>Officer Notes</h2><p>${complaint.officerNotes}</p></div>` : ''}
    ${complaint.resolutionNotes ? `<div class="section"><h2>Resolution Notes</h2><p>${complaint.resolutionNotes}</p></div>` : ''}
    ${complaint.citizenFeedback ? `<div class="section"><h2>Citizen Feedback</h2><p>${complaint.citizenFeedback}</p></div>` : ''}
  `

  printHtml(`Complaint #${complaint.id}`, body)
}

// ==========================================
// Complaint List PDF
// ==========================================

/**
 * Exports a list of complaints as a printable PDF table.
 */
export function exportComplaintListPdf(complaints: Complaint[], title: string = 'Complaint List'): void {
  const rows = complaints.map(
    (c) => `
      <tr>
        <td>${c.id}</td>
        <td>${c.userName}</td>
        <td>${c.title.length > 50 ? c.title.substring(0, 50) + '…' : c.title}</td>
        <td>${c.category}</td>
        <td><span class="status-badge ${c.status === 'Resolved' ? 'badge-resolved' : 'badge-default'}">${c.status}</span></td>
        <td>${c.aiAnalysis?.priority || '-'}</td>
        <td>${new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
      </tr>
    `,
  ).join('')

  const body = `
    <p>Showing ${complaints.length} complaint${complaints.length !== 1 ? 's' : ''}</p>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Citizen</th>
          <th>Title</th>
          <th>Category</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${complaints.length > 0 ? rows : '<tr><td colspan="7" style="text-align:center;color:#94a3b8;">No complaints found</td></tr>'}
      </tbody>
    </table>
  `

  printHtml(title, body)
}

// ==========================================
// Analytics Report PDF
// ==========================================

/**
 * Exports analytics data as a printable PDF report.
 */
export function exportAnalyticsPdf(snapshot: AnalyticsSnapshot, title: string = 'Analytics Report'): void {
  const categoryRows = snapshot.categoryDistribution
    .map(
      (c) =>
        `<tr><td>${c.category}</td><td>${c.count}</td><td>${snapshot.totalComplaints > 0 ? ((c.count / snapshot.totalComplaints) * 100).toFixed(1) + '%' : '0%'}</td></tr>`,
    )
    .join('')

  const body = `
    <div class="section">
      <h2>Overview</h2>
      <table>
        <tr><td><strong>Total Complaints</strong></td><td>${snapshot.totalComplaints}</td></tr>
        <tr><td><strong>Resolved</strong></td><td>${snapshot.resolvedComplaints}</td></tr>
        <tr><td><strong>Resolution Rate</strong></td><td>${(snapshot.resolutionRate * 100).toFixed(1)}%</td></tr>
        <tr><td><strong>Avg Response Time</strong></td><td>${snapshot.averageResponseTime.toFixed(1)} hours</td></tr>
      </table>
    </div>

    <div class="section">
      <h2>Category Distribution</h2>
      <table>
        <thead><tr><th>Category</th><th>Count</th><th>Percentage</th></tr></thead>
        <tbody>${categoryRows}</tbody>
      </table>
    </div>

    ${snapshot.departmentPerformance.length > 0 ? `
      <div class="section">
        <h2>Department Performance</h2>
        <table>
          <thead><tr><th>Department</th><th>Complaints</th></tr></thead>
          <tbody>${snapshot.departmentPerformance.map((d) => `<tr><td>${d.department}</td><td>${d.count}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    ` : ''}

    ${snapshot.officerPerformance.length > 0 ? `
      <div class="section">
        <h2>Officer Performance</h2>
        <table>
          <thead><tr><th>Officer</th><th>Complaints</th></tr></thead>
          <tbody>${snapshot.officerPerformance.map((o) => `<tr><td>${o.officer}</td><td>${o.count}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    ` : ''}
  `

  printHtml(title, body)
}