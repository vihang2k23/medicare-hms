import { Construction } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description?: string
}

export default function PlaceholderPage({ title, description = 'This module is not implemented yet.' }: PlaceholderPageProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mb-4">
        <Construction className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
      <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">{description}</p>
    </div>
  )
}
