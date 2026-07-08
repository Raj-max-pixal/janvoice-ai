/**
 * exportExcel.ts — Client-side Excel (CSV) export for complaints and reports.
 * Uses CSV generation as a zero-dependency approach. Excel will open CSV files natively.
 * For true .xlsx files, consider integrating exceljs or xlsx libraries.
 */

import type { Complaint, AnalyticsSnapshot } from '../types'

/**
 * Escapes a CSV field value, wrapping in quotes if it contains special characters.
 */
function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '""'
  const str = String(value)
  // If contains comma, newline, or double-quote, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Converts an array of objects to a CSV string.
 */
function toCsv<T>(
  headers: string[],
  data: T[],
  extractors: ((row: T) => string | number | boolean | null | undefined)[],
): string {
  const headerRow = headers.map((h) => escapeCsvField(h)).join(',')
  const dataRows = data.map((row) =>
    extractors.map((extract) => escapeCsvField(extract(row))).join(','),
  )
  return [headerRow, ...dataRows].join('\n')
}

/**
 * Triggers a file download in the browser.
 */
function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel UTF-8
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ==========================================
// Complaint List Export
// ==========================================

/**
 * Exports a list of complaints as a CSV file, openable in Excel.
 */
export function exportComplaintsExcel(complaints: Complaint[], filename?: string): void {
  const headers = [
    'Complaint ID',
    'Citizen Name',
    'Title',
    'Description',
    'Category',
    'Status',
    'Priority',
    'AI Summary',
    'Department',
    'Assigned Officer',
    'Location',
    'Street',
    'City',
    'District',
    'State',
    'Zip Code',
    'GPS Latitude',
    'GPS Longitude',
    'Is Spam',
    'Is Duplicate',
    'Created At',
    'Updated At',
    'Resolved At',
    'Officer Notes',
    'Resolution Notes',
    'Citizen Feedback',
    'Rating',
    'Upvotes',
  ]

  const extractors: ((c: Complaint) => string | number | boolean | null | undefined)[] = [
    (c) => c.id,
    (c) => c.userName,
    (c) => c.title,
    (c) => c.description,
    (c) => c.category,
    (c) => c.status,
    (c) => c.aiAnalysis?.priority || null,
    (c) => c.aiAnalysis?.summary || null,
    (c) => c.forwardedDepartment || null,
    (c) => c.assignedOfficer || null,
    (c) => c.location,
    (c) => c.address?.street || null,
    (c) => c.address?.city || null,
    (c) => c.address?.district || null,
    (c) => c.address?.state || null,
    (c) => c.address?.zipCode || null,
    (c) => c.gpsCoordinates?.coordinates?.[1] || null, // latitude
    (c) => c.gpsCoordinates?.coordinates?.[0] || null, // longitude
    (c) => c.aiAnalysis?.isSpam !== undefined ? (c.aiAnalysis.isSpam ? 'Yes' : 'No') : null,
    (c) => c.aiAnalysis?.isDuplicate !== undefined ? (c.aiAnalysis.isDuplicate ? 'Yes' : 'No') : null,
    (c) => c.createdAt ? new Date(c.createdAt).toISOString() : null,
    (c) => c.updatedAt ? new Date(c.updatedAt).toISOString() : null,
    (c) => {
      // Find resolved or archived timestamp
      const resolved = c.statusHistory?.find(
        (h) => h.status === 'Resolved' || h.status === 'Archived',
      )
      return resolved ? new Date(resolved.timestamp).toISOString() : null
    },
    (c) => c.officerNotes || null,
    (c) => c.resolutionNotes || null,
    (c) => c.citizenFeedback || null,
    (c) => c.rating ?? null,
    (c) => c.upvotes ?? 0,
  ]

  const csv = toCsv<Complaint>(headers, complaints, extractors)
  const name = filename || `complaints-export-${new Date().toISOString().split('T')[0]}.csv`
  downloadCsv(csv, name)
}

// ==========================================
// Status History Export
// ==========================================

/**
 * Exports the full status history of a single complaint as CSV.
 */
export function exportStatusHistoryExcel(complaint: Complaint): void {
  const headers = ['Status', 'Timestamp', 'Notes', 'Updated By']
  const data = (complaint.statusHistory || []).map((h) => ({
    status: h.status,
    timestamp: new Date(h.timestamp).toISOString(),
    notes: h.notes || '',
    updatedBy: h.updatedBy || '',
  }))

  const extractors: ((row: (typeof data)[0]) => string | number | boolean | null | undefined)[] = [
    (r) => r.status,
    (r) => r.timestamp,
    (r) => r.notes,
    (r) => r.updatedBy,
  ]

  const csv = toCsv(headers, data, extractors)
  const filename = `complaint-${complaint.id}-status-history-${new Date().toISOString().split('T')[0]}.csv`
  downloadCsv(csv, filename)
}

// ==========================================
// Analytics Export
// ==========================================

/**
 * Exports analytics snapshot data as CSV.
 */
export function exportAnalyticsExcel(snapshot: AnalyticsSnapshot): void {
  // Overview
  const overviewHeaders = ['Metric', 'Value']
  const overviewData = [
    { metric: 'Total Complaints', value: snapshot.totalComplaints },
    { metric: 'Resolved Complaints', value: snapshot.resolvedComplaints },
    { metric: 'Resolution Rate (%)', value: (snapshot.resolutionRate * 100).toFixed(1) },
    { metric: 'Avg Response Time (hours)', value: snapshot.averageResponseTime.toFixed(1) },
  ]
  const overviewCsv = toCsv(
    overviewHeaders,
    overviewData,
    [(r) => r.metric, (r) => r.value],
  )

  // Category Distribution
  const categoryHeaders = ['Category', 'Count']
  const categoryCsv = toCsv(
    categoryHeaders,
    snapshot.categoryDistribution,
    [(r) => r.category, (r) => r.count],
  )

  // Department Performance
  const deptHeaders = ['Department', 'Complaints']
  const deptCsv = toCsv(
    deptHeaders,
    snapshot.departmentPerformance,
    [(r) => r.department, (r) => r.count],
  )

  // Combine all sections
  const combined = [
    '=== JanVoice AI Analytics Report ===',
    `Generated: ${new Date().toISOString()}`,
    '',
    '--- Overview ---',
    overviewCsv,
    '',
    '--- Category Distribution ---',
    categoryCsv,
    '',
    '--- Department Performance ---',
    deptCsv,
    '',
    '--- Officer Performance ---',
    toCsv(
      ['Officer', 'Complaints'],
      snapshot.officerPerformance,
      [(r) => r.officer, (r) => r.count],
    ),
  ].join('\n')

  const filename = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`
  downloadCsv(combined, filename)
}