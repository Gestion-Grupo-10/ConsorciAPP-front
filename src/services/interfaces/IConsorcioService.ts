export interface Consorcio {
  id: string;
  nombre: string;
  direccion: string;
  comision_admin: number;
  tasa_mora: number;
  mora_rates?: MoraRateEntry[];
}

export interface MoraRateEntry {
  tasa_mora: number;
  effective_from: string; // YYYY-MM-DD
  created_at: string; // ISO datetime
}

export type MoraVigenciaMode = "next_period" | "current_period" | "particular_date";

export interface UpdateMoraRateInput {
  tasa_mora: number;
  vigencia_mode: MoraVigenciaMode;
  particular_date?: string; // YYYY-MM-DD, required for particular_date mode
}

export interface NewConsorcio {
  nombre: string;
  direccion: string;
  comision_admin: number;
  tasa_mora: number;
}

export interface IConsorcioService {
  getAll(): Promise<Consorcio[]>;
  getById(id: string): Promise<Consorcio | null>;
  create(data: NewConsorcio): Promise<void>;
  update(id: string, data: Partial<NewConsorcio>): Promise<void>;
  updateMoraRate(id: string, data: UpdateMoraRateInput): Promise<void>;
  getMoraRateForPeriod(id: string, period: string): Promise<number>;
  delete(id: string): Promise<void>;
}
