/**
 * exportCsv.ts — Client-side CSV export for reports.
 * Generates CSV files from report data and triggers a browser download.
 */

/**
 * Escapes a CSV field value, wrapping in quotes if it contains special characters.
 */
function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '""'
  const str = String(value)
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
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export interface ReportData {
  title: string
  period: string
  generatedAt: string
  totalComplaints: number
  resolvedComplaints: number
  pendingComplaints: number
  inProgressComplaints: number
  rejectedComplaints: number
  averageResolutionTime: number
  complaintsByCategory: Array<{ category: string; count: number; percentage: number }>
  complaintsByDepartment: Array<{ department: string; count: number; percentage: number }>
  departmentPerformance: Array<{ department: string; resolved: number; pending: number; total: number }>
  officerPerformance: Array<{ officer: string; resolved: number; total: number }>
  dailyTrend: Array<{ date: string; count: number }>
}

/**
 * Exports report data as a CSV file.
 */
export function exportToCsv(data: ReportData): void {
  const lines: string[] = []

  // Title and metadata
  lines.push(`"${data.title}"`)
  lines.push(`"Period: ${data.period}"`)
  lines.push(`"Generated: ${data.generatedAt}"`)
  lines.push('')

  // Overview section
  lines.push('Overview')
  const overviewHeaders = ['Metric', 'Value']
  const overviewData = [
    { metric: 'Total Complaints', value: data.totalComplaints },
    { metric: 'Resolved', value: data.resolvedComplaints },
    { metric: 'Pending', value: data.pendingComplaints },
    { metric: 'In Progress', value: data.inProgressComplaints },
    { metric: 'Rejected', value: data.rejectedComplaints },
    { metric: 'Avg Resolution (days)', value: data.averageResolutionTime },
  ]
  lines.push(toCsv(overviewHeaders, overviewData, [(r) => r.metric, (r) => r.value]))
  lines.push('')

  // Complaints by Category
  if (data.complaintsByCategory.length > 0) {
    lines.push('Complaints by Category')
    const catHeaders = ['Category', 'Count', 'Percentage']
    lines.push(toCsv(catHeaders, data.complaintsByCategory, [
      (r) => r.category,
      (r) => r.count,
      (r) => `${r.percentage}%`,
    ]))
    lines.push('')
  }

  // Department Performance
  if (data.departmentPerformance.length > 0) {
    lines.push('Department Performance')
    const deptHeaders = ['Department', 'Resolved', 'Pending', 'Total']
    lines.push(toCsv(deptHeaders, data.departmentPerformance, [
      (r) => r.department,
      (r) => r.resolved,
      (r) => r.pending,
      (r) => r.total,
    ]))
    lines.push('')
  }

  // Officer Performance
  if (data.officerPerformance.length > 0) {
    lines.push('Officer Performance')
    const offHeaders = ['Officer', 'Resolved', 'Total']
    lines.push(toCsv(offHeaders, data.officerPerformance, [
      (r) => r.officer,
      (r) => r.resolved,
      (r) => r.total,
    ]))
    lines.push('')
  }

  // Daily Trend
  if (data.dailyTrend.length > 0) {
    lines.push('Daily Trend')
    const trendHeaders = ['Date', 'Complaints']
    lines.push(toCsv(trendHeaders, data.dailyTrend, [
      (r) => r.date,
      (r) => r.count,
    ]))
  }

  const filename = `report-${new Date().toISOString().split('T')[0]}.csv`
  downloadCsv(lines.join('\n'), filename)
}