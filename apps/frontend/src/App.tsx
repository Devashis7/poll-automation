import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import RecordToggle from './components/audioRecoder'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <RecordToggle />
    </>
  )
}

export default App
