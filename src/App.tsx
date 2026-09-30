import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './app/routes'
import './styles/index.css'

export default function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>
}
