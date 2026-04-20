import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import ScrollToTop from './shared/components/ScrollToTop'
import ThemeSync from './shared/components/ThemeSync'
import AppToaster from './shared/ui/AppToaster'
import ImportedDoctorsSync from './shared/components/ImportedDoctorsSync'

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
