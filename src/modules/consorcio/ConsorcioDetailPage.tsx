import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { consorcioApi, unidadApi, gastoApi, pagoApi, mesCerradoApi } from "@/services/api";
import type { Consorcio } from "@/services/interfaces/IConsorcioService";
import type { Unidad, Gasto, Pago } from "@/services/interfaces/IDetailServices";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, Receipt, CreditCard, PieChart, Plus, Trash2, Calendar, LockIcon } from "lucide-react";
import Header from "@/components/shared/Header";
import NewUnidadDialog from "./components/NewUnidadDialog";
import NewGastoDialog from "./components/NewGastoDialog";
import NewPagoDialog from "./components/NewPagoDialog";
import CerrarMesDialog from "./components/CerrarMesDialog";
import { toast } from "sonner";

export default function ConsorcioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [consorcio, setConsorcio] = useState<Consorcio | null>(null);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [allGastos, setAllGastos] = useState<Gasto[]>([]);
  const [allPagos, setAllPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isUnidadDialogOpen, setIsUnidadDialogOpen] = useState(false);
  const [isGastoDialogOpen, setIsGastoDialogOpen] = useState(false);
  const [isPagoDialogOpen, setIsPagoDialogOpen] = useState(false);
  const [isCerrarMesDialogOpen, setIsCerrarMesDialogOpen] = useState(false);
  
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isMesCerrado, setIsMesCerrado] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      const [c, u, g, p, cerrado] = await Promise.all([
        consorcioApi.getById(id),
        unidadApi.getByConsorcio(id),
        gastoApi.getByConsorcio(id), // Fetch all
        pagoApi.getByConsorcio(id),   // Fetch all
        mesCerradoApi.isCerrado(id, selectedPeriod)
      ]);
      setConsorcio(c);
      setUnidades(u);
      setAllGastos(g);
      setAllPagos(p);
      setIsMesCerrado(cerrado);
    } catch (error) {
      console.error("Error loading details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, selectedPeriod]);

  const totalSuperficie = useMemo(() => unidades.reduce((acc, u) => acc + u.superficie, 0), [unidades]);
  
  const gastos = useMemo(() => 
    allGastos.filter(g => (g.periodo || g.fecha.slice(0, 7)) === selectedPeriod), 
  [allGastos, selectedPeriod]);

  const pagos = useMemo(() => 
    allPagos.filter(p => p.periodo === selectedPeriod), 
  [allPagos, selectedPeriod]);

  const commonExpenses = useMemo(() => gastos.filter(g => g.tipo === 'comun'), [gastos]);
  const extraExpenses = useMemo(() => gastos.filter(g => g.tipo === 'extraordinario'), [gastos]);
  
  const totalCommon = useMemo(() => commonExpenses.reduce((acc, g) => acc + g.monto, 0), [commonExpenses]);
  const totalExtra = useMemo(() => extraExpenses.reduce((acc, g) => acc + g.monto, 0), [extraExpenses]);
  const totalParticular = useMemo(() => gastos.filter(g => g.tipo === 'particular').reduce((acc, g) => acc + g.monto, 0), [gastos]);
  
  const baseGastos = totalCommon + totalExtra + totalParticular;
  const totalComision = baseGastos * ((consorcio?.comision_admin || 0) / 100);
  const totalALiquidar = baseGastos + totalComision;

  const totalRecaudado = useMemo(() => pagos.reduce((acc, p) => acc + p.monto, 0), [pagos]);

  // Settlement Calculation
  const settlementData = useMemo(() => {
    return unidades.map(u => {
      const coef = totalSuperficie > 0 ? u.superficie / totalSuperficie : 0;
      const partCommon = totalCommon * coef;
      const partExtra = totalExtra * coef;
      
      // Gastos particulares del periodo (excluyendo deudas trasladadas para no duplicar)
      const partParticular = gastos
        .filter(g => g.tipo === 'particular' && g.unidad_id === u.id && !g.descripcion.startsWith("Deuda trasladada"))
        .reduce((acc, g) => acc + g.monto, 0);
      
      // Saldo anterior histórico (todas las deudas previas menos todos los pagos previos)
      const historicalGastos = allGastos.filter(g => {
        const p = g.periodo || g.fecha.slice(0, 7);
        return g.unidad_id === u.id && p < selectedPeriod && !g.descripcion.startsWith("Deuda trasladada");
      });
      const historicalPagos = allPagos.filter(p => p.unidad_id === u.id && p.periodo < selectedPeriod && p.tipo !== "transferencia_deuda");
      
      const saldoAnterior = historicalGastos.reduce((acc, g) => acc + g.monto, 0) - historicalPagos.reduce((acc, p) => acc + p.monto, 0);

      const partComision = totalComision * coef;
      const subtotalUnidad = partCommon + partExtra + partParticular + saldoAnterior + partComision;
      const totalPagado = pagos
        .filter(p => p.id !== undefined && p.unidad_id === u.id)
        .reduce((acc, p) => acc + p.monto, 0);
      
      return {
        ...u,
        coef,
        partCommon,
        partExtra,
        partComision,
        partParticular,
        saldoAnterior,
        totalUnidad: subtotalUnidad,
        totalPagado,
        saldo: subtotalUnidad - totalPagado
      };
    });
  }, [unidades, totalCommon, totalExtra, totalSuperficie, gastos, pagos, allGastos, allPagos, selectedPeriod]);

  const totalSaldoAnterior = useMemo(() => settlementData.reduce((acc, row) => acc + row.saldoAnterior, 0), [settlementData]);
  const totalALiquidarGlobal = totalALiquidar + totalSaldoAnterior;

  const handleDeleteGasto = async (gId: string) => {
    if (!confirm("¿Está seguro de eliminar este gasto?")) return;
    await gastoApi.delete(gId);
    toast.success("Gasto eliminado");
    loadData();
  };

  const [periodoBloqueado, setPeriodoBloqueado] = useState(false);
  const diasGracia = 10;

  const isPeriodoVencido = useMemo(() => {
    const [y, m] = selectedPeriod.split("-").map(Number);
    const venc = new Date(y, (m || 1), diasGracia); // mes siguiente, día gracia
    return new Date() >= venc;
  }, [selectedPeriod]);

  useEffect(() => {
    if (!id) return;
    pagoApi
      .isPeriodoBloqueado(id, selectedPeriod)
      .then(setPeriodoBloqueado)
      .catch(() => setPeriodoBloqueado(false));
  }, [id, selectedPeriod]);

  const handleAplicarVencimientos = async () => {
    if (!id || !consorcio) return;
    try {
      const result = await pagoApi.applyVencimientos({
        consorcioId: id,
        periodo: selectedPeriod,
        tasaMora: consorcio.tasa_mora ?? 0,
        diasGracia,
      });

      toast.success(
        `Vencimientos aplicados. Deuda: $${result.deudasTrasladadas.toFixed(2)} | Mora: $${result.moraGenerada.toFixed(2)}`
      );
      setPeriodoBloqueado(true);
      await loadData();
    } catch (e: any) {
      toast.error(e?.message || "No se pudieron aplicar vencimientos");
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando detalles...</div>;
  if (!consorcio) return <div className="p-8 text-center">Consorcio no encontrado</div>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />
      
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
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Periodo</p>
              <input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-sm font-semibold bg-slate-100 border-none rounded px-2 py-1 focus:ring-0"
              />
            </div>

            <Button
              variant="outline"
              onClick={handleAplicarVencimientos}
              disabled={!isPeriodoVencido || periodoBloqueado}
            >
              Aplicar vencimientos
            </Button>

            <div className="text-right border-l pl-6">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total a Liquidar</p>
              <p className="text-lg font-bold text-blue-600">${totalALiquidar.toLocaleString()}</p>
              {periodoBloqueado && <p className="text-xs text-amber-600">Período bloqueado</p>}
              {!isPeriodoVencido && <p className="text-xs text-slate-500">Aún en días de gracia</p>}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto py-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[10px] font-bold text-slate-500 uppercase">Unidades</CardTitle>
                    <Users className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{unidades.length}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[10px] font-bold text-slate-500 uppercase">Recaudado</CardTitle>
                    <CreditCard className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">${totalRecaudado.toLocaleString()}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[10px] font-bold text-slate-500 uppercase">Pendiente Global</CardTitle>
                    <Calendar className="h-4 w-4 text-orange-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-orange-600">${(totalALiquidarGlobal - totalRecaudado).toLocaleString()}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[10px] font-bold text-slate-500 uppercase">Superficie</CardTitle>
                    <PieChart className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalSuperficie} m²</div>
                </CardContent>
            </Card>
        </div>

        <Tabs defaultValue="unidades" className="space-y-4">
          <TabsList className="bg-white border p-1 h-auto w-full md:w-auto justify-start overflow-x-auto">
            <TabsTrigger value="unidades" className="py-2 px-4">
              <Users className="mr-2 h-4 w-4" /> Unidades
            </TabsTrigger>
            <TabsTrigger value="gastos" className="py-2 px-4">
              <Receipt className="mr-2 h-4 w-4" /> Gastos
            </TabsTrigger>
            <TabsTrigger value="pagos" className="py-2 px-4">
              <CreditCard className="mr-2 h-4 w-4" /> Pagos
            </TabsTrigger>
            <TabsTrigger value="reportes" className="py-2 px-4">
              <PieChart className="mr-2 h-4 w-4" /> Liquidación
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
                <div className="text-center py-20 text-slate-400 border rounded-lg border-dashed">No hay unidades cargadas</div>
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
                          {totalSuperficie > 0 ? ((u.superficie / totalSuperficie) * 100).toFixed(2) : '0.00'} %
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{u.email || u.telefono || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            )}
          </TabsContent>

          <TabsContent value="gastos" className="bg-white border rounded-xl p-6 shadow-sm min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Gastos de {selectedPeriod}</h3>
                <Button size="sm" onClick={() => setIsGastoDialogOpen(true)} disabled={isMesCerrado}>
                  <Plus className="mr-2 h-4 w-4" /> Cargar Gasto
                </Button>
            </div>
            {isMesCerrado && (
              <div className="flex items-center gap-2 mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                <LockIcon className="size-4 shrink-0" />
                Este mes está cerrado. No se pueden agregar ni eliminar gastos.
              </div>
            )}
            {gastos.length === 0 ? (
                <div className="text-center py-20 text-slate-400 border rounded-lg border-dashed">No hay gastos en este periodo</div>
            ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      {!isMesCerrado && <TableHead className="text-right">Acción</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gastos.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell>{g.fecha}</TableCell>
                        <TableCell className="font-medium">
                          {g.descripcion}
                          {g.tipo === 'particular' && (
                            <span className="ml-2 text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                              Unidad: {unidades.find(u => u.id === g.unidad_id)?.nro_piso}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{g.tipo}</TableCell>
                        <TableCell className="text-right font-bold">${g.monto.toLocaleString()}</TableCell>
                        {!isMesCerrado && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteGasto(g.id)}>
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            )}
          </TabsContent>
          
          <TabsContent value="pagos" className="bg-white border rounded-xl p-6 shadow-sm min-h-[400px]">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Pagos de {selectedPeriod}</h3>
                <Button size="sm" onClick={() => setIsPagoDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Registrar Pago
                </Button>
            </div>
            {pagos.length === 0 ? (
                <div className="text-center py-20 text-slate-400 border rounded-lg border-dashed">No hay pagos registrados</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Propietario</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos.map((p) => {
                    const u = unidades.find(un => un.id === p.unidad_id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{p.fecha}</TableCell>
                        <TableCell className="font-bold">{u?.nro_piso}</TableCell>
                        <TableCell>{u?.propietario}</TableCell>
                        <TableCell className="text-right text-green-600 font-bold">${p.monto.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="reportes" className="bg-white border rounded-xl p-6 shadow-sm min-h-[400px]">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Liquidación Mensual - {selectedPeriod}</h3>
                <Button variant="outline" size="sm" onClick={() => window.print()}>Exportar PDF</Button>
             </div>
             
             <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Saldo Anterior</p>
                  <p className="text-lg font-bold">${totalSaldoAnterior.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">G. Comunes</p>
                  <p className="text-lg font-bold">${totalCommon.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Extraordinarios</p>
                  <p className="text-lg font-bold">${totalExtra.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Particulares</p>
                  <p className="text-lg font-bold">${totalParticular.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border bg-blue-50/50">
                  <p className="text-[10px] text-blue-600 uppercase font-bold">Comisión ({consorcio?.comision_admin || 0}%)</p>
                  <p className="text-lg font-bold text-blue-700">${totalComision.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
             </div>

             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unidad</TableHead>
                    <TableHead className="text-right">Coef %</TableHead>
                    <TableHead className="text-right">Saldo Ant.</TableHead>
                    <TableHead className="text-right">G. Comunes</TableHead>
                    <TableHead className="text-right">G. Extra.</TableHead>
                    <TableHead className="text-right">G. Part.</TableHead>
                    <TableHead className="text-right font-bold">Total</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlementData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-bold">{row.nro_piso}</TableCell>
                      <TableCell className="text-right">{(row.coef * 100).toFixed(2)}%</TableCell>
                      <TableCell className="text-right">${row.saldoAnterior.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">${row.partCommon.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">${row.partExtra.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">${row.partParticular.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-bold">${row.totalUnidad.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">${row.totalPagado.toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-bold ${row.saldo > 0 ? 'text-red-500' : 'text-slate-900'}`}>
                        ${row.saldo.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
             </Table>
          </TabsContent>
        </Tabs>

        {id && (
          <>
            <NewUnidadDialog consorcioId={id} open={isUnidadDialogOpen} onOpenChange={setIsUnidadDialogOpen} onSuccess={loadData} />
            <NewGastoDialog consorcioId={id} unidades={unidades} open={isGastoDialogOpen} onOpenChange={setIsGastoDialogOpen} onSuccess={loadData} />
            <NewPagoDialog consorcioId={id} unidades={unidades} open={isPagoDialogOpen} onOpenChange={setIsPagoDialogOpen} onSuccess={loadData} />
            <CerrarMesDialog
              consorcioId={id}
              periodo={selectedPeriod}
              isCerrado={isMesCerrado}
              open={isCerrarMesDialogOpen}
              onOpenChange={setIsCerrarMesDialogOpen}
              onSuccess={loadData}
            />
          </>
        )}
      </main>
    </div>
  );
}
