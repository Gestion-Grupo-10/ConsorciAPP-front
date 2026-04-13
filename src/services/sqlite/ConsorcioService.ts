import localforage from "localforage";
import type { Consorcio, IConsorcioService, NewConsorcio } from "../interfaces/IConsorcioService";

const STORAGE_KEY = "consorcios_data";

export class LocalConsorcioService implements IConsorcioService {
  private async getStore(): Promise<Consorcio[]> {
    return (await localforage.getItem<Consorcio[]>(STORAGE_KEY)) || [];
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
    const newConsorcio: Consorcio = {
      ...data,
      id: crypto.randomUUID(),
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

  async delete(id: string): Promise<void> {
    const store = await this.getStore();
    await this.saveStore(store.filter((c) => c.id !== id));
  }
}
