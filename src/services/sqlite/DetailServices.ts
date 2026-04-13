import localforage from "localforage";
import type { Unidad, IUnidadService, Gasto, IGastoService, Pago, IPagoService } from "../interfaces/IDetailServices";

const UNIDADES_KEY = "unidades_data";
const GASTOS_KEY = "gastos_data";
const PAGOS_KEY = "pagos_data";

export class LocalUnidadService implements IUnidadService {
  async getByConsorcio(consorcioId: string): Promise<Unidad[]> {
    const all = await localforage.getItem<Unidad[]>(UNIDADES_KEY) || [];
    return all.filter(u => u.consorcio_id === consorcioId);
  }

  async create(data: Omit<Unidad, 'id'>): Promise<void> {
    const all = await localforage.getItem<Unidad[]>(UNIDADES_KEY) || [];
    const newUnidad = { ...data, id: crypto.randomUUID() };
    await localforage.setItem(UNIDADES_KEY, [...all, newUnidad]);
  }
}

export class LocalGastoService implements IGastoService {
  async getByConsorcio(consorcioId: string, periodo?: string): Promise<Gasto[]> {
    const all = await localforage.getItem<Gasto[]>(GASTOS_KEY) || [];
    let filtered = all.filter(g => g.consorcio_id === consorcioId);
    if (periodo) {
      filtered = filtered.filter(g => g.fecha.startsWith(periodo));
    }
    return filtered;
  }

  async create(data: Omit<Gasto, 'id'>): Promise<void> {
    const all = await localforage.getItem<Gasto[]>(GASTOS_KEY) || [];
    const newGasto = { ...data, id: crypto.randomUUID() };
    await localforage.setItem(GASTOS_KEY, [...all, newGasto]);
  }

  async delete(id: string): Promise<void> {
    const all = await localforage.getItem<Gasto[]>(GASTOS_KEY) || [];
    await localforage.setItem(GASTOS_KEY, all.filter(g => g.id !== id));
  }
}

export class LocalPagoService implements IPagoService {
  async getByConsorcio(consorcioId: string, periodo?: string): Promise<Pago[]> {
    const all = await localforage.getItem<Pago[]>(PAGOS_KEY) || [];
    let filtered = all.filter(p => p.consorcio_id === consorcioId);
    if (periodo) {
      filtered = filtered.filter(p => p.periodo === periodo);
    }
    return filtered;
  }

  async create(data: Omit<Pago, 'id'>): Promise<void> {
    const all = await localforage.getItem<Pago[]>(PAGOS_KEY) || [];
    const newPago = { ...data, id: crypto.randomUUID() };
    await localforage.setItem(PAGOS_KEY, [...all, newPago]);
  }

  async delete(id: string): Promise<void> {
    const all = await localforage.getItem<Pago[]>(PAGOS_KEY) || [];
    await localforage.setItem(PAGOS_KEY, all.filter(p => p.id !== id));
  }
}
