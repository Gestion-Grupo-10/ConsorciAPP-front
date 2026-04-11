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
  fecha: string;
  tipo: 'comun' | 'particular';
  unidad_id?: string;
}

export interface Pago {
  id: string;
  unidad_id: string;
  monto: number;
  fecha: string;
  periodo: string;
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
}
