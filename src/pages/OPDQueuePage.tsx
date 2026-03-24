import { useState } from 'react'
import QueueBoard from '../features/queue/QueueBoard'
import QueueAnalytics from '../features/queue/QueueAnalytics'
import QueueControls from '../features/queue/QueueControls'
import { useQueueAutoAdvance } from '../features/queue/useQueueAutoAdvance'

interface OPDQueuePageProps {
  title?: string
  description?: string
}

export default function OPDQueuePage({
  title = 'OPD queue',
  description = 'Issue tokens, call patients, and track status for the current session.',
}: OPDQueuePageProps) {
  const [simulationIntervalMs, setSimulationIntervalMs] = useState(8000)
  useQueueAutoAdvance(simulationIntervalMs)

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400 mb-2">Operations</p>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">{description}</p>
      </div>

      <QueueAnalytics />

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
