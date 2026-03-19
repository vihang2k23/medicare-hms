import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import ThemeSync from './components/ThemeSync'

function App() {
  return (
    <>
      <ThemeSync />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </>
  )
}

export default App
