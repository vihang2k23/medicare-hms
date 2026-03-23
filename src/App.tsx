import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import ThemeSync from './components/ThemeSync'
import AppToaster from './components/ui/AppToaster'

function App() {
  return (
    <>
      <ThemeSync />
      <AppToaster />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </>
  )
}

export default App
