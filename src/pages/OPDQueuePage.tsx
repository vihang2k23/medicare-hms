import { useState } from 'react'
import QueueBoard from '../domains/queue/QueueBoard'
import QueuePublicBoard from '../domains/queue/QueuePublicBoard'
import QueueAnalytics from '../domains/queue/QueueAnalytics'
import QueueControls from '../domains/queue/QueueControls'
import { useQueueAutoAdvance } from '../domains/queue/useQueueAutoAdvance'

// OPDQueuePage defines the OPDQueue Page UI surface and its primary interaction flow.
interface OPDQueuePageProps {
  title?: string
  description?: string
}

// OPDQueuePage renders the opd queue page UI.
export default function OPDQueuePage({
  title = 'OPD queue',
  description = 'Issue tokens, call patients, and track status for the current session.',
}: OPDQueuePageProps) {
  const [simulationIntervalMs, setSimulationIntervalMs] = useState(30000)
  useQueueAutoAdvance(simulationIntervalMs)

  return (
    <div className="space-y-8">
      {/* Page intro anchors the flow before operators interact with queue controls. */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-white mb-2">Operations</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
        <p className="text-slate-600 dark:text-white text-sm mt-2 max-w-2xl leading-relaxed">{description}</p>
      </div>

      <QueuePublicBoard />

      <QueueAnalytics />

      {/* Split layout keeps action controls separate from the live queue table. */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <QueueControls
            simulationIntervalMs={simulationIntervalMs}
            onSimulationIntervalChange={setSimulationIntervalMs}
          />
        </div>
        <div className="xl:col-span-3">
          <QueueBoard />
        </div>
      </div>
    </div>
  )
}
