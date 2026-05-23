import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"
import { ToastProvider } from "@/components/ui"
import BottomNav from "@/components/layout/BottomNav"
import RequireAuth from "@/components/auth/RequireAuth"
import Dashboard from "@/pages/Dashboard"
import Train from "@/pages/Train"
// import Routines from "@/pages/Routines"  // PLAN FIJO DESACTIVADO — reactivable
// import Nutrition from "@/pages/Nutrition"
import Mobility from "@/pages/Mobility"
import Progress from "@/pages/Progress"
import Settings from "@/pages/Settings"
import ExerciseSearch from "@/pages/ExerciseSearch"
import RutinaBuilder from "@/pages/RutinaBuilder"
import MisRutinas from "@/pages/MisRutinas"
import { useEdgeSwipeBack } from "@/hooks/useEdgeSwipeBack"

function Layout() {
  useEdgeSwipeBack()
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="pb-24">
        <Outlet/>
      </div>
      <BottomNav/>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <RequireAuth>
          <Routes>
            <Route element={<Layout/>}>
              <Route index element={<Dashboard/>}/>
              {/* <Route path="/rutinas" element={<Routines/>}/>  PLAN FIJO DESACTIVADO — reactivable */}
              <Route path="/entrenar"  element={<Train/>}/>
              {/* <Route path="/nutricion" element={<Nutrition/>}/> */}
              <Route path="/progreso"  element={<Progress/>}/>
              <Route path="/movilidad" element={<Mobility/>}/>
              <Route path="/ajustes"   element={<Settings/>}/>
              <Route path="/buscar"              element={<ExerciseSearch/>}/>
              <Route path="/mis-rutinas"         element={<MisRutinas/>}/>
              <Route path="/rutinas/nueva"       element={<RutinaBuilder/>}/>
              <Route path="/rutinas/:id/editar"  element={<RutinaBuilder/>}/>
              <Route path="*"          element={<Navigate to="/" replace/>}/>
            </Route>
          </Routes>
        </RequireAuth>
      </ToastProvider>
    </BrowserRouter>
  )
}
