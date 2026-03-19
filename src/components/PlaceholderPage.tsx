interface PlaceholderPageProps {
  title: string
  description?: string
}

export default function PlaceholderPage({ title, description = 'This module is not implemented yet.' }: PlaceholderPageProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
      <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">{description}</p>
    </div>
  )
}
