import { useCallback, useEffect, useState } from 'react'
import { Brain, RefreshCw } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useToast } from '../contexts/ToastContext'
import { getAllComplaints } from '../services/firebase'
import { generateRecommendations } from '../services/ai'
import type { Complaint } from '../types'

export function RecommendationsPage() {
  const { showToast } = useToast()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [recommendations, setRecommendations] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const loadComplaints = useCallback(async () => {
    try {
      const data = await getAllComplaints()
      setComplaints(data)
    } catch {
      showToast('Failed to load complaints', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadComplaints()
  }, [loadComplaints])

  const handleGenerate = async () => {
    if (complaints.length === 0) {
      showToast('No complaints to analyze', 'info')
      return
    }
    setGenerating(true)
    try {
      const summary = complaints
        .map(
          (c) =>
            `- ${c.title} (${c.category}, ${c.location}): ${c.aiAnalysis?.summary ?? c.description}`,
        )
        .join('\n')
      const result = await generateRecommendations(summary)
      setRecommendations(result)
      showToast('Recommendations generated!', 'success')
    } catch {
      showToast('Failed to generate recommendations', 'error')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Recommendations
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Data-driven development priorities for your constituency
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          <RefreshCw
            size={18}
            className={`mr-2 ${generating ? 'animate-spin' : ''}`}
          />
          {generating ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      <Card className="mt-8">
        {recommendations ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {recommendations.split('\n').map((line, index) => (
              <p key={index} className="text-gray-700 dark:text-gray-300">
                {line}
              </p>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <Brain size={48} className="text-primary-400" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Click &quot;Generate&quot; to get AI-powered development
              recommendations based on {complaints.length} complaints
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
