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
  periodo?: string; // YYYY-MM
  tipo: "comun" | "extraordinario" | "particular";
  unidad_id?: string;
}

export interface Pago {
  id: string;
  consorcio_id: string;
  unidad_id: string;
  monto: number;
  fecha: string;
  periodo: string; // YYYY-MM
  tipo?: "normal" | "transferencia_deuda";
  detalle?: string;
  periodo_origen?: string;
}

export interface ApplyVencimientosInput {
  consorcioId: string;
  periodo: string; // YYYY-MM
  tasaMora?: number; // porcentaje (ej. 10 = 10%)
  diasGracia?: number; // default 10
}

export interface ApplyVencimientosResult {
  deudasTrasladadas: number;
  moraGenerada: number;
  unidadesAfectadas: number;
  periodoSiguiente: string;
}

export interface ConsorcioDetail extends Consorcio {
  unidades: Unidad[];
  gastos: Gasto[];
  pagos: Pago[];
}

export interface IUnidadService {
  getByConsorcio(consorcioId: string): Promise<Unidad[]>;
  create(data: Omit<Unidad, "id">): Promise<void>;
}

export interface IGastoService {
  getByConsorcio(consorcioId: string, periodo?: string): Promise<Gasto[]>;
  create(data: Omit<Gasto, "id">): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IPagoService {
  getByConsorcio(consorcioId: string, periodo?: string): Promise<Pago[]>;
  create(data: Omit<Pago, "id">): Promise<void>;
  delete(id: string): Promise<void>;

  isPeriodoBloqueado(consorcioId: string, periodo: string): Promise<boolean>;
  applyVencimientos(input: ApplyVencimientosInput): Promise<ApplyVencimientosResult>;
}

export interface MesCerrado {
  id: string;
  consorcio_id: string;
  periodo: string; // YYYY-MM
}

export interface IMesCerradoService {
  isCerrado(consorcioId: string, periodo: string): Promise<boolean>;
  cerrar(consorcioId: string, periodo: string): Promise<void>;
  abrir(consorcioId: string, periodo: string): Promise<void>;
}
