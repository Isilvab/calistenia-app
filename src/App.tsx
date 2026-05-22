import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"
import { ToastProvider } from "@/components/ui"
import BottomNav from "@/components/layout/BottomNav"
import Dashboard from "@/pages/Dashboard"
import Train from "@/pages/Train"
import Routines from "@/pages/Routines"
import Nutrition from "@/pages/Nutrition"
import Mobility from "@/pages/Mobility"
import Progress from "@/pages/Progress"
import Settings from "@/pages/Settings"

function Layout() {
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
        <Routes>
          <Route element={<Layout/>}>
            <Route index element={<Dashboard/>}/>
            <Route path="/rutinas"   element={<Routines/>}/>
            <Route path="/entrenar"  element={<Train/>}/>
            <Route path="/nutricion" element={<Nutrition/>}/>
            <Route path="/progreso"  element={<Progress/>}/>
            <Route path="/movilidad" element={<Mobility/>}/>
            <Route path="/ajustes"   element={<Settings/>}/>
            <Route path="*"          element={<Navigate to="/" replace/>}/>
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
