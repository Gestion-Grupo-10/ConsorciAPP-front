import { consorcioApi, unidadApi, gastoApi, pagoApi } from "@/services/api";

type ConsorcioLite = {
  id: string;
  nombre: string;
};

export async function seedDemoData() {
  if (!import.meta.env.DEV) return;

  const existentes = (await consorcioApi.getAll()) as ConsorcioLite[];
  if (existentes.some((c) => c.nombre === "Consorcio Demo")) {
    console.log("ℹ️ Seed ya existente");
    return;
  }

  const consorcio = await consorcioApi.create({
    nombre: "Consorcio Demo",
    direccion: "Calle Falsa 123",
    comision_admin: 10,
    tasa_mora: 10,
  });

  const cId = consorcio.id;

  const unidad1 = await unidadApi.create({
    consorcio_id: cId,
    nro_piso: "1A",
    propietario: "Juan Pérez",
    superficie: 50,
    email: "juan@test.com",
    telefono: "111111",
  });

  const unidad2 = await unidadApi.create({
    consorcio_id: cId,
    nro_piso: "2B",
    propietario: "Ana Gómez",
    superficie: 50,
    email: "ana@test.com",
    telefono: "222222",
  });

  await gastoApi.create({
    consorcio_id: cId,
    descripcion: "Luz espacios comunes",
    monto: 100000,
    fecha: "2026-02-10",
    periodo: "2026-02",
    tipo: "comun",
  });

  await gastoApi.create({
    consorcio_id: cId,
    descripcion: "Arreglo particular 1A",
    monto: 20000,
    fecha: "2026-02-15",
    periodo: "2026-02",
    tipo: "particular",
    unidad_id: unidad1.id,
  });

  await pagoApi.create({
    consorcio_id: cId,
    unidad_id: unidad1.id,
    monto: 20000,
    fecha: "2026-02-20",
    periodo: "2026-02",
    tipo: "normal",
  });

  console.log("✅ Seed demo cargado");
}