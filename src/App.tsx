import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import DashboardPage from "./modules/dashboard/DashboardPage";
import { Suspense } from "react";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans antialiased">
        <Suspense fallback={<div className="p-8 text-center">Cargando aplicación...</div>}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
          </Routes>
        </Suspense>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
