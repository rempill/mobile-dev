import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Network } from '@capacitor/network';
import { ServiceItem, CreateServiceItemDto, UpdateServiceItemDto, WsMessage, User } from '../types/item.types';
import { itemApi } from '../services/api';
import { wsClient } from '../services/websocket';
import { storageService } from '../services/storage.service';

interface ItemContextType {
  items: ServiceItem[];
  loading: boolean;
  authLoading: boolean;
  error: string | null;
  notification: string | null;
  clearNotification: () => void;
  // network & sync
  isOnline: boolean;
  pendingSyncCount: number;
  syncPendingQueue: () => Promise<void>;
  // auth
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  // pagination & filtering
  page: number;
  hasMore: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  category: string;
  setCategory: (cat: string) => void;
  loadMoreItems: () => Promise<void>;
  refreshItems: () => Promise<void>;
  // crud
  getItem: (id: string) => Promise<ServiceItem | undefined>;
  addItem: (item: CreateServiceItemDto) => Promise<ServiceItem>;
  editItem: (id: string, item: UpdateServiceItemDto) => Promise<ServiceItem>;
  removeItem: (id: string) => Promise<void>;
}

const ItemContext = createContext<ItemContextType | undefined>(undefined);

export const ItemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // network & sync state
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // auth State
  const [user, setUser] = useState<User | null>(null);

  // pagination & filtering State
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [category, setCategory] = useState<string>('all');

  const clearNotification = () => setNotification(null);

  // init network status and register real-time listener
  useEffect(() => {
    let listenerHandle: any = null;

    const setupNetwork = async () => {
      const status = await Network.getStatus();
      setIsOnline(status.connected);

      listenerHandle = await Network.addListener('networkStatusChange', (s) => {
        console.log('[Network] Status changed to:', s.connected ? 'ONLINE' : 'OFFLINE');
        setIsOnline(s.connected);
      });
    };

    setupNetwork();
    return () => {
      if (listenerHandle) listenerHandle.remove();
    };
  }, []);

  // restore auth & count pending sync items
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = await storageService.getToken();
        const storedUser = await storageService.getUser();
        if (token && storedUser) {
          setUser(storedUser);
          wsClient.connect();
        } else if (token) {
          setUser({ id: 'user', email: 'user@pitstop.com' });
          wsClient.connect();
        }
        const queue = await storageService.getSyncQueue();
        setPendingSyncCount(queue.length);
      } catch (err) {
        console.error('Failed to bootstrap storage:', err);
      } finally {
        setAuthLoading(false);
      }
    };
    bootstrap();
  }, []);

  // online/offline fetch pipeline
  const fetchItems = useCallback(
    async (targetPage: number = 1, append: boolean = false) => {
      try {
        setLoading(true);
        setError(null);

        if (isOnline) {
          const res = await itemApi.getAll(targetPage, 10, searchQuery, category);
          if (append) {
            setItems((prev) => {
              const existingIds = new Set(prev.map((i) => i.id));
              const newUnique = res.data.filter((i) => !existingIds.has(i.id));
              return [...prev, ...newUnique];
            });
          } else {
            setItems(res.data);
          }
          setPage(targetPage);
          setHasMore(res.pagination.hasMore);

          // update local cache on fresh page 1 load
          if (targetPage === 1 && !searchQuery && category === 'all') {
            await storageService.setCachedItems(res.data);
          }
        } else {
          // offline fallback
          let cached = await storageService.getCachedItems();

          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            cached = cached.filter((i) => i.serviceName.toLowerCase().includes(q));
          }

          if (category && category !== 'all') {
            cached = cached.filter((i) => i.category.toLowerCase() === category.toLowerCase());
          }

          setItems(cached);
          setHasMore(false);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch items');
        // fallback to cache on network failure
        const cached = await storageService.getCachedItems();
        setItems(cached);
      } finally {
        setLoading(false);
      }
    },
    [isOnline, searchQuery, category]
  );

  // trigger fetch when search or category changes, only when authenticated
  useEffect(() => {
    if (user) {
      fetchItems(1, false);
    }
  }, [fetchItems, user]);

  // auto-flush offline sync queue when returning online
  const syncPendingQueue = useCallback(async () => {
    const queue = await storageService.getSyncQueue();
    if (queue.length === 0) return;

    setNotification(`Reconnected: Syncing ${queue.length} offline records...`);

    for (const task of queue) {
      try {
        if (task.operation === 'CREATE') {
          // Strip temporary local ID (temp-xxx) and local sync metadata (_syncStatus)
          const { id, _syncStatus, ...createPayload } = task.payload || {};
          await itemApi.create(createPayload);
          if (id) {
            setItems((prev) => prev.filter((i) => i.id !== id));
          }
        } else if (task.operation === 'UPDATE') {
          // Strip local sync metadata (_syncStatus)
          const { _syncStatus, ...updatePayload } = task.payload || {};
          const itemId = updatePayload.id || task.payload?.id;
          if (itemId && !itemId.startsWith('temp-')) {
            await itemApi.update(itemId, updatePayload);
          }
        } else if (task.operation === 'DELETE') {
          const itemId = task.payload?.id;
          if (itemId && !itemId.startsWith('temp-')) {
            await itemApi.delete(itemId);
          }
        }
        await storageService.removeSyncQueueItem(task.queueId);
      } catch (e) {
        console.error('Failed to sync item:', task, e);
      }
    }

    setPendingSyncCount(0);
    setNotification('Offline sync complete! Cloud database is up to date.');
    await fetchItems(1, false);
  }, [fetchItems]);

  useEffect(() => {
    if (isOnline && user) {
      syncPendingQueue();
    }
  }, [isOnline, user, syncPendingQueue]);

  // real-time WS event subscription
  useEffect(() => {
    if (!user || !isOnline) return;

    const unsubscribe = wsClient.subscribe((msg: WsMessage<any>) => {
      if (msg.event === 'ITEM_CREATED') {
        const newItem: ServiceItem = msg.payload;
        setItems((prev) => (prev.some((i) => i.id === newItem.id) ? prev : [newItem, ...prev]));
        setNotification(`Real-time update: Added "${newItem.serviceName}"`);
      } else if (msg.event === 'ITEM_UPDATED') {
        const updatedItem: ServiceItem = msg.payload;
        setItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
        setNotification(`Real-time update: Updated "${updatedItem.serviceName}"`);
      } else if (msg.event === 'ITEM_DELETED') {
        const { id } = msg.payload;
        setItems((prev) => prev.filter((i) => i.id !== id));
        setNotification('Real-time update: Service item removed');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, isOnline]);

  // pagination: load next page
  const loadMoreItems = async () => {
    if (!hasMore || loading) return;
    await fetchItems(page + 1, true);
  };

  // auth: Login
  const login = async (email: string, pass: string) => {
    const { token, user: loggedUser } = await itemApi.login(email, pass);
    await storageService.setToken(token);
    await storageService.setUser(loggedUser);
    setUser(loggedUser);
    wsClient.connect();
    await fetchItems(1, false);
  };

  // auth: Register
  const register = async (email: string, pass: string, name?: string) => {
    const { token, user: registeredUser } = await itemApi.register(email, pass, name);
    await storageService.setToken(token);
    await storageService.setUser(registeredUser);
    setUser(registeredUser);
    wsClient.connect();
    await fetchItems(1, false);
  };

  // auth: Logout
  const logout = async () => {
    wsClient.disconnect();
    await storageService.clear();
    setUser(null);
    setItems([]);
  };

  // crud with online/offline branching
  const getItem = async (id: string): Promise<ServiceItem | undefined> => {
    const cached = items.find((i) => i.id === id);
    if (cached) return cached;
    if (isOnline) return await itemApi.getById(id);
    return undefined;
  };

  const addItem = async (dto: CreateServiceItemDto): Promise<ServiceItem> => {
    if (isOnline) {
      try {
        const created = await itemApi.create(dto);
        setItems((prev) => (prev.some((i) => i.id === created.id) ? prev : [created, ...prev]));
        const cached = await storageService.getCachedItems();
        if (!cached.some((i) => i.id === created.id)) {
          await storageService.setCachedItems([created, ...cached]);
        }
        return created;
      } catch (e) {
        console.warn('Network call failed, falling back to offline queue');
      }
    }

    // offline optimistic add
    const offlineItem: ServiceItem = {
      ...dto,
      id: `temp-${Date.now()}`,
      _syncStatus: 'pending'
    };
    await storageService.addToSyncQueue('CREATE', '/items', offlineItem);
    setPendingSyncCount((prev) => prev + 1);
    setItems((prev) => (prev.some((i) => i.id === offlineItem.id) ? prev : [offlineItem, ...prev]));

    const cached = await storageService.getCachedItems();
    await storageService.setCachedItems([offlineItem, ...cached.filter((i) => i.id !== offlineItem.id)]);

    return offlineItem;
  };

  // edit
  const editItem = async (id: string, dto: UpdateServiceItemDto): Promise<ServiceItem> => {
    if (isOnline) {
      try {
        const updated = await itemApi.update(id, dto);
        setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
        return updated;
      } catch (e) {
        console.warn('Network call failed, enqueuing update');
      }
    }

    const current = items.find((i) => i.id === id);
    const updated: ServiceItem = {
      ...(current as ServiceItem),
      ...dto,
      id,
      _syncStatus: 'pending'
    };
    await storageService.addToSyncQueue('UPDATE', `/items/${id}`, updated);
    setPendingSyncCount((prev) => prev + 1);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    return updated;
  };

  // remove
  const removeItem = async (id: string): Promise<void> => {
    if (isOnline) {
      try {
        await itemApi.delete(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        return;
      } catch (e) {
        console.warn('Delete failed online, enqueuing delete');
      }
    }

    await storageService.addToSyncQueue('DELETE', `/items/${id}`, { id });
    setPendingSyncCount((prev) => prev + 1);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <ItemContext.Provider
      value={{
        items,
        loading,
        authLoading,
        error,
        notification,
        clearNotification,
        isOnline,
        pendingSyncCount,
        syncPendingQueue,
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        page,
        hasMore,
        searchQuery,
        setSearchQuery,
        category,
        setCategory,
        loadMoreItems,
        refreshItems: () => fetchItems(1, false),
        getItem,
        addItem,
        editItem,
        removeItem
      }}
    >
      {children}
    </ItemContext.Provider>
  );
};

export const useItems = () => {
  const context = useContext(ItemContext);
  if (!context) {
    throw new Error('useItems must be used within an ItemProvider');
  }
  return context;
};
