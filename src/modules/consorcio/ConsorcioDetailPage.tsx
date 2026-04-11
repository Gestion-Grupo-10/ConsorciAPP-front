import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { consorcioApi, unidadApi, gastoApi } from "@/services/api";
import type { Consorcio } from "@/services/interfaces/IConsorcioService";
import type { Unidad, Gasto } from "@/services/interfaces/IDetailServices";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, Receipt, CreditCard, PieChart, Plus } from "lucide-react";
import Header from "@/components/shared/Header";
import NewUnidadDialog from "./components/NewUnidadDialog";

export default function ConsorcioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [consorcio, setConsorcio] = useState<Consorcio | null>(null);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUnidadDialogOpen, setIsUnidadDialogOpen] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      const [c, u, g] = await Promise.all([
        consorcioApi.getById(id),
        unidadApi.getByConsorcio(id),
        gastoApi.getByConsorcio(id)
      ]);
      setConsorcio(c);
      setUnidades(u);
      setGastos(g);
    } catch (error) {
      console.error("Error loading details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Cargando detalles...</div>;
  if (!consorcio) return <div className="p-8 text-center">Consorcio no encontrado</div>;

  const totalGastos = gastos.reduce((acc, g) => acc + g.monto, 0);
  const totalSuperficie = unidades.reduce((acc, u) => acc + u.superficie, 0);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />
      
      {/* Sticky Building Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{consorcio.nombre}</h1>
              <p className="text-sm text-slate-500">{consorcio.direccion}</p>
            </div>
          </div>
          <div className="flex gap-4">
             <div className="text-right">
                <p className="text-xs text-slate-500 uppercase font-semibold">Gastos del Mes</p>
                <p className="text-lg font-bold text-blue-600">${totalGastos.toLocaleString()}</p>
             </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto py-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 uppercase">Unidades</CardTitle>
                    <Users className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{unidades.length}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 uppercase">Superficie Total</CardTitle>
                    <PieChart className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalSuperficie} m²</div>
                </CardContent>
            </Card>
        </div>

        <Tabs defaultValue="unidades" className="space-y-4">
          <TabsList className="bg-white border p-1 h-auto">
            <TabsTrigger value="unidades" className="data-[state=active]:bg-slate-100 py-2 px-4">
              <Users className="mr-2 h-4 w-4" /> Unidades
            </TabsTrigger>
            <TabsTrigger value="gastos" className="data-[state=active]:bg-slate-100 py-2 px-4">
              <Receipt className="mr-2 h-4 w-4" /> Gastos
            </TabsTrigger>
            <TabsTrigger value="pagos" className="data-[state=active]:bg-slate-100 py-2 px-4">
              <CreditCard className="mr-2 h-4 w-4" /> Pagos
            </TabsTrigger>
            <TabsTrigger value="reportes" className="data-[state=active]:bg-slate-100 py-2 px-4">
              <PieChart className="mr-2 h-4 w-4" /> Reportes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unidades" className="bg-white border rounded-xl p-6 shadow-sm min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Listado de Unidades</h3>
                <Button size="sm" onClick={() => setIsUnidadDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Nueva Unidad
                </Button>
            </div>
            
            {unidades.length === 0 ? (
                <div className="text-center py-20 text-slate-400 border rounded-lg border-dashed">
                  No hay unidades cargadas en este edificio
                </div>
            ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Piso/Depto</TableHead>
                      <TableHead>Propietario</TableHead>
                      <TableHead className="text-right">Superficie</TableHead>
                      <TableHead className="text-right">Participación %</TableHead>
                      <TableHead>Contacto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unidades.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.nro_piso}</TableCell>
                        <TableCell>{u.propietario}</TableCell>
                        <TableCell className="text-right">{u.superficie} m²</TableCell>
                        <TableCell className="text-right">
                          {totalSuperficie > 0 
                            ? ((u.superficie / totalSuperficie) * 100).toFixed(2) 
                            : '0.00'} %
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {u.email || u.telefono || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            )}
          </TabsContent>

          <TabsContent value="gastos" className="bg-white border rounded-xl p-6 shadow-sm min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Gestión de Gastos</h3>
                <Button size="sm">Cargar Gasto</Button>
            </div>
            {gastos.length === 0 ? (
                <div className="text-center py-20 text-slate-400 border rounded-lg border-dashed">
                  No hay gastos en este periodo
                </div>
            ) : null}
          </TabsContent>
          
          <TabsContent value="pagos" className="bg-white border rounded-xl p-6 shadow-sm min-h-[400px]">
             <div className="text-center py-20 text-slate-400">Módulo de Pagos (En desarrollo)</div>
          </TabsContent>

          <TabsContent value="reportes" className="bg-white border rounded-xl p-6 shadow-sm min-h-[400px]">
             <div className="text-center py-20 text-slate-400">Módulo de Reportes (En desarrollo)</div>
          </TabsContent>
        </Tabs>

        {id && (
          <NewUnidadDialog 
            consorcioId={id}
            open={isUnidadDialogOpen}
            onOpenChange={setIsUnidadDialogOpen}
            onSuccess={loadData}
          />
        )}
      </main>
    </div>
  );
}
