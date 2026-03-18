import { Link } from 'react-router-dom'

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-gray-800 text-white p-4">
      <nav className="flex flex-col gap-2">
        <Link to="/" className="px-3 py-2 rounded hover:bg-gray-700">
          Dashboard
        </Link>
      </nav>
    </aside>
  )
}
