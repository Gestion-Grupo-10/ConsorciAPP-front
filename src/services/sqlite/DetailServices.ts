import localforage from "localforage";
import { generateUUID } from "@/lib/utils";
import { getAppTodayIso } from "@/lib/appDate";
import type {
  ApplyVencimientosInput,
  ApplyVencimientosResult,
  Gasto,
  IGastoService,
  IMesCerradoService,
  IPagoService,
  IUnidadService,
  Pago,
  Unidad,
} from "../interfaces/IDetailServices";

const UNIDADES_KEY = "unidades_data";
const GASTOS_KEY = "gastos_data";
const PAGOS_KEY = "pagos_data";
const PERIODOS_BLOQUEADOS_KEY = "periodos_bloqueados_data"; // vencidos: bloquea pagos
const PERIODOS_CERRADOS_KEY = "periodos_cerrados_data";     // cerrados: bloquea gastos

type PeriodLocks = Record<string, Record<string, { bloqueado: boolean; fecha: string }>>;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const periodFromDate = (fecha: string) => (fecha || "").slice(0, 7);
const normalizePeriod = (p: string) => (p || "").trim().slice(0, 7);

function getNextPeriod(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m || 1) - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}


async function getLocks(): Promise<PeriodLocks> {
  return (await localforage.getItem<PeriodLocks>(PERIODOS_BLOQUEADOS_KEY)) || {};
}

async function setPeriodoBloqueado(consorcioId: string, periodo: string, bloqueado = true): Promise<void> {
  const locks = await getLocks();
  locks[consorcioId] = locks[consorcioId] || {};
  locks[consorcioId][periodo] = { bloqueado, fecha: new Date().toISOString() };
  await localforage.setItem(PERIODOS_BLOQUEADOS_KEY, locks);
}

async function getCerrados(): Promise<PeriodLocks> {
  return (await localforage.getItem<PeriodLocks>(PERIODOS_CERRADOS_KEY)) || {};
}

async function setPeriodoCerrado(consorcioId: string, periodo: string, cerrado = true): Promise<void> {
  const locks = await getCerrados();
  locks[consorcioId] = locks[consorcioId] || {};
  locks[consorcioId][periodo] = { bloqueado: cerrado, fecha: new Date().toISOString() };
  await localforage.setItem(PERIODOS_CERRADOS_KEY, locks);
}

export class LocalUnidadService implements IUnidadService {
  async getByConsorcio(consorcioId: string): Promise<Unidad[]> {
    const all = (await localforage.getItem<Unidad[]>(UNIDADES_KEY)) || [];
    return all.filter((u) => u.consorcio_id === consorcioId);
  }

  async create(data: Omit<Unidad, "id">): Promise<void> {
    const all = (await localforage.getItem<Unidad[]>(UNIDADES_KEY)) || [];
    const newUnidad = { ...data, id: generateUUID() };
    await localforage.setItem(UNIDADES_KEY, [...all, newUnidad]);
  }
}

export class LocalGastoService implements IGastoService {
  async getByConsorcio(consorcioId: string, periodo?: string): Promise<Gasto[]> {
    const all = (await localforage.getItem<Gasto[]>(GASTOS_KEY)) || [];
    let filtered = all.filter((g) => g.consorcio_id === consorcioId);

    if (periodo) {
      filtered = filtered.filter((g) => (g.periodo || periodFromDate(g.fecha)) === periodo);
    }

    return filtered;
  }

  async create(data: Omit<Gasto, "id">): Promise<void> {
    const all = (await localforage.getItem<Gasto[]>(GASTOS_KEY)) || [];
    const newGasto: Gasto = {
      ...data,
      id: generateUUID(),
      periodo: data.periodo || periodFromDate(data.fecha),
    };
    await localforage.setItem(GASTOS_KEY, [...all, newGasto]);
  }

  async delete(id: string): Promise<void> {
    const all = (await localforage.getItem<Gasto[]>(GASTOS_KEY)) || [];
    await localforage.setItem(
      GASTOS_KEY,
      all.filter((g) => g.id !== id)
    );
  }
}

export class LocalPagoService implements IPagoService {
  async getByConsorcio(consorcioId: string, periodo?: string): Promise<Pago[]> {
    const all = (await localforage.getItem<Pago[]>(PAGOS_KEY)) || [];
    let filtered = all.filter((p) => p.consorcio_id === consorcioId);

    if (periodo) {
      filtered = filtered.filter((p) => p.periodo === periodo);
    }

    return filtered;
  }

  async isPeriodoBloqueado(consorcioId: string, periodo: string): Promise<boolean> {
    const locks = await getLocks();
    const p = normalizePeriod(periodo);
    return !!locks[consorcioId]?.[p]?.bloqueado;
  }

  async getLastPeriodoBloqueado(consorcioId: string, beforePeriodo: string): Promise<string> {
    const locks = await getLocks();
    const locksConsorcio = locks[consorcioId] || {};
    const bloqueados = Object.keys(locksConsorcio)
      .filter(p => p < beforePeriodo && locksConsorcio[p].bloqueado)
      .sort();
    return bloqueados.length > 0 ? bloqueados[bloqueados.length - 1] : "0000-00";
  }

  async create(data: Omit<Pago, "id">): Promise<void> {
    const periodo = normalizePeriod(data.periodo);
    const consorcioId = data.consorcio_id;

    const blocked = await this.isPeriodoBloqueado(consorcioId, periodo);
    const tipo = data.tipo ?? "normal";

    if (blocked && tipo === "normal") {
      throw new Error(`El período ${periodo} está vencido y bloqueado para registrar pagos.`);
    }

    const all = (await localforage.getItem<Pago[]>(PAGOS_KEY)) || [];
    const newPago: Pago = {
      ...data,
      id: generateUUID(),
      periodo,
      tipo,
    };
    await localforage.setItem(PAGOS_KEY, [...all, newPago]);
  }

  async update(id: string, data: Omit<Pago, "id">): Promise<void> {
    const periodo = normalizePeriod(data.periodo);
    const consorcioId = data.consorcio_id;
    const blocked = await this.isPeriodoBloqueado(consorcioId, periodo);
    const tipo = data.tipo ?? "normal";

    if (blocked && tipo === "normal") {
      throw new Error(`El período ${periodo} está vencido y bloqueado para modificar pagos.`);
    }

    const all = (await localforage.getItem<Pago[]>(PAGOS_KEY)) || [];
    await localforage.setItem(
      PAGOS_KEY,
      all.map((p) =>
        p.id === id
          ? {
              ...p,
              ...data,
              id,
              periodo,
              tipo,
            }
          : p
      )
    );
  }

  async applyVencimientos(input: ApplyVencimientosInput): Promise<ApplyVencimientosResult> {
    const consorcioId = input.consorcioId;
    const periodo = normalizePeriod(input.periodo);
    const tasaMora = input.tasaMora ?? 0;

    if (await this.isPeriodoBloqueado(consorcioId, periodo)) {
      throw new Error(`El período ${periodo} ya fue vencido/aplicado.`);
    }

    const [unidades, gastosAll, pagosAll] = await Promise.all([
      (await localforage.getItem<Unidad[]>(UNIDADES_KEY)) || [],
      (await localforage.getItem<Gasto[]>(GASTOS_KEY)) || [],
      (await localforage.getItem<Pago[]>(PAGOS_KEY)) || [],
    ]);

    const unidadesConsorcio = unidades.filter((u) => u.consorcio_id === consorcioId);

    // Buscar el último periodo bloqueado para calcular el saldo desde entonces
    const locks = await getLocks();
    const locksConsorcio = locks[consorcioId] || {};
    const bloqueadosAnteriores = Object.keys(locksConsorcio)
      .filter((p) => p < periodo && locksConsorcio[p].bloqueado)
      .sort();
    const lastBlocked = bloqueadosAnteriores.length > 0
      ? bloqueadosAnteriores[bloqueadosAnteriores.length - 1]
      : "0000-00";

    // Obtener gastos y pagos en el rango (lastBlocked, periodo]
    const gastosRango = gastosAll.filter((g) => {
      const p = g.periodo || periodFromDate(g.fecha);
      return g.consorcio_id === consorcioId && p > lastBlocked && p <= periodo;
    });
    const pagosRango = pagosAll.filter((p) => {
      const per = p.periodo || periodFromDate(p.fecha);
      return p.consorcio_id === consorcioId && per > lastBlocked && per <= periodo;
    });

    const totalSuperficie = unidadesConsorcio.reduce((acc, u) => acc + (u.superficie || 0), 0);
    const totalComunExtra = gastosRango
      .filter((g) => g.tipo === "comun" || g.tipo === "extraordinario")
      .reduce((acc, g) => acc + g.monto, 0);

    const particularesPorUnidad = new Map<string, number>();
    for (const g of gastosRango.filter((x) => x.tipo === "particular" && x.unidad_id)) {
      const prev = particularesPorUnidad.get(g.unidad_id!) || 0;
      particularesPorUnidad.set(g.unidad_id!, prev + g.monto);
    }

    const pagosPorUnidad = new Map<string, number>();
    for (const p of pagosRango) {
      pagosPorUnidad.set(p.unidad_id, (pagosPorUnidad.get(p.unidad_id) || 0) + p.monto);
    }

    const periodoSiguiente = getNextPeriod(periodo);
    const fechaHoy = getAppTodayIso();
    const nuevosGastos: Gasto[] = [];
    const pagosFicticios: Pago[] = [];

    let deudasTrasladadas = 0;
    let moraGenerada = 0;
    let unidadesAfectadas = 0;

    for (const u of unidadesConsorcio) {
      const prorrata = totalSuperficie > 0 ? (u.superficie / totalSuperficie) * totalComunExtra : 0;
      const particular = particularesPorUnidad.get(u.id) || 0;
      const totalUnidad = prorrata + particular;
      const pagado = pagosPorUnidad.get(u.id) || 0;
      const deuda = round2(Math.max(0, totalUnidad - pagado));

      if (deuda <= 0) continue;

      unidadesAfectadas += 1;
      deudasTrasladadas = round2(deudasTrasladadas + deuda);

      nuevosGastos.push({
        id: generateUUID(),
        consorcio_id: consorcioId,
        descripcion: `Deuda trasladada del período ${periodo}`,
        monto: deuda,
        fecha: `${periodoSiguiente}-01`,
        periodo: periodoSiguiente,
        tipo: "particular",
        unidad_id: u.id,
      });

      const mora = round2(deuda * (tasaMora / 100));
      if (mora > 0) {
        moraGenerada = round2(moraGenerada + mora);
        nuevosGastos.push({
          id: generateUUID(),
          consorcio_id: consorcioId,
          descripcion: `Mora por vencimiento del período ${periodo} (${tasaMora}%)`,
          monto: mora,
          fecha: `${periodoSiguiente}-01`,
          periodo: periodoSiguiente,
          tipo: "particular",
          unidad_id: u.id,
        });
      }

      pagosFicticios.push({
        id: generateUUID(),
        consorcio_id: consorcioId,
        unidad_id: u.id,
        monto: 0,
        fecha: fechaHoy,
        periodo,
        tipo: "transferencia_deuda",
        detalle: `Deuda $${deuda.toFixed(2)} transferida a ${periodoSiguiente}`,
        periodo_origen: periodo,
      });
    }

    await localforage.setItem(GASTOS_KEY, [...gastosAll, ...nuevosGastos]);
    await localforage.setItem(PAGOS_KEY, [...pagosAll, ...pagosFicticios]);
    await setPeriodoBloqueado(consorcioId, periodo);

    return {
      deudasTrasladadas,
      moraGenerada,
      unidadesAfectadas,
      periodoSiguiente,
    };
  }

  async delete(id: string): Promise<void> {
    const all = (await localforage.getItem<Pago[]>(PAGOS_KEY)) || [];
    await localforage.setItem(
      PAGOS_KEY,
      all.filter((p) => p.id !== id)
    );
  }
}

export class LocalMesCerradoService implements IMesCerradoService {
  async isCerrado(consorcioId: string, periodo: string): Promise<boolean> {
    const locks = await getCerrados();
    const p = normalizePeriod(periodo);
    return !!locks[consorcioId]?.[p]?.bloqueado;
  }

  async cerrar(consorcioId: string, periodo: string): Promise<void> {
    await setPeriodoCerrado(consorcioId, normalizePeriod(periodo), true);
  }

  async abrir(consorcioId: string, periodo: string): Promise<void> {
    await setPeriodoCerrado(consorcioId, normalizePeriod(periodo), false);
  }
}
