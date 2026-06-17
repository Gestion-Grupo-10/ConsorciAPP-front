import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { consorcioApi, unidadApi, gastoApi, pagoApi, mesCerradoApi } from "@/services/api";
import type { Consorcio } from "@/services/interfaces/IConsorcioService";
import type { Unidad, Gasto, Pago } from "@/services/interfaces/IDetailServices";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, Receipt, CreditCard, PieChart, Plus, Trash2, Calendar, LockIcon, CheckCircle2, Pencil, Download } from "lucide-react";
import Header from "@/components/shared/Header";
import NewUnidadDialog from "./components/NewUnidadDialog";
import NewGastoDialog from "./components/NewGastoDialog";
import NewPagoDialog from "./components/NewPagoDialog";
import CerrarMesDialog from "./components/CerrarMesDialog";
import ImportUnidadesFuncionales from "./components/ImportUnidadesFuncionales";
import EditMoraRateDialog from "./components/EditMoraRateDialog";
import { toast } from "sonner";
import { utils, writeFile } from 'xlsx';
import type { MoraRateEntry } from "@/services/interfaces/IConsorcioService";
import { getAppTodayIso } from "@/lib/appDate";

const fmt = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type MoraSegment = {
  startDay: number;
  endDay: number;
  tasa_mora: number;
};

const fmtRate = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
};

const formatDateKey = (value: Date) => value.toISOString().slice(0, 10);

const periodBounds = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(Date.UTC(year, (month || 1) - 1, 1));
  const end = new Date(Date.UTC(year, month || 1, 0));
  return { start, end };
};

const latestRateForDate = (rates: MoraRateEntry[] | undefined, dateKey: string, fallback: number) => {
  const sorted = [...(rates || [])].sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  const current = sorted.filter((entry) => entry.effective_from <= dateKey).at(-1);
  return current?.tasa_mora ?? fallback;
};

const buildMoraSegments = (rates: MoraRateEntry[] | undefined, period: string, fallback: number): MoraSegment[] => {
  const { start, end } = periodBounds(period);
  const sorted = [...(rates || [])].sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  const boundaries = [start];

  for (const entry of sorted) {
    const effective = parseDateKey(entry.effective_from);
    if (effective > start && effective <= end) {
      boundaries.push(effective);
    }
  }

  boundaries.sort((a, b) => a.getTime() - b.getTime());

  const segments: MoraSegment[] = [];
  for (let index = 0; index < boundaries.length; index += 1) {
    const segmentStart = boundaries[index];
    const nextBoundary = boundaries[index + 1] ?? new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1));
    const segmentEnd = new Date(nextBoundary);
    segmentEnd.setUTCDate(segmentEnd.getUTCDate() - 1);

    if (segmentStart > end) continue;

    const rate = latestRateForDate(sorted, formatDateKey(segmentStart), fallback);
    const startDay = segmentStart.getUTCDate();
    const endDay = Math.min(segmentEnd.getUTCDate(), end.getUTCDate());

    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      if (last.tasa_mora === rate && last.endDay + 1 === startDay) {
        last.endDay = endDay;
        continue;
      }
    }

    segments.push({ startDay, endDay, tasa_mora: rate });
  }

  return segments.length > 0 ? segments : [{ startDay: 1, endDay: end.getUTCDate(), tasa_mora: fallback }];
};

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
  const [isEditMoraDialogOpen, setIsEditMoraDialogOpen] = useState(false);
  
  const [selectedPeriod, setSelectedPeriod] = useState(getAppTodayIso().slice(0, 7)); // YYYY-MM
  const [isMesCerrado, setIsMesCerrado] = useState(false);
  const [lastBlockedPeriod, setLastBlockedPeriod] = useState("0000-00");

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [c, u, g, p, cerrado, lastBlocked] = await Promise.all([
        consorcioApi.getById(id),
        unidadApi.getByConsorcio(id),
        gastoApi.getByConsorcio(id),
        pagoApi.getByConsorcio(id),
        mesCerradoApi.isCerrado(id, selectedPeriod),
        pagoApi.getLastPeriodoBloqueado(id, selectedPeriod),
      ]);
      setConsorcio(c);
      setUnidades(u);
      setAllGastos(g);
      setAllPagos(p);
      setIsMesCerrado(cerrado);
      setLastBlockedPeriod(lastBlocked);
    } catch (error) {
      console.error("Error loading details:", error);
    } finally {
      setLoading(false);
    }
  }, [id, selectedPeriod]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, [loadData]);

  useEffect(() => {
    const syncSelectedPeriod = () => {
      setSelectedPeriod(getAppTodayIso().slice(0, 7));
    };

    window.addEventListener("consorciapp:app-date-change", syncSelectedPeriod);
    return () => window.removeEventListener("consorciapp:app-date-change", syncSelectedPeriod);
  }, []);

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
  const currentMoraRate = useMemo(() => {
    if (!consorcio) return 0;
    return latestRateForDate(consorcio.mora_rates, getAppTodayIso(), consorcio.tasa_mora ?? 0);
  }, [consorcio]);

  const selectedPeriodMoraSegments = useMemo(() => {
    if (!consorcio) return [];
    return buildMoraSegments(consorcio.mora_rates, selectedPeriod, consorcio.tasa_mora ?? 0);
  }, [consorcio, selectedPeriod]);

  // Settlement Calculation
  const settlementData = useMemo(() => {
    return unidades.map(u => {
      const coef = totalSuperficie > 0 ? u.superficie / totalSuperficie : 0;
      const partCommon = round2(totalCommon * coef);
      const partExtra = round2(totalExtra * coef);
      
      // Gastos particulares del periodo actual (incluyendo deudas trasladadas)
      const partParticular = round2(gastos
        .filter(g => g.tipo === 'particular' && g.unidad_id === u.id)
        .reduce((acc, g) => acc + g.monto, 0));
      
      // Saldo anterior: solo considera el rango abierto posterior al ultimo vencimiento.
      // Los periodos anteriores al ultimo vencido ya tienen sus deudas capturadas
      // como "Deuda trasladada" en el periodo siguiente, evitando doble conteo.
      const historicalGastos = allGastos.filter(g => {
        const p = g.periodo || g.fecha.slice(0, 7);
        return g.unidad_id === u.id && p > lastBlockedPeriod && p < selectedPeriod;
      });
      const historicalPagos = allPagos.filter(p =>
        p.unidad_id === u.id &&
        p.periodo > lastBlockedPeriod &&
        p.periodo < selectedPeriod &&
        p.tipo !== "transferencia_deuda"
      );
      
      const saldoAnterior = round2(historicalGastos.reduce((acc, g) => acc + g.monto, 0) - historicalPagos.reduce((acc, p) => acc + p.monto, 0));

      const partComision = round2(totalComision * coef);
      const subtotalUnidad = round2(partCommon + partExtra + partParticular + saldoAnterior + partComision);
      const totalPagado = round2(pagos
        .filter(p => p.id !== undefined && p.unidad_id === u.id)
        .reduce((acc, p) => acc + p.monto, 0));
      
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
        saldo: round2(subtotalUnidad - totalPagado)
      };
    });
  }, [unidades, totalCommon, totalExtra, totalSuperficie, gastos, pagos, allGastos, allPagos, selectedPeriod, lastBlockedPeriod, totalComision]);

  const totalSaldoAnterior = useMemo(() => settlementData.reduce((acc, row) => acc + row.saldoAnterior, 0), [settlementData]);
  const totalALiquidarGlobal = totalALiquidar + totalSaldoAnterior;

  const handleDeleteGasto = async (gId: string) => {
    if (!confirm("¿Está seguro de eliminar este gasto?")) return;
    await gastoApi.delete(gId);
    toast.success("Gasto eliminado");
    loadData();
  };

  const [periodoBloqueado, setPeriodoBloqueado] = useState(false);

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
      const tasaVigente = await consorcioApi.getMoraRateForPeriod(id, selectedPeriod);
      const result = await pagoApi.applyVencimientos({
        consorcioId: id,
        periodo: selectedPeriod,
        tasaMora: tasaVigente,
      });

      toast.success(
        `Vencimientos aplicados con tasa ${tasaVigente}%. Deuda: $${result.deudasTrasladadas.toFixed(2)} | Mora: $${result.moraGenerada.toFixed(2)}`
      );
      setPeriodoBloqueado(true);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron aplicar vencimientos");
    }
  };

  const handleExportExcel = () => {
    if (!consorcio) return;
    
    const data = settlementData.map(row => ({
      'Unidad': row.nro_piso,
      'Coeficiente %': (row.coef * 100).toFixed(2),
      'Gastos Comunes': row.partCommon,
      'Gastos Extraordinarios': row.partExtra,
      'Gastos Particulares': row.partParticular,
      'Comisión': row.partComision,
      'Total Unidad': row.totalUnidad,
      'Total Pagado': row.totalPagado,
      'Saldo': row.saldo
    }));

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Liquidación");

    // Fix column widths
    const maxWidths = Object.keys(data[0] || {}).map(key => ({ wch: key.length + 5 }));
    worksheet['!cols'] = maxWidths;

    writeFile(workbook, `Liquidacion_${consorcio.nombre.replace(/\s+/g, '_')}_${selectedPeriod}.xlsx`);
  };

  if (loading) return <div className="p-8 text-center">Cargando detalles...</div>;
  if (!consorcio) return <div className="p-8 text-center">Consorcio no encontrado</div>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <div className="print:hidden">
        <Header />
      </div>
      
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm print:relative print:shadow-none print:border-none">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="print:hidden">
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
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  max={getAppTodayIso().slice(0, 7)}
                  className="text-sm font-semibold bg-slate-100 border-none rounded px-2 py-1 focus:ring-0 print:hidden"
                />
                <span className="hidden print:block text-sm font-semibold">
                  {selectedPeriod}
                </span>
                {isMesCerrado && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600 px-2 py-1 rounded print:border print:border-red-200">
                    <LockIcon className="size-3" /> Cerrado
                  </span>
                )}
              </div>
              <div className="mt-2 max-w-[360px] text-right space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Mora en el período seleccionado
                </p>
                <div className="space-y-0.5 text-xs text-slate-600">
                  {selectedPeriodMoraSegments.map((segment) => (
                    <p key={`${segment.startDay}-${segment.endDay}-${segment.tasa_mora}`}>
                      Mora en los días {String(segment.startDay).padStart(2, "0")}-{String(segment.endDay).padStart(2, "0")} del período: {fmtRate(segment.tasa_mora)}%
                    </p>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-xs text-slate-500">Mora actual: {fmtRate(currentMoraRate)}%</span>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setIsEditMoraDialogOpen(true)}>
                    <Pencil className="mr-1 h-3 w-3" /> Editar
                  </Button>
                </div>
              </div>
            </div>

            {/* Boton contextual segun estado del periodo */}
            {periodoBloqueado ? (
              <Button variant="outline" disabled className="text-slate-400 cursor-not-allowed">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Período vencido
              </Button>
            ) : isMesCerrado ? (
              <Button variant="outline" onClick={handleAplicarVencimientos}>
                Aplicar vencimientos
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setIsCerrarMesDialogOpen(true)}>
                <LockIcon className="mr-2 h-4 w-4" />
                Cerrar mes
              </Button>
            )}

            <div className="text-right border-l pl-6">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total a Liquidar</p>
              <p className="text-lg font-bold text-blue-600">${fmt(totalALiquidar)}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto py-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 print:hidden">
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
                    <div className="text-2xl font-bold text-green-600">${fmt(totalRecaudado)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[10px] font-bold text-slate-500 uppercase">Pendiente Global</CardTitle>
                    <Calendar className="h-4 w-4 text-orange-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-orange-600">${fmt((totalALiquidarGlobal - totalRecaudado))}</div>
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
          <TabsList className="bg-white border p-1 h-auto w-full md:w-auto justify-start overflow-x-auto print:hidden">
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

          <TabsContent value="unidades" className="bg-white border rounded-xl p-6 shadow-sm min-h-[400px] print:hidden">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Listado de Unidades</h3>
                <div className="flex gap-2">
                  {id && <ImportUnidadesFuncionales consorcioId={id} onSuccess={loadData} />}
                  
                  <Button size="sm" onClick={() => setIsUnidadDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Nueva Unidad
                  </Button>
                </div>
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

          <TabsContent value="gastos" className="bg-white border rounded-xl p-6 shadow-sm min-h-[400px] print:hidden">
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
                        <TableCell className="text-right font-bold">${fmt(g.monto)}</TableCell>
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
          
          <TabsContent value="pagos" className="bg-white border rounded-xl p-6 shadow-sm min-h-[400px] print:hidden">
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
                        <TableCell className="text-right text-green-600 font-bold">${fmt(p.monto)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="reportes" className="bg-white border rounded-xl p-6 shadow-sm min-h-[400px] print:border-none print:shadow-none print:p-0">
             <div className="flex justify-between items-center mb-6 print:mb-4">
                <h3 className="text-lg font-semibold print:text-xl">Liquidación Mensual - {selectedPeriod}</h3>
                <div className="flex gap-2 print:hidden">
                  <Button variant="outline" size="sm" onClick={handleExportExcel}>
                    <Download className="mr-2 h-4 w-4" /> Exportar Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    Exportar PDF
                  </Button>
                </div>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 print:hidden">
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Saldo Anterior</p>
                  <p className="text-lg font-bold">${fmt(totalSaldoAnterior)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">G. Comunes</p>
                  <p className="text-lg font-bold">${fmt(totalCommon)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Extraordinarios</p>
                  <p className="text-lg font-bold">${fmt(totalExtra)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Particulares</p>
                  <p className="text-lg font-bold">${fmt(totalParticular)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border bg-blue-50/50">
                  <p className="text-[10px] text-blue-600 uppercase font-bold">Comisión ({consorcio?.comision_admin || 0}%)</p>
                  <p className="text-lg font-bold text-blue-700">${fmt(totalComision)}</p>
                </div>
             </div>

             <div className="overflow-x-auto print:overflow-visible">
               <Table className="print:text-[10px] print:w-full print:border">
                  <TableHeader>
                    <TableRow className="print:bg-slate-100">
                      <TableHead className="print:px-1 print:border-b print:text-black">Unidad</TableHead>
                      <TableHead className="text-right print:px-1 print:border-b print:text-black">Coef %</TableHead>
                      <TableHead className="text-right print:px-1 print:border-b print:text-black">Saldo Ant.</TableHead>
                      <TableHead className="text-right print:px-1 print:border-b print:text-black">G. Comunes</TableHead>
                      <TableHead className="text-right print:px-1 print:border-b print:text-black">G. Extra.</TableHead>
                      <TableHead className="text-right print:px-1 print:border-b print:text-black">G. Part.</TableHead>
                      <TableHead className="text-right print:px-1 print:border-b print:text-black">Comisión</TableHead>
                      <TableHead className="text-right font-bold print:px-1 print:border-b print:text-black">Total</TableHead>
                      <TableHead className="text-right print:px-1 print:border-b print:text-black">Pagado</TableHead>
                      <TableHead className="text-right print:px-1 print:border-b print:text-black">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlementData.map((row) => (
                     <TableRow key={row.id} className="print:border-b">
                       <TableCell className="font-bold whitespace-nowrap print:px-1">{row.nro_piso}</TableCell>
                       <TableCell className="text-right whitespace-nowrap print:px-1">{(row.coef * 100).toFixed(2)}%</TableCell>
                       <TableCell className="text-right whitespace-nowrap print:px-1">${fmt(row.saldoAnterior)}</TableCell>
                       <TableCell className="text-right whitespace-nowrap print:px-1">${fmt(row.partCommon)}</TableCell>
                       <TableCell className="text-right whitespace-nowrap print:px-1">${fmt(row.partExtra)}</TableCell>
                       <TableCell className="text-right whitespace-nowrap print:px-1">${fmt(row.partParticular)}</TableCell>
                       <TableCell className="text-right whitespace-nowrap print:px-1">${fmt(row.partComision)}</TableCell>
                       <TableCell className="text-right font-bold whitespace-nowrap print:px-1">${fmt(row.totalUnidad)}</TableCell>
                       <TableCell className="text-right text-green-600 font-medium whitespace-nowrap print:px-1">${fmt(row.totalPagado)}</TableCell>
                       <TableCell className={`text-right font-bold whitespace-nowrap print:px-1 ${row.saldo > 0 ? 'text-red-500' : 'text-slate-900'}`}>
                         ${fmt(row.saldo)}
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
              </Table>
             </div>
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
            <EditMoraRateDialog
              consorcio={consorcio}
              open={isEditMoraDialogOpen}
              onOpenChange={setIsEditMoraDialogOpen}
              onSuccess={loadData}
            />
          </>
        )}
      </main>
    </div>
  );
}
