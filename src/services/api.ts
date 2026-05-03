import { LocalConsorcioService } from "./sqlite/ConsorcioService";
import { LocalUnidadService, LocalGastoService, LocalPagoService, LocalMesCerradoService } from "./sqlite/DetailServices";

export const consorcioApi = new LocalConsorcioService();
export const unidadApi = new LocalUnidadService();
export const gastoApi = new LocalGastoService();
export const pagoApi = new LocalPagoService();
export const mesCerradoApi = new LocalMesCerradoService();
