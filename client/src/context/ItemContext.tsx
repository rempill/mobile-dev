import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Network } from '@capacitor/network';
import { ServiceItem, CreateServiceItemDto, UpdateServiceItemDto, WsMessage, User, LocationCoordinates } from '../types/item.types';
import { itemApi } from '../services/api';
import { wsClient } from '../services/websocket';
import { storageService } from '../services/storage.service';
import { photoService } from '../services/photo.service';

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
  // CRUD operations
  getItem: (id: string) => Promise<ServiceItem | undefined>;
  addItem: (item: CreateServiceItemDto, localPhotoPath?: string) => Promise<ServiceItem>;
  editItem: (id: string, item: UpdateServiceItemDto, localPhotoPath?: string, removePhoto?: boolean) => Promise<ServiceItem>;
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
  const isSyncingRef = useRef(false);

  // auth State
  const [user, setUser] = useState<User | null>(null);

  // pagination & filtering State
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [category, setCategory] = useState<string>('all');

  const clearNotification = () => setNotification(null);

  // merge items with local PHOTO_INDEX
  const mergeWithPhotoIndex = useCallback(async (list:ServiceItem[]): Promise<ServiceItem[]> =>{
    const photoIndex=await storageService.getPhotoIndex();
    return list.map((item) => {
      const p = photoIndex[item.id];
      if(p){
        return {
          ...item,
          localPhotoPath:p.localPath,
          _photoSyncStatus:p.status
        };
      }
      return item;
    });
  },[]);

  // init network status and register real-time listener
  useEffect(() => {
    let handle: any = null;
    const setup = async () => {
      const status = await Network.getStatus();
      setIsOnline(status.connected);

      handle = await Network.addListener('networkStatusChange', (s) => {
        setIsOnline(s.connected);
      });
    };
    setup();
    return () => {
      if (handle) handle.remove();
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
          const merged= await mergeWithPhotoIndex(res.data);

          if (append) {
            setItems((prev) => {
              const existingIds = new Set(prev.map((i) => i.id));
              return [...prev, ...merged.filter((i)=> !existingIds.has(i.id))];
            });
          } else {
            setItems(merged);
          }

          setPage(targetPage);
          setHasMore(res.pagination.hasMore);

          // update local cache on fresh page 1 load
          if (targetPage === 1 && !searchQuery && category === 'all') {
            await storageService.setCachedItems(merged);
          }
        } else {
          // offline fallback
          let cached = await storageService.getCachedItems();
          cached=await mergeWithPhotoIndex(cached);

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
        const cached=await mergeWithPhotoIndex(await storageService.getCachedItems());
        setItems(cached);
      } finally {
        setLoading(false);
      }
    },
    [isOnline, searchQuery, category, mergeWithPhotoIndex]
  );

  // trigger fetch when search or category changes, only when authenticated
  useEffect(() => {
    if (user) {
      fetchItems(1, false);
    }
  }, [fetchItems, user]);

  // auto-flush offline sync queue when returning online
  const syncPendingQueue = useCallback(async () => {
    if(isSyncingRef.current) return;
    isSyncingRef.current=true;

    try{
      const queue = await storageService.getSyncQueue();
      if (queue.length === 0) return;

      setNotification(`Syncing ${queue.length} offline records...`);
      const tempIdMap: Record<string,string>={};

      for (const task of queue) {
        try {
          if (task.operation === 'CREATE') {
            const { id: tempId, localPhotoPath, _syncStatus, _photoSyncStatus, ...payload } = task.payload || {};
            const created = await itemApi.create(payload);

            if (tempId) {
              tempIdMap[tempId] = created.id;
              // Remap photo index
              const pIndex = await storageService.getPhotoIndex();
              if (pIndex[tempId]) {
                await storageService.setPhotoIndexEntry(created.id, pIndex[tempId]);
                await storageService.removePhotoIndexEntry(tempId);
              }
            }

            // Upload pending photo if present
            if (localPhotoPath) {
              try {
                await photoService.uploadPhotoFile(created.id, localPhotoPath);
                await storageService.setPhotoIndexEntry(created.id, {
                  localPath: localPhotoPath,
                  status: 'synced',
                  updatedAt: Date.now()
                });
              } catch (photoErr) {
                console.warn('Failed to upload photo for created item:', photoErr);
              }
            }
          } else if (task.operation === 'UPDATE') {
            let itemId = task.payload?.id;
            if (itemId && tempIdMap[itemId]) itemId = tempIdMap[itemId];

            const { id, localPhotoPath, _syncStatus, _photoSyncStatus, _photoRemoved, ...payload } = task.payload || {};
            if (itemId && !itemId.startsWith('temp-')) {
              await itemApi.update(itemId, payload);
              if (_photoRemoved) {
                try {
                  await itemApi.deletePhoto(itemId);
                  await storageService.removePhotoIndexEntry(itemId);
                } catch (photoErr) {
                  console.warn('Failed to delete photo during sync:', photoErr);
                }
              } else if (localPhotoPath) {
                try {
                  await photoService.uploadPhotoFile(itemId, localPhotoPath);
                  await storageService.setPhotoIndexEntry(itemId, {
                    localPath: localPhotoPath,
                    status: 'synced',
                    updatedAt: Date.now()
                  });
                } catch (photoErr) {
                  console.warn('Failed to sync updated photo:', photoErr);
                }
              }
            }
          } else if (task.operation === 'DELETE') {
            let itemId = task.payload?.id;
            if (itemId && tempIdMap[itemId]) itemId = tempIdMap[itemId];

            if (itemId && !itemId.startsWith('temp-')) {
              await itemApi.delete(itemId);
              await storageService.removePhotoIndexEntry(itemId);
            }
          }

          await storageService.removeSyncQueueItem(task.queueId);
        } catch (e) {
          console.error('Failed to sync queue task:', task, e);
        }
      }
      const remaining = await storageService.getSyncQueue();
      setPendingSyncCount(remaining.length);
      setNotification('Offline sync complete! Cloud database updated.');
      await fetchItems(1, false);
    } finally {
      isSyncingRef.current = false;
    }
  }, [fetchItems]);

  useEffect(() => {
    if (isOnline && user) {
      syncPendingQueue();
    }
  }, [isOnline, user, syncPendingQueue]);

  // real-time WS event subscription
  useEffect(() => {
    if (!user || !isOnline) return;

    const unsubscribe = wsClient.subscribe(async (msg: WsMessage<any>) => {
      if (msg.event === 'ITEM_CREATED') {
        const [merged] = await mergeWithPhotoIndex([msg.payload]);
        setItems((prev) => (prev.some((i) => i.id === merged.id) ? prev : [merged, ...prev]));
        setNotification(`Added: "${merged.serviceName}"`);
      } else if (msg.event === 'ITEM_UPDATED') {
        const [merged] = await mergeWithPhotoIndex([msg.payload]);
        setItems((prev) => prev.map((i) => (i.id === merged.id ? merged : i)));
      } else if (msg.event === 'ITEM_DELETED') {
        setItems((prev) => prev.filter((i) => i.id !== msg.payload.id));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, isOnline, mergeWithPhotoIndex]);

  // crud with online/offline branching
  const getItem = useCallback(
    async (id: string): Promise<ServiceItem | undefined> => {
      const found = items.find((i) => i.id === id);
      if (found) return found;
      if (isOnline) {
        const item = await itemApi.getById(id);
        const [merged] = await mergeWithPhotoIndex([item]);
        return merged;
      }
      return undefined;
    },
    [items, isOnline, mergeWithPhotoIndex]
  );

 const addItem = async (dto: CreateServiceItemDto, localPhotoPath?: string): Promise<ServiceItem> => {
    if (isOnline) {
      try {
        const created = await itemApi.create(dto);
        if (localPhotoPath) {
          try {
            await photoService.uploadPhotoFile(created.id, localPhotoPath);
            await storageService.setPhotoIndexEntry(created.id, {
              localPath: localPhotoPath,
              status: 'synced',
              updatedAt: Date.now()
            });
            created.localPhotoPath = localPhotoPath;
            created._photoSyncStatus = 'synced';
          } catch {
            await storageService.setPhotoIndexEntry(created.id, {
              localPath: localPhotoPath,
              status: 'pending',
              updatedAt: Date.now()
            });
            await storageService.addToSyncQueue('UPDATE', `/items/${created.id}`, {
              ...created,
              localPhotoPath
            });
          }
        }
        setItems((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        console.warn('Network create failed, falling back to offline mode');
      }
    }

    // Offline mode
    const tempId = `temp-${Date.now()}`;
    const offlineItem: ServiceItem = {
      ...dto,
      id: tempId,
      localPhotoPath,
      _syncStatus: 'pending',
      _photoSyncStatus: localPhotoPath ? 'pending' : undefined
    };

    if (localPhotoPath) {
      await storageService.setPhotoIndexEntry(tempId, {
        localPath: localPhotoPath,
        status: 'pending',
        updatedAt: Date.now()
      });
    }

    await storageService.addToSyncQueue('CREATE', '/items', offlineItem);
    setPendingSyncCount((prev) => prev + 1);
    setItems((prev) => [offlineItem, ...prev]);
    return offlineItem;
  };

  // edit
  const editItem = async (
    id: string,
    dto: UpdateServiceItemDto,
    localPhotoPath?: string,
    removePhoto?: boolean
  ): Promise<ServiceItem> => {
    if (isOnline && !id.startsWith('temp-')) {
      try {
        let updated = await itemApi.update(id, dto);
        if (removePhoto) {
          try {
            updated = await itemApi.deletePhoto(id);
          } catch (e) {
            console.warn('Failed to delete photo on server:', e);
          }
          await storageService.removePhotoIndexEntry(id);
          updated.photoUrl = undefined;
          updated.localPhotoPath = undefined;
          updated._photoSyncStatus = undefined;
        } else if (localPhotoPath) {
          await photoService.uploadPhotoFile(id, localPhotoPath);
          await storageService.setPhotoIndexEntry(id, {
            localPath: localPhotoPath,
            status: 'synced',
            updatedAt: Date.now()
          });
          updated.localPhotoPath = localPhotoPath;
        }
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...updated,
                  ...(removePhoto ? { photoUrl: undefined, localPhotoPath: undefined, _photoSyncStatus: undefined } : {})
                }
              : i
          )
        );
        return updated;
      } catch (e) {
        console.warn('Online update failed, saving offline task');
      }
    }

    const current = items.find((i) => i.id === id);
    const updated: ServiceItem = {
      ...(current as ServiceItem),
      ...dto,
      id,
      localPhotoPath: removePhoto ? undefined : (localPhotoPath ?? current?.localPhotoPath),
      photoUrl: removePhoto ? undefined : current?.photoUrl,
      _syncStatus: 'pending',
      _photoSyncStatus: removePhoto ? undefined : (localPhotoPath ? 'pending' : current?._photoSyncStatus)
    };

    if (removePhoto) {
      await storageService.removePhotoIndexEntry(id);
      if (current?.localPhotoPath) {
        await photoService.deleteLocalPhoto(current.localPhotoPath);
      }
    } else if (localPhotoPath) {
      await storageService.setPhotoIndexEntry(id, {
        localPath: localPhotoPath,
        status: 'pending',
        updatedAt: Date.now()
      });
    }

    await storageService.addToSyncQueue('UPDATE', `/items/${id}`, {
      ...updated,
      _photoRemoved: removePhoto
    });
    setPendingSyncCount((prev) => prev + 1);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    return updated;
  };

  // remove
  const removeItem = async (id: string): Promise<void> => {
    if (isOnline && !id.startsWith('temp-')) {
      try {
        await itemApi.delete(id);
        await storageService.removePhotoIndexEntry(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        return;
      } catch (e) {
        console.warn('Delete online failed, enqueuing offline task');
      }
    }

    await storageService.addToSyncQueue('DELETE', `/items/${id}`, { id });
    await storageService.removePhotoIndexEntry(id);
    setPendingSyncCount((prev) => prev + 1);
    setItems((prev) => prev.filter((i) => i.id !== id));
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

  // pagination: load next page
  const loadMoreItems = async () => {
    if (!hasMore || loading) return;
    await fetchItems(page + 1, true);
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
