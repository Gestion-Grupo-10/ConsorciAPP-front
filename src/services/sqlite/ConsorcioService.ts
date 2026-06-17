import localforage from "localforage";
import type {
  Consorcio,
  IConsorcioService,
  MoraRateEntry,
  NewConsorcio,
  UpdateMoraRateInput,
} from "../interfaces/IConsorcioService";
import { generateUUID } from "@/lib/utils";
import { getAppToday, getAppTodayIso } from "@/lib/appDate";

const STORAGE_KEY = "consorcios_data";

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function firstDayOfCurrentMonth(baseDate: Date): string {
  return `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, "0")}-01`;
}

function firstDayOfNextMonth(baseDate: Date): string {
  const next = new Date(baseDate);
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
}

function sortRates(entries: MoraRateEntry[]): MoraRateEntry[] {
  return [...entries].sort((a, b) => a.effective_from.localeCompare(b.effective_from));
}

function getRateForDate(consorcio: Consorcio, date: string): number {
  const history = sortRates(consorcio.mora_rates || []);
  const current = history.filter((entry) => entry.effective_from <= date).at(-1);
  if (current) return current.tasa_mora;
  return consorcio.tasa_mora ?? 0;
}

function normalizeConsorcio(raw: Consorcio): Consorcio {
  const history = raw.mora_rates || [];
  if (history.length > 0) {
    const todayRate = getRateForDate(raw, getAppTodayIso());
    return {
      ...raw,
      tasa_mora: todayRate,
      mora_rates: sortRates(history),
    };
  }

    const seedEntry: MoraRateEntry = {
    tasa_mora: raw.tasa_mora ?? 0,
    effective_from: "1970-01-01",
      created_at: getAppToday().toISOString(),
  };

  return {
    ...raw,
    mora_rates: [seedEntry],
  };
}

export class LocalConsorcioService implements IConsorcioService {
  private async getStore(): Promise<Consorcio[]> {
    const all = (await localforage.getItem<Consorcio[]>(STORAGE_KEY)) || [];
    return all.map(normalizeConsorcio);
  }

  private async saveStore(data: Consorcio[]): Promise<void> {
    await localforage.setItem(STORAGE_KEY, data);
  }

  async getAll(): Promise<Consorcio[]> {
    return await this.getStore();
  }

  async getById(id: string): Promise<Consorcio | null> {
    const store = await this.getStore();
    return store.find((c) => c.id === id) || null;
  }

  async create(data: NewConsorcio): Promise<void> {
    const store = await this.getStore();
    const now = getAppToday();
    const newConsorcio: Consorcio = {
      ...data,
      id: generateUUID(),
      mora_rates: [
        {
          tasa_mora: data.tasa_mora,
          effective_from: isoDate(now),
          created_at: now.toISOString(),
        },
      ],
    };
    await this.saveStore([...store, newConsorcio]);
  }

  async update(id: string, data: Partial<NewConsorcio>): Promise<void> {
    const store = await this.getStore();
    const index = store.findIndex((c) => c.id === id);
    if (index !== -1) {
      store[index] = { ...store[index], ...data };
      await this.saveStore(store);
    }
  }

  async updateMoraRate(id: string, data: UpdateMoraRateInput): Promise<void> {
    const store = await this.getStore();
    const index = store.findIndex((c) => c.id === id);
    if (index === -1) return;

    const now = getAppToday();
    let effectiveFrom: string;

    if (data.vigencia_mode === "next_period") {
      effectiveFrom = firstDayOfNextMonth(now);
    } else if (data.vigencia_mode === "current_period") {
      effectiveFrom = firstDayOfCurrentMonth(now);
    } else {
      if (!data.particular_date) {
        throw new Error("Debe indicar una fecha particular de vigencia.");
      }
      effectiveFrom = data.particular_date;
    }

    const consorcio = normalizeConsorcio(store[index]);
    const existing = consorcio.mora_rates || [];
    const withoutSameDate = existing.filter((entry) => entry.effective_from !== effectiveFrom);
    const nextHistory = sortRates([
      ...withoutSameDate,
      {
        tasa_mora: data.tasa_mora,
        effective_from: effectiveFrom,
        created_at: now.toISOString(),
      },
    ]);

    store[index] = {
      ...consorcio,
      mora_rates: nextHistory,
      tasa_mora: getRateForDate({ ...consorcio, mora_rates: nextHistory }, isoDate(now)),
    };

    await this.saveStore(store);
  }

  async getMoraRateForPeriod(id: string, period: string): Promise<number> {
    const store = await this.getStore();
    const consorcio = store.find((c) => c.id === id);
    if (!consorcio) return 0;

    const normalized = period.trim().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(normalized)) {
      return consorcio.tasa_mora ?? 0;
    }

    const firstDayOfPeriod = `${normalized}-01`;
    return getRateForDate(consorcio, firstDayOfPeriod);
  }

  async delete(id: string): Promise<void> {
    const store = await this.getStore();
    await this.saveStore(store.filter((c) => c.id !== id));
  }
}
