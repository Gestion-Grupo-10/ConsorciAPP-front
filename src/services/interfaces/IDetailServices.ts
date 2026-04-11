import type { Consorcio } from "./IConsorcioService";

export interface Unidad {
  id: string;
  consorcio_id: string;
  nro_piso: string;
  propietario: string;
  superficie: number;
  email: string;
  telefono: string;
}

export interface Gasto {
  id: string;
  consorcio_id: string;
  descripcion: string;
  monto: number;
  fecha: string; // ISO Date YYYY-MM-DD
  tipo: 'comun' | 'extraordinario' | 'particular';
  unidad_id?: string;
}

export interface Pago {
  id: string;
  consorcio_id: string;
  unidad_id: string;
  monto: number;
  fecha: string;
  periodo: string; // YYYY-MM
}

export interface ConsorcioDetail extends Consorcio {
  unidades: Unidad[];
  gastos: Gasto[];
  pagos: Pago[];
}

export interface IUnidadService {
  getByConsorcio(consorcioId: string): Promise<Unidad[]>;
  create(data: Omit<Unidad, 'id'>): Promise<void>;
}

export interface IGastoService {
  getByConsorcio(consorcioId: string, periodo?: string): Promise<Gasto[]>;
  create(data: Omit<Gasto, 'id'>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IPagoService {
  getByConsorcio(consorcioId: string, periodo?: string): Promise<Pago[]>;
  create(data: Omit<Pago, 'id'>): Promise<void>;
  delete(id: string): Promise<void>;
}
