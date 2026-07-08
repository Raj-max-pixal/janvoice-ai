import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <Card className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary-100 text-4xl font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
          404
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Page Not Found
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/">
            <Button className="w-full sm:w-auto">
              <Home size={18} className="mr-2" />
              Go Home
            </Button>
          </Link>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={18} className="mr-2" />
            Go Back
          </Button>
        </div>
      </Card>
    </div>
  )
}
