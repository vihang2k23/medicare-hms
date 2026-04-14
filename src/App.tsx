import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import ThemeSync from './shared/components/ThemeSync'
import AppToaster from './shared/ui/AppToaster'
import ImportedDoctorsSync from './shared/components/ImportedDoctorsSync'

function App() {
  return (
    <>
      <ImportedDoctorsSync />
      <ThemeSync />
      <AppToaster />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </>
  )
}

export default App
