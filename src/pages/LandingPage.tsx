import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Mic,
  Video,
  FileText,
  Users,
  CheckCircle2,
  Sparkles,
  MapPin,
  BarChart3,
  Activity
} from 'lucide-react'
import { Button } from '../components/ui/Button'

export function LandingPage() {
  return (
    <div className="bg-slate-50 text-slate-950 dark:bg-slate-900 dark:text-slate-105 transition-colors duration-200">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#061e38] via-[#0b335c] to-[#041224] py-20 lg:py-28 text-white px-4 sm:px-6 lg:px-8">
        {/* Subtle grid decoration overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm text-slate-205"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                RC1 • Demo-ready civic platform
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white"
              >
                Turn local feedback
                <br />
                <span className="text-cyan-400">into visible action</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="max-w-xl text-lg text-slate-300 leading-relaxed"
              >
                JanVoice AI helps citizens submit grievances, authorities triage urgent needs, and communities track progress through a clear, transparent experience.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center gap-4 pt-4"
              >
                <Link to="/citizen-dashboard">
                  <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold border-0 shadow-lg">
                    Submit a Request <ArrowRight size={18} className="ml-1.5" />
                  </Button>
                </Link>
                <Link to="/public-feed">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    Explore public insights
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* Right Stats Mockup */}
            <div className="lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 gap-4"
              >
                {/* Stat 1 */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-glass">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Users size={24} />
                  </div>
                  <p className="mt-4 text-3xl font-extrabold text-white">1.2M+</p>
                  <p className="mt-1 text-sm font-semibold text-slate-400">Citizens Engaged</p>
                </div>

                {/* Stat 2 */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-glass">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="mt-4 text-3xl font-extrabold text-white">85%</p>
                  <p className="mt-1 text-sm font-semibold text-slate-400">Request Resolution</p>
                </div>

                {/* Stat 3 */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-glass">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                    <Sparkles size={24} />
                  </div>
                  <p className="mt-4 text-xl font-extrabold text-white leading-tight">AI-Ranked</p>
                  <p className="mt-1 text-sm font-semibold text-slate-400">Prioritization Engine</p>
                </div>

                {/* Stat 4 */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-glass">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                    <MapPin size={24} />
                  </div>
                  <p className="mt-4 text-3xl font-extrabold text-white">500+</p>
                  <p className="mt-1 text-sm font-semibold text-slate-400">Active Constituencies</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Transforming Public Service
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Leveraging advanced natural language processing and data analytics to bridge the gap between representatives and the people they serve.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {/* Card 1: Multi-modal Feedback */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-950 transition-colors shadow-card flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white">
                <Users size={24} />
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
                Multi-modal Feedback
              </h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Submit concerns via voice, video, or text. Our AI processes detect and intent to ensure no voice is left unheard, regardless of language or literacy.
              </p>
            </div>

            {/* Simulated Interaction Buttons */}
            <div className="mt-8 flex gap-3">
              <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-200 py-3 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors">
                <Mic size={14} className="text-cyan-500" />
                Voice
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-200 py-3 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors">
                <Video size={14} className="text-purple-500" />
                Video
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-200 py-3 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors">
                <FileText size={14} className="text-orange-500" />
                Text
              </button>
            </div>
          </motion.div>

          {/* Card 2: AI Priority Scoring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-950 transition-colors shadow-card flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white">
                <Sparkles size={24} />
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
                AI Priority Scoring
              </h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Smart algorithms categorize and rank development needs based on urgency, impact, and local feasibility.
              </p>
            </div>

            {/* Visual Indicator of Priorities */}
            <div className="mt-8 space-y-4 rounded-xl bg-slate-50 dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-850">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-750 dark:text-slate-300">Healthcare</span>
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700 dark:bg-red-950/40 dark:text-red-400 font-extrabold uppercase">Critical</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-red-600 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-750 dark:text-slate-300">Education</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-extrabold uppercase">Optimized</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: '45%' }} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Direct MP Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-950 transition-colors shadow-card flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white">
                <BarChart3 size={24} />
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
                Direct MP Insights
              </h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Members of Parliament receive real-time dashboards summarizing constituent sentiment and heatmaps of development demands.
              </p>
            </div>

            {/* Visual Chart Graphic */}
            <div className="mt-8 flex items-center justify-center gap-3 bg-slate-50 dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-850 rounded-xl">
              <div className="h-10 w-2.5 rounded-full bg-cyan-500/80" />
              <div className="h-14 w-2.5 rounded-full bg-cyan-500/80" />
              <div className="h-8 w-2.5 rounded-full bg-cyan-500/85 animate-pulse" />
              <div className="h-16 w-2.5 rounded-full bg-[#0b335c] dark:bg-cyan-400" />
              <div className="h-11 w-2.5 rounded-full bg-cyan-500/80" />
              <div className="h-6 w-2.5 rounded-full bg-cyan-500/70" />
            </div>
          </motion.div>

          {/* Card 4: Verified Transparency */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-950 transition-colors shadow-card flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white">
                <Activity size={24} />
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
                Verified Transparency
              </h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Every request is tracked on a public ledger. Citizens can follow their request from &quot;Received&quot; to &quot;Project Completed&quot; with full AI-generated status updates.
              </p>
            </div>

            {/* Visual Steps Timeline */}
            <div className="mt-8 flex justify-between items-center text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-850 rounded-xl">
              <span className="text-cyan-600 dark:text-cyan-400">Received</span>
              <span className="text-slate-400 font-normal">→</span>
              <span className="text-[#0b335c] dark:text-white">Analyzing</span>
              <span className="text-slate-400 font-normal">→</span>
              <span className="text-slate-400">Action Taken</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer Call to Action (CTA) */}
      <section className="bg-slate-100 dark:bg-slate-950 transition-colors py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-900">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Ready to Shape Your Future?
          </h2>
          <p className="mx-auto max-w-xl text-slate-605 dark:text-slate-400">
            Join thousands of citizens making their voices count. Submit your first development request today and let JanVoice AI do the heavy lifting.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link to="/citizen-dashboard">
              <Button size="lg" className="bg-[#002b55] hover:bg-[#003d77] text-white font-bold border-0 shadow">
                Start Your Request
              </Button>
            </Link>
            <Link to="/analytics">
              <Button size="lg" variant="outline" className="border-[#002b55]/30 text-[#002b55] hover:bg-[#002b55]/5 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">
                Explore Public Data
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
