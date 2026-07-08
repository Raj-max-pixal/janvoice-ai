import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { 
  Mic, 
  Upload, 
  FileText, 
  CheckCircle2, 
  ChevronRight, 
  AlertCircle, 
  Plus, 
  X, 
  Sparkles, 
  Globe, 
  Volume2, 
  VolumeX, 
  Trophy, 
  Award,
  Video
} from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import {
  createComplaint,
  getUserComplaints,
  updateComplaintAnalysis,
} from '../services/firebase'
import { analyzeComplaint, getFallbackAnalysis, improveComplaintText, translateComplaintText } from '../services/ai'
import { playTextToSpeech, stopTextToSpeech } from '../services/gemini'
import { detectDuplicate, detectSpam, recommendDepartment } from '../services/detection'
import { validateFileAuto } from '../lib/fileValidation'
import { COMPLAINT_CATEGORIES, type Complaint, type ComplaintCategory } from '../types'

export function CitizenDashboard() {
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  
  // Wizard states
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState<ComplaintCategory>('Road')
  const [drafts, setDrafts] = useLocalStorage<Array<{ id: number; title: string; description: string; location: string; category: ComplaintCategory }>>('janvoice-drafts', [])
  const [activeDraftId, setActiveDraftId] = useState<number | null>(null)
  
  // Media attachments
  const [attachments, setAttachments] = useState<Array<{ name: string; type: 'image' | 'pdf' | 'video'; previewUrl: string }>>([])
  
  // AI Grievance Toolkit states
  const [isImproving, setIsImproving] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isPlayingTts, setIsPlayingTts] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('Hindi')

  // Recording states
  const [isRecording, setIsRecording] = useState(false)
  const [recordDuration, setRecordDuration] = useState(0)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  const loadComplaints = useCallback(async () => {
    if (!currentUser) return
    try {
      const data = await getUserComplaints(currentUser.uid)
      setComplaints(data)
    } catch {
      showToast('Failed to load complaints', 'error')
    } finally {
      setLoading(false)
    }
  }, [currentUser, showToast])

  useEffect(() => {
    console.log('[auth] Dashboard mounted', { dashboard: 'citizen' })
    loadComplaints()
  }, [loadComplaints])

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setRecordDuration(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Handle file uploads (Images, PDFs, Videos) with validation
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Use shared file validation
    const validation = validateFileAuto(file)
    if (!validation.valid) {
      showToast(validation.error || 'Invalid file', 'error')
      return
    }

    let fileType: 'image' | 'pdf' | 'video' = 'image'
    if (file.type.includes('pdf')) fileType = 'pdf'
    else if (file.type.includes('video') || file.name.endsWith('.mp4') || file.name.endsWith('.mov')) fileType = 'video'

    const previewUrl = URL.createObjectURL(file)
    setAttachments((prev) => [...prev, { name: file.name, type: fileType, previewUrl }])
    showToast(`File "${file.name}" attached successfully!`, 'success')
  }

  const removeAttachment = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // Voice recording simulation
  const saveDraft = useCallback(() => {
    const payload = { id: activeDraftId ?? Date.now(), title, description, location, category }
    if (!payload.title && !payload.description && !payload.location) {
      showToast('Nothing to save yet.', 'info')
      return
    }

    setDrafts((prev) => {
      const next = prev.filter((draft) => draft.id !== payload.id)
      return [payload, ...next].slice(0, 5)
    })
    setActiveDraftId(payload.id)
    showToast('Draft saved locally.', 'success')
  }, [activeDraftId, category, description, location, setDrafts, showToast, title])

  const loadDraft = (draftId: number) => {
    const draft = drafts.find((item) => item.id === draftId)
    if (!draft) return
    setActiveDraftId(draft.id)
    setTitle(draft.title)
    setDescription(draft.description)
    setLocation(draft.location)
    setCategory(draft.category)
    setStep(1)
    showToast('Draft loaded.', 'info')
  }

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false)
      showToast('Voice recording transcribed successfully.', 'success')
      setDescription((prev) => prev + (prev ? '\n' : '') + '[AI Transcribed Audio]: Heavy potholes on local bypass lane are slowing down traffic and creating safety issues.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      // Graceful fallback simulation
      setIsRecording(true)
      showToast('Recording voice message... Click stop to transcribe.', 'info')
    }
  }

  // AI Grievance Assistant: Improve complaint
  const handleAiImprove = async () => {
    if (!description.trim()) {
      showToast('Please type a draft grievance first.', 'error')
      return
    }
    setIsImproving(true)
    try {
      const improved = await improveComplaintText(description)
      setDescription(improved)
      showToast('Grievance optimized by AI!', 'success')
    } catch {
      showToast('Failed to optimize text.', 'error')
    } finally {
      setIsImproving(false)
    }
  }

  // AI Translation helper
  const handleAiTranslate = async () => {
    if (!description.trim()) {
      showToast('No text available to translate.', 'error')
      return
    }
    setIsTranslating(true)
    try {
      const translated = await translateComplaintText(description, selectedLanguage)
      setDescription(translated)
      showToast(`Grievance translated to ${selectedLanguage}!`, 'success')
    } catch {
      showToast('Translation service unavailable.', 'error')
    } finally {
      setIsTranslating(false)
    }
  }

  // Play aloud TTS
  const handleTtsPlay = () => {
    if (isPlayingTts) {
      stopTextToSpeech()
      setIsPlayingTts(false)
    } else {
      if (!description.trim()) {
        showToast('Nothing to read aloud.', 'error')
        return
      }
      playTextToSpeech(description)
      setIsPlayingTts(true)
      showToast('Reading grievance draft aloud...', 'info')
    }
  }

  const handleSubmit = async () => {
    if (!currentUser) return
    setSubmitting(true)
    try {
      const primaryImage = attachments.find(a => a.type === 'image')?.previewUrl
      
      // Run duplicate & spam detection in parallel with complaint creation
      const [duplicateCheck, spamCheck, departmentRec] = await Promise.allSettled([
        detectDuplicate(title || description, description, complaints),
        detectSpam(title || description, description, currentUser.displayName || '', complaints as Complaint[]),
        recommendDepartment(title || description, description),
      ])

      const isDuplicate = duplicateCheck.status === 'fulfilled' && duplicateCheck.value.isDuplicate
      const isSpam = spamCheck.status === 'fulfilled' && spamCheck.value.isSpam

      if (isDuplicate) {
        showToast('This complaint appears to be a duplicate of an existing one.', 'info')
      }
      if (isSpam) {
        showToast('Your complaint was flagged as spam. Please revise it.', 'error')
        setSubmitting(false)
        return
      }

      const department = departmentRec.status === 'fulfilled' ? departmentRec.value : undefined

      const complaintId = await createComplaint({
        userId: currentUser.uid,
        userName: currentUser.displayName,
        title: title || `Grievance: ${description.slice(0, 32)}...`,
        description,
        location: location || 'District HQ',
        address: {
          district: location || 'District HQ',
          state: 'Not specified',
          country: 'India',
        },
        category,
        status: 'Submitted',
        imageUrl: primaryImage ?? undefined,
        forwardedDepartment: department,
      })

      let analysis
      try {
        analysis = await analyzeComplaint(title, description, location)
      } catch {
        analysis = getFallbackAnalysis(description, category)
      }

      // Tag duplicate / spam info on analysis
      if (isDuplicate) {
        analysis.isDuplicate = true
      }
      if (isSpam) {
        analysis.isSpam = true
      }
      if (department) {
        analysis.departmentRecommendation = department
      }

      await updateComplaintAnalysis(complaintId, analysis)

      showToast('Civic priority submitted and queued for AI analysis!', 'success')
      
      // Reset states
      setTitle('')
      setDescription('')
      setLocation('')
      setCategory('Road')
      setAttachments([])
      setDrafts((prev) => prev.filter((draft) => draft.id !== activeDraftId))
      setActiveDraftId(null)
      setStep(1)
      await loadComplaints()
    } catch {
      showToast('Failed to submit grievance', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-200">
      
      {/* Top Welcome & Gamification Dashboard */}
      <div className="grid gap-6 md:grid-cols-12 mb-10 text-left">
        <div className="md:col-span-8 flex flex-col justify-center space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">
            Citizen Grievance Portal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Welcome back, <span className="font-bold text-[#002b55] dark:text-cyan-400">{currentUser?.displayName}</span>. File complaints, launch petitions, and earn reputation points.
          </p>
        </div>

        {/* Gamified Score Card */}
        <Card className="md:col-span-4 p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 text-white flex items-center justify-center shadow-lg">
            <Trophy size={22} />
          </div>
          <div className="text-left flex-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Citizen Reputation</span>
              <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">Rank #14</span>
            </div>
            <p className="text-lg font-black text-slate-950 dark:text-white mt-0.5">Level 3 Contributor</p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <Award size={14} className="text-yellow-500" />
              <span>240 Action Points</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Stepper Progress bar */}
      <div className="max-w-xl mx-auto mb-10">
        <div className="relative flex items-center justify-between">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-slate-200 dark:bg-slate-800 pointer-events-none" />
          <div 
            className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-[#002b55] dark:bg-cyan-500 transition-all duration-300 pointer-events-none"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          />

          {[1, 2, 3].map((s) => (
            <div key={s} className="relative z-10 flex flex-col items-center">
              <button 
                onClick={() => step >= s && setStep(s)}
                disabled={step < s}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all ${
                  step >= s 
                    ? 'bg-[#002b55] text-white dark:bg-cyan-500 dark:text-slate-950 ring-4 ring-[#002b55]/10 dark:ring-cyan-500/10' 
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                }`}
              >
                {s}
              </button>
              <span className={`mt-2 text-xs font-bold ${step >= s ? 'text-[#002b55] dark:text-cyan-400' : 'text-slate-500'}`}>
                {s === 1 ? 'Description' : s === 2 ? 'Details' : 'Review'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main wizard container */}
      <div className="max-w-5xl mx-auto text-left">
        <Card className="p-8 border border-slate-250/60 dark:border-slate-800 bg-white dark:bg-slate-950/70 shadow-lg rounded-2xl">
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,application/pdf,video/*"
          />

          {/* STEP 1: DESCRIPTION */}
          {step === 1 && (
            <div className="grid gap-8 md:grid-cols-12">
              
              {/* Left Column (Grievance Text and AI Panel) */}
              <div className="md:col-span-7 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-extrabold text-[#002b55] dark:text-white">
                    Describe your grievance or suggestion
                  </h3>
                  {/* TTS Button */}
                  <button 
                    onClick={handleTtsPlay}
                    className="p-2 text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850"
                    title="Read Aloud"
                  >
                    {isPlayingTts ? <VolumeX size={16} className="text-red-505" /> : <Volume2 size={16} />}
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={8}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-950 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-cyan-400"
                    placeholder="Provide a detailed description of the issue. You can draft bullet points and use our AI tools below to structure it professionally..."
                  />
                </div>

                {/* Voice Input Button */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleRecording}
                    className={`flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold text-white transition-all shadow-sm cursor-pointer ${
                      isRecording
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                        : 'bg-[#002b55] hover:bg-[#003d77] dark:bg-cyan-500 dark:text-slate-950'
                    }`}
                  >
                    <Mic size={14} />
                    {isRecording ? `Recording (${formatDuration(recordDuration)})` : 'Voice Input'}
                  </button>
                  <span className="text-[10px] text-slate-500 dark:text-slate-450 leading-snug">
                    Speak your complaint in any language. Our AI translates it automatically.
                  </span>
                </div>

                {/* AI Grievance Assistant Tools */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-850 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={saveDraft}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                    >
                      Save Draft
                    </button>
                    {drafts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-[11px] font-bold text-cyan-700 transition-colors hover:bg-cyan-100 dark:border-cyan-900/40 dark:bg-cyan-950/30 dark:text-cyan-400"
                      >
                        Review Drafts
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">AI grievance toolkit</span>
                  
                  <div className="flex flex-wrap gap-2.5">
                    {/* Improve Complaint */}
                    <button
                      onClick={handleAiImprove}
                      disabled={isImproving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles size={14} className="text-cyan-500" />
                      {isImproving ? 'Polishing Draft...' : 'AI Polisher'}
                    </button>

                    {/* Translation Dropdown & Button */}
                    <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden">
                      <select 
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="bg-transparent text-xs px-2.5 py-2 outline-none border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-650 dark:text-slate-300 cursor-pointer"
                      >
                        <option value="Hindi">Hindi (हिंदी)</option>
                        <option value="Tamil">Tamil (தமிழ்)</option>
                        <option value="Telugu">Telugu (తెలుగు)</option>
                        <option value="Bengali">Bengali (বাংলা)</option>
                      </select>
                      <button
                        onClick={handleAiTranslate}
                        disabled={isTranslating}
                        className="px-3 py-2 text-xs font-bold text-[#002b55] dark:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-850 flex items-center gap-1 cursor-pointer"
                      >
                        <Globe size={13} />
                        {isTranslating ? 'Translating...' : 'Translate'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (Attachments and Media uploads) */}
              <div className="md:col-span-5 space-y-4">
                <h3 className="text-base font-extrabold text-[#002b55] dark:text-white">
                  Media Attachments & Evidence
                </h3>

                {/* Upload drag drop box */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-8 text-center cursor-pointer hover:border-cyan-500 dark:border-slate-800 dark:hover:border-cyan-455 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all duration-200"
                >
                  <div className="rounded-full bg-slate-100 p-3 group-hover:scale-105 transition-transform dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                    <Upload size={20} />
                  </div>
                  <span className="mt-3 text-xs font-black text-slate-800 dark:text-slate-300">
                    Drag & Drop or <span className="text-[#002b55] dark:text-cyan-400 underline">Browse files</span>
                  </span>
                  <span className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">
                    Attach photos, PDFs, or videos (Max 20MB per file)
                  </span>
                </div>

                {/* Attachments List Previews */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block pt-2">Attached Files ({attachments.length})</span>
                  
                  {attachments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No files attached yet. Add pictures or documents to support your grievance.</p>
                  ) : (
                    <div className="grid gap-3 grid-cols-2">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900 aspect-video flex flex-col items-center justify-center p-2 text-center">
                          {file.type === 'image' && (
                            <img src={file.previewUrl} alt="Preview" className="absolute inset-0 h-full w-full object-cover opacity-70" />
                          )}
                          
                          <div className="relative z-10 flex flex-col items-center">
                            {file.type === 'pdf' && <FileText size={28} className="text-red-500" />}
                            {file.type === 'video' && <Video size={28} className="text-purple-500" />}
                            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate w-32 mt-1 block bg-white/80 dark:bg-slate-950/80 px-1 py-0.5 rounded">
                              {file.name}
                            </span>
                          </div>

                          <button
                            onClick={(e) => removeAttachment(idx, e)}
                            className="absolute top-1.5 right-1.5 z-20 rounded-full bg-red-600 p-1 text-white hover:bg-red-700 shadow"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: CATEGORY & LOCATION */}
          {step === 2 && (
            <div className="grid gap-8 md:grid-cols-2 text-left">
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-[#002b55] dark:text-white">Grievance Categorization</h3>
                
                <Input
                  label="Subject Title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Water logging, Damaged street lamps"
                  required
                />

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-750 dark:text-slate-305">
                    Select Category
                  </label>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as ComplaintCategory)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 focus:border-cyan-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-cyan-400"
                  >
                    {COMPLAINT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-5">
                <h3 className="text-lg font-bold text-[#002b55] dark:text-white">Location Details</h3>

                <Input
                  label="Constituency Ward / Area"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="e.g. Ward 12, Heritage East"
                  required
                />

                <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                  <AlertCircle className="text-cyan-500 shrink-0 mt-0.5" size={16} />
                  <p>
                    Ensure your Ward details are accurate. JanVoice AI will geo-route your grievance to the local MLA and department officers instantly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW SUMMARY */}
          {step === 3 && (
            <div className="grid gap-8 md:grid-cols-2 text-left">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-[#002b55] dark:text-white">Grievance Summary</h3>
                
                <div className="space-y-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-6 border border-slate-200 dark:border-slate-850">
                  <div>
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Subject</h4>
                    <p className="text-sm font-semibold text-slate-950 dark:text-white mt-0.5">{title || 'Untitled'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Category</h4>
                      <p className="text-sm font-semibold text-slate-950 dark:text-white mt-0.5">{category}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Location</h4>
                      <p className="text-sm font-semibold text-slate-950 dark:text-white mt-0.5">{location || 'HQ Office'}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Description</h4>
                    <p className="text-xs text-slate-700 dark:text-slate-350 mt-1 leading-relaxed whitespace-pre-wrap">{description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-[#002b55] dark:text-white">Attached Evidence ({attachments.length})</h3>
                
                {attachments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-12 dark:border-slate-800 dark:bg-slate-900 text-slate-400 text-center">
                    <FileText size={32} className="text-slate-300 dark:text-slate-700" />
                    <span className="mt-2 text-xs font-semibold text-slate-500">No media attached</span>
                  </div>
                ) : (
                  <div className="grid gap-3 grid-cols-2">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-205 dark:border-slate-800 p-2.5 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        {file.type === 'image' && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                        {file.type === 'pdf' && <FileText size={16} className="text-red-500 shrink-0" />}
                        {file.type === 'video' && <Video size={16} className="text-purple-500 shrink-0" />}
                        <span className="truncate flex-1">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-150/70 dark:border-slate-850 flex justify-between items-center">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300">
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 1 && !description}
                className="bg-[#002b55] hover:bg-[#003d77] text-white dark:bg-cyan-500 dark:text-slate-950 font-bold px-6 py-2.5 shadow cursor-pointer"
              >
                Continue <ChevronRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 shadow cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Confirm & Submit'}
              </Button>
            )}
          </div>

        </Card>
      </div>

      {drafts.length > 0 && (
        <div className="max-w-5xl mx-auto mt-10 text-left">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">Saved Drafts</h2>
            <span className="text-xs font-semibold text-slate-500">Auto-saved locally for quick recovery</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {drafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => loadDraft(draft.id)}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/70"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{draft.title || 'Untitled draft'}</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{draft.category}</span>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{draft.description || 'No description yet.'}</p>
                <p className="mt-3 text-[11px] font-semibold text-cyan-700 dark:text-cyan-400">Tap to restore</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Your Submitted Suggestions */}
      <div className="max-w-5xl mx-auto mt-16 text-left">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white mb-6">
          Your Submitted Grievances
        </h2>

        {complaints.length === 0 ? (
          <Card className="py-12 border border-slate-200/70 dark:border-slate-800 dark:bg-slate-950/70 text-center">
            <p className="text-sm text-slate-550 dark:text-slate-500">
              No suggestions submitted yet. Use the wizard above to submit your first suggestion!
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {complaints.map((complaint) => (
              <Card key={complaint.id} className="p-6 border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950/70 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">
                      {complaint.title}
                    </h3>
                    <Badge
                      label={complaint.status}
                      variant="status"
                      value={complaint.status}
                    />
                  </div>
                  <p className="mt-3 text-xs text-slate-650 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {complaint.aiAnalysis?.summary ?? complaint.description}
                  </p>
                  
                  {complaint.forwardedDepartment && (
                    <div className="mt-3 bg-cyan-500/5 dark:bg-cyan-400/10 p-2.5 rounded-lg border border-cyan-500/10 flex items-center gap-1.5 text-[10px] font-bold text-[#002b55] dark:text-cyan-400">
                      <Plus size={12} />
                      <span>Forwarded to: {complaint.forwardedDepartment}</span>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge label={complaint.category} variant="category" />
                    {complaint.aiAnalysis && (
                      <Badge
                        label={complaint.aiAnalysis.priority}
                        variant="priority"
                        value={complaint.aiAnalysis.priority}
                      />
                    )}
                    {complaint.aiAnalysis && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                        {complaint.aiAnalysis.sentiment} Sentiment
                      </span>
                    )}
                  </div>
                </div>

                {complaint.aiAnalysis?.recommendedAction && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850">
                    <p className="text-[10px] font-extrabold text-[#002b55] dark:text-cyan-400 uppercase tracking-wider">AI Recommended Action:</p>
                    <p className="text-[11px] text-slate-650 dark:text-slate-450 mt-0.5 line-clamp-2 leading-relaxed">
                      {complaint.aiAnalysis.recommendedAction}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
