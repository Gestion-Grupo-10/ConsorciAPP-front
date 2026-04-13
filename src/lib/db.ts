import initSqlJs from "sql.js";
import type { Database } from "sql.js";
import localforage from "localforage";

let dbInstance: Database | null = null;

const DB_KEY = "consorcio_db";

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  try {
    const SQL = await initSqlJs({
      // In Vite, files in public/ are served at the root
      locateFile: (file) => {
        const path = `/${file}`;
        console.log(`[DB] Tentative WASM path: ${path}`);
        return path;
      },
    });

    const savedDb: ArrayBuffer | null = await localforage.getItem(DB_KEY);

    if (savedDb) {
      console.log("[DB] Loading existing database from localforage");
      dbInstance = new SQL.Database(new Uint8Array(savedDb));
    } else {
      console.log("[DB] Creating new database");
      dbInstance = new SQL.Database();
      initSchema(dbInstance);
      await saveDb();
    }

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
        tipo TEXT,
        unidad_id TEXT,
        FOREIGN KEY(consorcio_id) REFERENCES consorcios(id)
    );

    CREATE TABLE IF NOT EXISTS pagos (
        id TEXT PRIMARY KEY,
        unidad_id TEXT,
        monto REAL,
        fecha TEXT,
        periodo TEXT,
        FOREIGN KEY(unidad_id) REFERENCES unidades(id)
    );
  `);
}

export async function saveDb() {
  if (!dbInstance) return;
  const data = dbInstance.export();
  await localforage.setItem(DB_KEY, data);
}
