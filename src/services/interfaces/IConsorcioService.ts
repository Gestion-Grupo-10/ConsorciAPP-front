export interface Consorcio {
  id: string;
  nombre: string;
  direccion: string;
  comision_admin: number;
  tasa_mora: number;
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
  delete(id: string): Promise<void>;
}
