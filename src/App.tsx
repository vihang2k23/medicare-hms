import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import ThemeSync from './components/ThemeSync'
import AppToaster from './components/ui/AppToaster'
import ImportedDoctorsSync from './components/ImportedDoctorsSync'

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
