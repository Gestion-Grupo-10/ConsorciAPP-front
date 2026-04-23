import { consorcioApi, unidadApi, gastoApi, pagoApi } from "@/services/api";

export async function seedDemoData() {
  // Evitar duplicados: si ya existe alguno, no volver a crear
  const existentes = await consorcioApi.getAll();
  if (existentes.some((c: any) => c.nombre === "Consorcio Demo")) {
    console.log("ℹ️ Seed ya existente");
    return;
  }

  const consorcioId = crypto.randomUUID();
  const unidad1 = crypto.randomUUID();
  const unidad2 = crypto.randomUUID();

  await consorcioApi.create({
    nombre: "Consorcio Demo",
    direccion: "Calle Falsa 123",
    comision_admin: 10,
    tasa_mora: 10,
  });

  // Buscar el ID real creado (por si create genera otro id internamente)
  const all = await consorcioApi.getAll();
  const demo = all.find((c: any) => c.nombre === "Consorcio Demo");
  const cId = demo?.id ?? consorcioId;

  await unidadApi.create({
    id: unidad1,
    consorcio_id: cId,
    nro_piso: "1A",
    propietario: "Juan Pérez",
    superficie: 50,
    email: "juan@test.com",
    telefono: "111111",
  } as any);

  await unidadApi.create({
    id: unidad2,
    consorcio_id: cId,
    nro_piso: "2B",
    propietario: "Ana Gómez",
    superficie: 50,
    email: "ana@test.com",
    telefono: "222222",
  } as any);

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
    unidad_id: unidad1,
  });

  await pagoApi.create({
    consorcio_id: cId,
    unidad_id: unidad1,
    monto: 20000,
    fecha: "2026-02-20",
    periodo: "2026-02",
    tipo: "normal",
  });

  console.log("✅ Seed demo cargado");
}