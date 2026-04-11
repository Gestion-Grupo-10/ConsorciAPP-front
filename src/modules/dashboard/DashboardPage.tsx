import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { consorcioApi } from "@/services/api";
import type { Consorcio } from "@/services/interfaces/IConsorcioService";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building, AlertTriangle } from "lucide-react";
import Header from "@/components/shared/Header";
import NewConsorcioDialog from "./components/NewConsorcioDialog";

export default function DashboardPage() {
  const [consorcios, setConsorcios] = useState<Consorcio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const fetchConsorcios = async () => {
    try {
      setLoading(true);
      const data = await consorcioApi.getAll();
      setConsorcios(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching consorcios:", err);
      setError("Error al cargar los datos locales.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsorcios();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <Header />
        <main className="flex-1 container mx-auto flex items-center justify-center">
          <div className="text-center p-8 bg-red-50 rounded-xl border border-red-200 max-w-md">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-900 mb-2">Ups! Algo salió mal</h2>
            <p className="text-red-700 mb-6">{error}</p>
            <Button onClick={() => window.location.reload()} variant="destructive">
              Reintentar
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mis Consorcios</h1>
            <p className="text-slate-500">Gestioná tus edificios y liquidaciones.</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Consorcio
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-slate-200" />
                <CardContent className="h-32" />
              </Card>
            ))}
          </div>
        ) : consorcios.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-xl border-slate-200 bg-white">
            <Building className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium">No tenés consorcios cargados</h3>
            <p className="text-slate-500 mb-6">Empezá creando tu primer edificio.</p>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Crear Primer Consorcio
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {consorcios.map((consorcio) => (
              <Card 
                key={consorcio.id} 
                className="cursor-pointer hover:border-slate-400 transition-all"
                onClick={() => navigate(`/consorcio/${consorcio.id}`)}
              >
                <CardHeader>
                  <CardTitle>{consorcio.nombre}</CardTitle>
                  <CardDescription>{consorcio.direccion}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Comisión: {consorcio.comision_admin}%</span>
                    <span>Mora: {consorcio.tasa_mora}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        <NewConsorcioDialog 
          open={isDialogOpen} 
          onOpenChange={setIsDialogOpen} 
          onSuccess={fetchConsorcios} 
        />
      </main>
    </div>
  );
}
