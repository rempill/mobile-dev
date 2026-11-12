import { Storage } from '@ionic/storage';
import { ServiceItem } from '../types/item.types';

export interface SyncQueueItem {
  queueId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  payload: any;
  timestamp: number;
}

class StorageService {
  private storage: Storage | null = null;
  private isReady = false;
  private initPromise: Promise<Storage> | null = null;

  constructor() {
    this.init();
  }

  async init(): Promise<Storage> {
    if (this.storage && this.isReady) {
      return this.storage;
    }

    if (!this.initPromise) {
      const store = new Storage({
        name: '_pitstop_storage',
        description: 'PitStop offline persistence'
      });

      this.initPromise = (async () => {
        const s = await store.create();
        this.storage = s;
        this.isReady = true;
        return s;
      })();
    }

    return this.initPromise;
  }

  private async getStore(): Promise<Storage> {
    if (!this.storage || !this.isReady) {
      return await this.init();
    }
    return this.storage;
  }

  // auth token persistence
  async getToken(): Promise<string | null> {
    const store = await this.getStore();
    return await store.get('AUTH_TOKEN');
  }

  async setToken(token: string): Promise<void> {
    const store = await this.getStore();
    await store.set('AUTH_TOKEN', token);
  }

  async getUser(): Promise<any | null> {
    const store = await this.getStore();
    return await store.get('AUTH_USER');
  }

  async setUser(user: any): Promise<void> {
    const store = await this.getStore();
    await store.set('AUTH_USER', user);
  }

  async clearAuth(): Promise<void> {
    const store = await this.getStore();
    await store.remove('AUTH_TOKEN');
    await store.remove('AUTH_USER');
  }

  async clear(): Promise<void> {
    const store = await this.getStore();
    await store.clear();
  }

  // cached items persistence
  async getCachedItems(): Promise<ServiceItem[]> {
    const store = await this.getStore();
    const data = await store.get('CACHED_ITEMS');
    return data ? JSON.parse(data) : [];
  }

  async setCachedItems(items: ServiceItem[]): Promise<void> {
    const store = await this.getStore();
    await store.set('CACHED_ITEMS', JSON.stringify(items));
  }

  // offline sync queue
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const store = await this.getStore();
    const data = await store.get('SYNC_QUEUE');
    return data ? JSON.parse(data) : [];
  }

  async addToSyncQueue(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    endpoint: string,
    payload: any
  ): Promise<SyncQueueItem> {
    const queue = await this.getSyncQueue();
    const newItem: SyncQueueItem = {
      queueId: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      operation,
      endpoint,
      payload,
      timestamp: Date.now()
    };
    queue.push(newItem);
    const store = await this.getStore();
    await store.set('SYNC_QUEUE', JSON.stringify(queue));
    return newItem;
  }

  async removeSyncQueueItem(queueId: string): Promise<void> {
    const queue = await this.getSyncQueue();
    const filtered = queue.filter((i) => i.queueId !== queueId);
    const store = await this.getStore();
    await store.set('SYNC_QUEUE', JSON.stringify(filtered));
  }

  async clearSyncQueue(): Promise<void> {
    const store = await this.getStore();
    await store.remove('SYNC_QUEUE');
  }
}

export const storageService = new StorageService();
