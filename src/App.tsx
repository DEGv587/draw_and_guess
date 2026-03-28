import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Room from './pages/Room'
import Result from './pages/Result'
import Manage from './pages/Manage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={<Room />} />
      <Route path="/result" element={<Result />} />
      <Route path="/manage" element={<Manage />} />
    </Routes>
  )
}
