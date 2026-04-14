import { Construction } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description?: string
}

export default function PlaceholderPage({ title, description = 'Coming soon.' }: PlaceholderPageProps) {
  return (
    <div className="w-full max-w-lg mx-auto rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm px-5 py-8 sm:p-10 text-center shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-white mb-4">
        <Construction className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold text-slate-800 dark:text-white">{title}</h1>
      <p className="mt-2 text-slate-500 dark:text-white text-sm">{description}</p>
    </div>
  )
}
