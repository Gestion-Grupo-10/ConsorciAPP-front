import { LocalConsorcioService } from "./sqlite/ConsorcioService";
import { LocalUnidadService, LocalGastoService } from "./sqlite/DetailServices";

export const consorcioApi = new LocalConsorcioService();
export const unidadApi = new LocalUnidadService();
export const gastoApi = new LocalGastoService();
