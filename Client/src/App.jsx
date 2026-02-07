import Home from './Pages/Home'
import {Route, Routes} from 'react-router-dom'
import Login from './Pages/Login'
import Signup from './Pages/Signup'
import Main from './Pages/Main'
import Room from './Pages/Room'
import ProtectedRoute from './components/ProtectedRoute'
function App() {
  return (
    <>
     <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/login' element={<Login/>}/>
        <Route path='/signup' element={<Signup/>}/>
        <Route path="/main/:useId" element={<ProtectedRoute><Main/></ProtectedRoute>}/>
        <Route path="/room/:useId/:id" element={<ProtectedRoute><Room/></ProtectedRoute>}/>
     </Routes>
    </>
  )
}

export default App
