 import { useEffect, useState, useMemo } from 'react'
import { 
  ThumbsUp, 
  Share2, 
  Flame, 
  Search, 
  CheckCircle,
  Map,
  ListFilter,
  X
} from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { 
  getAllComplaints, 
  upvoteComplaint, 
  getAllPetitions, 
  createPetition, 
  signPetition 
} from '../services/firebase'
import { COMPLAINT_CATEGORIES, type Complaint, type Petition, type ComplaintCategory } from '../types'

export function PublicFeedPage() {
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  
  // Data states
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [petitions, setPetitions] = useState<Petition[]>([])
  const [loading, setLoading] = useState(true)
  
  // Navigation tabs
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'petitions' | 'gis'>('feed')
  
  // Filter / Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  
  // Selected map pin state
  const [selectedPin, setSelectedPin] = useState<{ id: string; title: string; location: string; category: string; description: string } | null>(null)
  
  // Petition form modal state
  const [petitionModalOpen, setPetitionModalOpen] = useState(false)
  const [petTitle, setPetTitle] = useState('')
  const [petDesc, setPetDesc] = useState('')
  const [petCat, setPetCat] = useState<ComplaintCategory>('Road')

  const loadData = async () => {
    try {
      const allComplaints = await getAllComplaints()
      const allPetitions = await getAllPetitions()
      setComplaints(allComplaints)
      setPetitions(allPetitions)
    } catch {
      showToast('Failed to retrieve community data.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Upvote complaint handler
  const handleUpvote = async (complaintId: string) => {
    if (!currentUser) {
      showToast('Please sign in to upvote grievances.', 'info')
      return
    }
    try {
      await upvoteComplaint(complaintId, currentUser.uid)
      showToast('Upvote updated!', 'success')
      // Refresh local list
      const updated = await getAllComplaints()
      setComplaints(updated)
    } catch {
      showToast('Failed to register vote', 'error')
    }
  }

  // Sign petition handler
  const handleSignPetition = async (petitionId: string) => {
    if (!currentUser) {
      showToast('Please sign in to sign petitions.', 'info')
      return
    }
    try {
      await signPetition(petitionId, currentUser.uid)
      showToast('You signed the petition!', 'success')
      const updated = await getAllPetitions()
      setPetitions(updated)
    } catch {
      showToast('Failed to sign petition', 'error')
    }
  }

  // Create new petition handler
  const handleCreatePetition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    if (!petTitle.trim() || !petDesc.trim()) {
      showToast('Please fill in all details.', 'error')
      return
    }
    try {
      await createPetition(
        petTitle,
        petDesc,
        petCat,
        currentUser.displayName || 'Anonymous Citizen'
      )
      showToast('Community petition launched successfully!', 'success')
      setPetTitle('')
      setPetDesc('')
      setPetitionModalOpen(false)
      const updated = await getAllPetitions()
      setPetitions(updated)
    } catch {
      showToast('Failed to launch petition', 'error')
    }
  }

  // Share complaint simulation
  const handleShare = (complaintId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/complaint/${complaintId}`)
    showToast('Complaint share link copied to clipboard!', 'success')
  }

  // Filter complaints based on categories and search query
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [complaints, searchQuery, selectedCategory])

  // Mock GIS map pin list
  const mapPins = [
    { id: 'pin-1', x: '25%', y: '35%', title: 'Road Maintenance Needed', location: 'Ward 12-B', category: 'Road', description: 'Large potholes are blocking the ambulance lane.' },
    { id: 'pin-2', x: '65%', y: '60%', title: 'Garbage Collection Delayed', location: 'Ward 04-A', category: 'Sanitation', description: 'Waste piling up near the local market.' },
    { id: 'pin-3', x: '75%', y: '15%', title: 'Low Water Pressure', location: 'Ward 08-D', category: 'Water', description: 'Daily water pressures dropping under standard minimums.' }
  ]

  if (loading) return <LoadingSpinner />

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900 min-h-screen text-left transition-colors duration-200">
      
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-950 dark:text-white">Public Grievance Feed</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            View active suggestions in your district, upvote critical concerns, sign active petitions, or inspect the interactive GIS map.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="bg-slate-100 dark:bg-slate-950 p-0.5 rounded-xl flex items-center shadow-inner self-start md:self-center">
          <button
            onClick={() => setActiveSubTab('feed')}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'feed'
                ? 'bg-white dark:bg-slate-800 text-[#002b55] dark:text-cyan-400 shadow'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Public Feed
          </button>
          <button
            onClick={() => setActiveSubTab('petitions')}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'petitions'
                ? 'bg-white dark:bg-slate-800 text-[#002b55] dark:text-cyan-400 shadow'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Active Petitions
          </button>
          <button
            onClick={() => setActiveSubTab('gis')}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'gis'
                ? 'bg-white dark:bg-slate-800 text-[#002b55] dark:text-cyan-400 shadow'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Map className="inline-block mr-1" size={13} />
            Interactive Map
          </button>
        </div>
      </div>

      {/* VIEW 1: COMPLAINT FEED */}
      {activeSubTab === 'feed' && (
        <div className="grid gap-8 lg:grid-cols-12">
          
          {/* Left Column: Complaints Feed List (Col Span 8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Search and category filters */}
            <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 shadow-sm flex flex-wrap gap-4 items-center justify-between">
              {/* Search */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900 w-full sm:w-64">
                <Search size={15} className="text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search public grievances..."
                  className="bg-transparent border-none outline-none text-xs w-full text-slate-900 placeholder-slate-400 dark:text-white"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <ListFilter size={14} className="text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-xl border border-slate-205 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 font-bold focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-350 cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  <option value="Road">Roads</option>
                  <option value="Water">Water</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Sanitation">Sanitation</option>
                  <option value="Healthcare">Healthcare</option>
                </select>
              </div>
            </Card>

            {filteredComplaints.length === 0 ? (
              <Card className="py-16 text-center border border-slate-200 dark:border-slate-800">
                <p className="text-slate-405 italic">No grievances matching your selection are listed in the public feed.</p>
              </Card>
            ) : (
              filteredComplaints.map((c) => {
                const hasVoted = currentUser ? c.upvotedUsers?.includes(currentUser.uid) : false
                
                return (
                  <Card 
                    key={c.id} 
                    className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 tracking-wider">#{c.id} • Filed by {c.userName || 'Citizen'}</span>
                          <h3 className="text-lg font-bold text-slate-950 dark:text-white line-clamp-1">{c.title}</h3>
                        </div>
                        <Badge label={c.status} variant="status" value={c.status} />
                      </div>

                      <p className="mt-3 text-xs text-slate-650 dark:text-slate-400 line-clamp-3 leading-relaxed">
                        {c.description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2.5">
                        <Badge label={c.category} variant="category" />
                        {c.aiAnalysis?.priority && (
                          <Badge label={c.aiAnalysis.priority} variant="priority" value={c.aiAnalysis.priority} />
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                          📍 {c.location}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-850 flex justify-between items-center text-xs font-bold">
                      {/* Upvoting */}
                      <button
                        onClick={() => handleUpvote(c.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all cursor-pointer ${
                          hasVoted
                            ? 'bg-[#002b55] text-white dark:bg-cyan-500 dark:text-slate-950'
                            : 'bg-slate-100 text-slate-650 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-850'
                        }`}
                      >
                        <ThumbsUp size={13} />
                        <span>Upvote ({c.upvotes ?? 0})</span>
                      </button>

                      <div className="flex gap-2">
                        {/* Escalate to Petition if popular */}
                        {(c.upvotes ?? 0) >= 10 && (
                          <button
                            onClick={() => {
                              setPetTitle(`Petition: ${c.title}`)
                              setPetDesc(`Based on grievance #${c.id}: ${c.description}`)
                              setPetCat(c.category)
                              setPetitionModalOpen(true)
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-950 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 px-3 py-2 transition-colors cursor-pointer"
                          >
                            <Flame size={13} />
                            <span>Escalate to Petition</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleShare(c.id)}
                          className="p-2 text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900 rounded-lg cursor-pointer"
                          title="Share"
                        >
                          <Share2 size={15} />
                        </button>
                      </div>
                    </div>
                  </Card>
                )
              })
            )}

          </div>

          {/* Right Column: Statistics Grid & Active Petitions Preview (Col Span 4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Launch Petition Box */}
            <Card className="p-6 bg-gradient-to-tr from-[#002b55] to-cyan-700 text-white rounded-2xl border-0 shadow-lg text-center space-y-4">
              <div className="h-12 w-12 rounded-xl bg-white/10 text-cyan-300 flex items-center justify-center mx-auto shadow-sm">
                <Flame size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black">Launch a Petition</h3>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Start a community-led development petition. Wards require 500 signatures for formal review by government departments.
                </p>
              </div>
              <button
                onClick={() => {
                  if (!currentUser) {
                    showToast('Please sign in to launch a petition.', 'info')
                  } else {
                    setPetitionModalOpen(true)
                  }
                }}
                className="w-full rounded-xl bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-bold py-3 text-xs tracking-wider uppercase transition-colors cursor-pointer"
              >
                Launch Petition
              </button>
            </Card>

            {/* Platform statistics */}
            <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 shadow-sm text-left space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">District Summary</h3>
              
              <div className="divide-y divide-slate-150 dark:divide-slate-850 text-xs font-semibold text-slate-650 dark:text-slate-400">
                <div className="py-2.5 flex justify-between">
                  <span>Open Grievances</span>
                  <span className="text-[#002b55] dark:text-cyan-450 font-extrabold">24 active</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span>Community Petitions</span>
                  <span className="text-orange-650 dark:text-orange-400 font-extrabold">{petitions.length} open</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span>Avg Resolution Rate</span>
                  <span className="text-emerald-650 dark:text-emerald-400 font-extrabold">85.4%</span>
                </div>
              </div>
            </Card>

          </div>
        </div>
      )}

      {/* VIEW 2: PETITIONS TAB */}
      {activeSubTab === 'petitions' && (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Main petition list */}
          <div className="lg:col-span-8 space-y-6">
            {petitions.length === 0 ? (
              <Card className="py-16 text-center border border-slate-200 dark:border-slate-800">
                <p className="text-slate-400 italic">No petitions launched yet. Start one to gain community support!</p>
              </Card>
            ) : (
              petitions.map((p) => {
                const signed = currentUser ? p.signedUsers?.includes(currentUser.uid) : false
                const progress = Math.min(100, Math.round((p.signaturesCount / p.targetSignatures) * 100))
                
                return (
                  <Card key={p.id} className="p-6 border border-slate-250/70 dark:border-slate-800 bg-white dark:bg-slate-950/70 shadow-sm text-left space-y-5">
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category: {p.category}</span>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{p.title}</h3>
                          <p className="text-[10px] text-slate-500">Initiated by {p.creatorName}</p>
                        </div>
                        <span className="rounded bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 px-2 py-0.5 text-[10px] font-extrabold uppercase flex items-center gap-1">
                          <Flame size={10} /> Petition
                        </span>
                      </div>

                      <p className="mt-3.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    {/* Progress details */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                        <span>{p.signaturesCount} of {p.targetSignatures} signatures</span>
                        <span>{progress}% Completed</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-850 overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    {/* Signature submit button */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex justify-end">
                      {signed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 px-4 py-2 border border-emerald-200 dark:border-emerald-950 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
                          <CheckCircle size={14} /> Signed Petition
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSignPetition(p.id)}
                          className="rounded-xl bg-[#002b55] text-white dark:bg-cyan-500 dark:text-slate-950 hover:opacity-90 font-bold text-xs px-6 py-2.5 shadow-sm transition-all cursor-pointer"
                        >
                          Sign this Petition
                        </button>
                      )}
                    </div>
                  </Card>
                )
              })
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            {/* Info Card */}
            <Card className="p-5 border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left space-y-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase text-[#002b55] dark:text-cyan-400 tracking-wider">How Petitions Work</h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                When a grievance gains 10 upvotes, citizens can escalate it to a public petition. If the petition hits its target threshold (e.g. 500 signatures):
              </p>
              <ul className="list-disc list-inside text-xs text-slate-550 dark:text-slate-400 leading-relaxed pl-1 space-y-2">
                <li>Forwarded directly to the MP Priority dashboard.</li>
                <li>Requires MLA review within 7 working days.</li>
                <li>Linked to budget requests automatically.</li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW 3: INTERACTIVE GIS MAP */}
      {activeSubTab === 'gis' && (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Map display */}
          <div className="lg:col-span-8 space-y-4">
            
            <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 shadow-sm relative overflow-hidden text-center flex flex-col justify-center items-center">
              
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-2">GIS Grievance Heatmap</span>
              
              {/* SVG Map mockup */}
              <div className="relative h-[400px] w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex items-center justify-center transition-colors">
                <svg className="absolute inset-0 h-full w-full opacity-35 dark:opacity-20 text-slate-400 dark:text-slate-700" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M10,10 L30,20 L50,15 L70,30 L90,10" stroke="currentColor" strokeWidth="0.5" fill="none" />
                  <path d="M5,40 L25,50 L45,40 L65,55 L85,35" stroke="currentColor" strokeWidth="0.5" fill="none" />
                  <path d="M20,80 L40,75 L60,85 L80,70 L95,90" stroke="currentColor" strokeWidth="0.5" fill="none" />
                  {/* Grid Lines */}
                  <line x1="20" y1="0" x2="20" y2="100" stroke="currentColor" strokeWidth="0.1" />
                  <line x1="40" y1="0" x2="40" y2="100" stroke="currentColor" strokeWidth="0.1" />
                  <line x1="60" y1="0" x2="60" y2="100" stroke="currentColor" strokeWidth="0.1" />
                  <line x1="80" y1="0" x2="80" y2="100" stroke="currentColor" strokeWidth="0.1" />
                </svg>

                {/* Map Pins overlay */}
                {mapPins.map((pin) => (
                  <button
                    key={pin.id}
                    onClick={() => setSelectedPin(pin)}
                    className="absolute h-6 w-6 rounded-full bg-red-600 border-2 border-white dark:border-slate-950 flex items-center justify-center text-white font-bold text-xs shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                    style={{ top: pin.y, left: pin.x }}
                  >
                    📍
                  </button>
                ))}

                {/* Simulated Glow hotspots */}
                <div className="absolute top-[35%] left-[25%] h-16 w-16 rounded-full bg-red-500/20 blur-md animate-pulse pointer-events-none" />
                <div className="absolute top-[60%] left-[65%] h-12 w-12 rounded-full bg-yellow-500/15 blur-md animate-pulse pointer-events-none" />

                {/* Selection Popup Overlay */}
                {selectedPin && (
                  <div className="absolute bottom-5 left-5 right-5 md:left-auto md:right-5 md:w-80 rounded-xl bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 p-4 shadow-xl text-left backdrop-blur flex flex-col gap-2 transition-all">
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400">{selectedPin.location} • {selectedPin.category}</span>
                        <h4 className="text-sm font-bold text-slate-905 dark:text-white leading-tight">{selectedPin.title}</h4>
                      </div>
                      <button onClick={() => setSelectedPin(null)} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-450">
                        <X size={12} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-550 dark:text-slate-400 leading-normal">{selectedPin.description}</p>
                    <button 
                      onClick={() => {
                        setSelectedPin(null)
                        setActiveSubTab('feed')
                      }} 
                      className="text-xs font-bold text-[#002b55] dark:text-cyan-400 hover:underline pt-1 self-start"
                    >
                      View details in public feed →
                    </button>
                  </div>
                )}

              </div>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="p-5 border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left space-y-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase text-[#002b55] dark:text-cyan-400 tracking-wider">GIS Integration</h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                The GIS mapping system correlates citizen complaints with geographical coordinates.
              </p>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                This dashboard displays hot-centers where infrastructure repair (like water valves or road patch works) is most dense. MPs can dispatch public engineers to these pins directly.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* LAUNCH PETITION MODAL DIALOG */}
      {petitionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl max-w-lg w-full p-6 text-left shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-850">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Launch Community Petition</h3>
              <button onClick={() => setPetitionModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePetition} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Petition Title</label>
                <input
                  type="text"
                  value={petTitle}
                  onChange={(e) => setPetTitle(e.target.value)}
                  placeholder="e.g. Repair Heritage East Main Footpath"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-950 focus:border-cyan-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Description & Goals</label>
                <textarea
                  value={petDesc}
                  onChange={(e) => setPetDesc(e.target.value)}
                  placeholder="Describe what change you petition for, who it affects, and why it is urgent..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-950 focus:border-cyan-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Category</label>
                <select
                  value={petCat}
                  onChange={(e) => setPetCat(e.target.value as ComplaintCategory)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-950 focus:border-cyan-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                  {COMPLAINT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3.5 pt-4">
                <Button variant="outline" type="button" onClick={() => setPetitionModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#002b55] text-white dark:bg-cyan-500 dark:text-slate-950 font-bold shadow-md cursor-pointer">
                  Launch Petition
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  )
}
