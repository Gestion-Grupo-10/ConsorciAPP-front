import initSqlJs, { type Database } from "sql.js";
import localforage from "localforage";

let dbInstance: Database | null = null;
const DB_KEY = "consorcio_db";

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  try {
    const SQL = await initSqlJs({
      locateFile: (file) => `/${file}`,
    });

    const savedDb: ArrayBuffer | null = await localforage.getItem(DB_KEY);

    if (savedDb) {
      dbInstance = new SQL.Database(new Uint8Array(savedDb));
    } else {
      dbInstance = new SQL.Database();
    }

    initSchema(dbInstance);
    return dbInstance;
  } catch (error) {
    console.error("[DB] Initialization error:", error);
    throw error;
  }
}

export function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS consorcios (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      direccion TEXT,
      comision_admin REAL DEFAULT 0,
      tasa_mora REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS unidades (
      id TEXT PRIMARY KEY,
      consorcio_id TEXT,
      nro_piso TEXT,
      propietario TEXT,
      superficie REAL,
      email TEXT,
      telefono TEXT,
      FOREIGN KEY(consorcio_id) REFERENCES consorcios(id)
    );

    CREATE TABLE IF NOT EXISTS gastos (
      id TEXT PRIMARY KEY,
      consorcio_id TEXT,
      descripcion TEXT,
      monto REAL,
      fecha TEXT,
      periodo TEXT,
      tipo TEXT,
      unidad_id TEXT,
      FOREIGN KEY(consorcio_id) REFERENCES consorcios(id)
    );

    CREATE TABLE IF NOT EXISTS pagos (
      id TEXT PRIMARY KEY,
      consorcio_id TEXT,
      unidad_id TEXT,
      monto REAL,
      fecha TEXT,
      periodo TEXT,
      tipo TEXT DEFAULT 'normal',
      detalle TEXT,
      periodo_origen TEXT,
      FOREIGN KEY(unidad_id) REFERENCES unidades(id)
    );

    CREATE TABLE IF NOT EXISTS periodos_bloqueados (
      id TEXT PRIMARY KEY,
      consorcio_id TEXT NOT NULL,
      periodo TEXT NOT NULL,
      bloqueado INTEGER NOT NULL DEFAULT 1,
      fecha_aplicacion TEXT NOT NULL
    );
  `);
}

export async function saveDb() {
  if (!dbInstance) return;
  const data = dbInstance.export();
  await localforage.setItem(DB_KEY, data);
}
