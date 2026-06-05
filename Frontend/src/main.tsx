import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

// Force the stable light theme in production for now.
document.documentElement.dataset.theme = 'light'
document.documentElement.style.colorScheme = 'light'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
