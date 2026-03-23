import QueueBoard from '../features/queue/QueueBoard'
import QueueControls from '../features/queue/QueueControls'

interface OPDQueuePageProps {
  title?: string
  description?: string
}

export default function OPDQueuePage({
  title = 'OPD queue',
  description = 'Issue tokens, call patients, and track status for the current session.',
}: OPDQueuePageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{description}</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2">
          <QueueControls />
        </div>
        <div className="xl:col-span-3">
          <QueueBoard />
        </div>
      </div>
    </div>
  )
}
