import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import DashboardPage from "./modules/dashboard/DashboardPage";
import ConsorcioDetailPage from "./modules/consorcio/ConsorcioDetailPage";
import { Suspense } from "react";

function App() {
  const basename =
    import.meta.env.BASE_URL === "/" ? "/" : import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <Router basename={basename}>
      <div className="min-h-screen bg-slate-50 font-sans antialiased">
        <Suspense fallback={<div className="p-8 text-center">Cargando aplicación...</div>}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/consorcio/:id" element={<ConsorcioDetailPage />} />
          </Routes>
        </Suspense>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
