import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { MapPin, Navigation, X, Maximize2, Minimize2, RefreshCw, Search, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/DashboardLayout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { getAllComplaints } from '../services/firebase'
import { useTheme } from '../contexts/ThemeContext'
import { cn } from '../lib/utils'
import type { Complaint } from '../types'
import L from 'leaflet'

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const PRIORITY_COLORS: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#22c55e',
}

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]
const DEFAULT_ZOOM = 5

export function MapPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    loadComplaints()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadComplaints = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllComplaints()
      const withLocation = data.filter(
        (c) => c.gpsCoordinates?.coordinates && c.gpsCoordinates.coordinates.length === 2
      )
      setComplaints(withLocation)
    } catch (err) {
      console.error('Failed to load complaints:', err)
      setError('Failed to load complaint locations')
    } finally {
      setLoading(false)
    }
  }, [])

  const filteredComplaints = useMemo(() => {
    if (!searchQuery.trim()) return complaints
    const q = searchQuery.toLowerCase()
    return complaints.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.status?.toLowerCase().includes(q) ||
        c.userName?.toLowerCase().includes(q)
    )
  }, [complaints, searchQuery])

  // Initialize map
  useEffect(() => {
    if (loading || !mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer(
      isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }
    ).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isDark])

  // Update markers when complaints change
  useEffect(() => {
    if (!mapRef.current) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    const bounds = L.latLngBounds([])

    filteredComplaints.forEach((complaint) => {
      if (!complaint.gpsCoordinates?.coordinates) return

      const [lng, lat] = complaint.gpsCoordinates.coordinates
      if (!lat || !lng) return

      const color = PRIORITY_COLORS[complaint.priority || 'Low'] || '#3b82f6'

      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 28px; height: 28px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
          font-weight: bold;
        ">${complaint.priority === 'High' ? '!' : ''}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      const marker = L.marker([lat, lng], { icon: markerIcon })
        .addTo(mapRef.current!)
        .on('click', () => {
          setSelectedComplaint(complaint)
        })

      marker.bindPopup(`
        <div style="font-family: system-ui; padding: 4px; max-width: 220px;">
          <strong style="font-size: 14px;">${complaint.title || 'Untitled'}</strong>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">
            ${complaint.location || ''}
          </p>
          <p style="margin: 4px 0;">
            <span style="
              display: inline-block;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
              background: ${color}22;
              color: ${color};
            ">${complaint.category || 'N/A'}</span>
            <span style="
              display: inline-block;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
              margin-left: 4px;
              background: #3b82f622;
              color: #3b82f6;
            ">${complaint.status || 'N/A'}</span>
          </p>
          <a href="/complaint/${complaint.id}" style="
            display: inline-block;
            margin-top: 6px;
            font-size: 12px;
            color: #3b82f6;
            text-decoration: none;
            font-weight: 500;
          ">View Details →</a>
        </div>
      `)

      markersRef.current.push(marker)
      bounds.extend([lat, lng])
    })

    if (bounds.isValid() && markersRef.current.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    } else {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    }
  }, [filteredComplaints])

  const handleOpenComplaint = useCallback(
    (complaintId: string) => {
      navigate(`/complaint/${complaintId}`)
    },
    [navigate]
  )

  const handleRefreshLocation = useCallback(() => {
    if (selectedComplaint?.gpsCoordinates?.coordinates) {
      const [lng, lat] = selectedComplaint.gpsCoordinates.coordinates
      if (mapRef.current && lat && lng) {
        mapRef.current.setView([lat, lng], 16)
      }
    }
  }, [selectedComplaint])

  const handleGetDirections = useCallback(
    (complaint: Complaint) => {
      if (complaint.gpsCoordinates?.coordinates) {
        const [lng, lat] = complaint.gpsCoordinates.coordinates
        window.open(
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
          '_blank'
        )
      }
    },
    []
  )

  const getNearbyComplaints = useCallback(
    (complaint: Complaint) => {
      if (!complaint.gpsCoordinates?.coordinates) return []
      const [lng, lat] = complaint.gpsCoordinates.coordinates
      const radius = 0.05

      return complaints.filter((c) => {
        if (c.id === complaint.id) return false
        if (!c.gpsCoordinates?.coordinates) return false
        const [clng, clat] = c.gpsCoordinates.coordinates
        return Math.abs(clat - lat) <= radius && Math.abs(clng - lng) <= radius
      })
    },
    [complaints]
  )

  const nearbyComplaints = selectedComplaint ? getNearbyComplaints(selectedComplaint) : []

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Complaint Map</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Loading complaint locations...</p>
            </div>
          </div>
          <Card className="p-6">
            <Skeleton className="h-[600px] w-full rounded-xl" />
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Complaint Map</h1>
            </div>
          </div>
          <Card>
            <div className="flex flex-col items-center py-12 text-center">
              <MapPin className="h-12 w-12 text-red-400 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Map</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
              <button
                onClick={loadComplaints}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className={cn('space-y-6', fullscreen && 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-4')}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Complaint Map</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {complaints.length} complaint{complaints.length !== 1 ? 's' : ''} with location data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize2 className="h-4 w-4 text-gray-600 dark:text-gray-400" /> : <Maximize2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
            </button>
            <button
              onClick={loadComplaints}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Refresh locations"
            >
              <RefreshCw className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search complaints on map..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Map + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Map */}
          <div className={cn('relative', selectedComplaint ? 'lg:w-2/3' : 'lg:w-full')}>
            <div
              ref={mapContainerRef}
              className={cn(
                'rounded-2xl border border-white/20 shadow-glass overflow-hidden',
                fullscreen ? 'h-[calc(100vh-200px)]' : 'h-[500px] lg:h-[600px]'
              )}
            />
          </div>

          {/* Sidebar - selected complaint details */}
          {selectedComplaint && (
            <div className="lg:w-1/3 space-y-4">
              <Card className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Complaint Details</h3>
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedComplaint.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-3">{selectedComplaint.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge label={selectedComplaint.priority || 'Low'} variant={selectedComplaint.priority === 'High' ? 'error' : selectedComplaint.priority === 'Medium' ? 'warning' : 'default'} />
                    <Badge label={selectedComplaint.category || 'Others'} variant="category" />
                    <Badge label={selectedComplaint.status || 'Pending'} />
                  </div>

                  {selectedComplaint.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{selectedComplaint.location}</span>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <p>Submitted by: {selectedComplaint.userName || 'Unknown'}</p>
                    <p>Date: {new Date(selectedComplaint.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => handleOpenComplaint(selectedComplaint.id)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      View Full Details
                    </button>
                    <button
                      onClick={() => handleGetDirections(selectedComplaint)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-medium transition-colors"
                    >
                      <Navigation className="h-4 w-4" />
                      Get Directions
                    </button>
                    {selectedComplaint.gpsCoordinates?.coordinates && (
                      <button
                        onClick={handleRefreshLocation}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Center on Map
                      </button>
                    )}
                  </div>
                </div>
              </Card>

              {/* Nearby complaints */}
              {nearbyComplaints.length > 0 && (
                <Card className="p-5">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Nearby Complaints ({nearbyComplaints.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {nearbyComplaints.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleOpenComplaint(c.id)}
                        className="w-full text-left p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge label={c.priority || 'Low'} variant={c.priority === 'High' ? 'error' : c.priority === 'Medium' ? 'warning' : 'default'} />
                          <span className="text-xs text-gray-500">{c.status}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {complaints.length === 0 && (
                <Card className="p-5">
                  <div className="text-center py-6">
                    <MapPin className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No complaints with GPS data found.</p>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}