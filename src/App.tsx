import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './router/AppRoutes'
import ScrollToTop from './components/ScrollToTop'
import ThemeSync from './components/ThemeSync'
import { AppToaster } from './components/common'
import ImportedDoctorsSync from './components/ImportedDoctorsSync'

// App renders the app UI.
function App() {
  return (
    <>
      <ImportedDoctorsSync />
      <ThemeSync />
      <AppToaster />
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
    </>
  )
}

export default App
