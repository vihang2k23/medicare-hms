import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col app-surface-gradient">
      <Navbar />
      <div className="flex flex-1 min-h-0 relative">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden p-6 lg:p-8 xl:p-10">
          <div className="mx-auto max-w-[1680px] page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
