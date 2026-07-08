import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import { Card } from '../components/ui/Card'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useToast } from '../contexts/ToastContext'
import { getAllComplaints } from '../services/firebase'
import { COMPLAINT_CATEGORIES, type Complaint } from '../types'

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
)

const chartColors = [
  '#3b82f6',
  '#22c55e',
  '#ef4444',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#6b7280',
]

export function AnalyticsPage() {
  const { showToast } = useToast()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)

  const loadComplaints = useCallback(async () => {
    try {
      const data = await getAllComplaints()
      setComplaints(data)
    } catch {
      showToast('Failed to load analytics data', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadComplaints()
  }, [loadComplaints])

  const charts = useMemo(() => {
    const categoryCounts = COMPLAINT_CATEGORIES.map(
      (cat) => complaints.filter((c) => c.category === cat).length,
    )

    const locationMap = complaints.reduce<Record<string, number>>(
      (acc, c) => {
        acc[c.location] = (acc[c.location] ?? 0) + 1
        return acc
      },
      {},
    )
    const topLocations = Object.entries(locationMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)

    const priorityCounts = ['High', 'Medium', 'Low'].map(
      (p) => complaints.filter((c) => c.aiAnalysis?.priority === p).length,
    )

    const statusCounts = ['Pending', 'In Progress', 'Resolved'].map(
      (s) => complaints.filter((c) => c.status === s).length,
    )

    const monthMap = complaints.reduce<Record<string, number>>((acc, c) => {
      const key = c.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
    const months = Object.keys(monthMap)

    return {
      categoryCounts,
      topLocations,
      priorityCounts,
      statusCounts,
      months,
      monthValues: months.map((m) => monthMap[m] ?? 0),
    }
  }, [complaints])

  if (loading) return <LoadingSpinner />

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        Analytics
      </h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Comprehensive data visualization for constituency insights
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Complaints
          </p>
          <p className="text-3xl font-bold text-primary-600">
            {complaints.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Categories Covered
          </p>
          <p className="text-3xl font-bold text-secondary-600">
            {charts.categoryCounts.filter((c) => c > 0).length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Unique Locations
          </p>
          <p className="text-3xl font-bold text-accent-600">
            {charts.topLocations.length}
          </p>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Complaints by Category
          </h2>
          <Pie
            data={{
              labels: COMPLAINT_CATEGORIES,
              datasets: [
                {
                  data: charts.categoryCounts,
                  backgroundColor: chartColors,
                },
              ],
            }}
            options={{ responsive: true }}
          />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Priority Distribution
          </h2>
          <Doughnut
            data={{
              labels: ['High', 'Medium', 'Low'],
              datasets: [
                {
                  data: charts.priorityCounts,
                  backgroundColor: ['#ef4444', '#f59e0b', '#22c55e'],
                },
              ],
            }}
            options={{ responsive: true }}
          />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Area-wise Complaints
          </h2>
          <Bar
            data={{
              labels: charts.topLocations.map(([loc]) => loc),
              datasets: [
                {
                  label: 'Complaints',
                  data: charts.topLocations.map(([, count]) => count),
                  backgroundColor: '#3b82f6',
                },
              ],
            }}
            options={{ responsive: true }}
          />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Status Overview
          </h2>
          <Bar
            data={{
              labels: ['Pending', 'In Progress', 'Resolved'],
              datasets: [
                {
                  label: 'Count',
                  data: charts.statusCounts,
                  backgroundColor: ['#f59e0b', '#3b82f6', '#22c55e'],
                },
              ],
            }}
            options={{ responsive: true, indexAxis: 'y' as const }}
          />
        </Card>

        {charts.months.length > 0 && (
          <Card className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Monthly Trend
            </h2>
            <Line
              data={{
                labels: charts.months,
                datasets: [
                  {
                    label: 'Complaints',
                    data: charts.monthValues,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3,
                  },
                ],
              }}
              options={{ responsive: true }}
            />
          </Card>
        )}
      </div>
    </div>
  )
}
