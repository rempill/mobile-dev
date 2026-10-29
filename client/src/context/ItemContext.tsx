import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ServiceItem, CreateServiceItemDto, UpdateServiceItemDto, WsMessage } from '../types/item.types';
import { itemApi } from '../services/api';
import { wsClient } from '../services/websocket';

interface ItemContextType {
  items: ServiceItem[];
  loading: boolean;
  error: string | null;
  notification: string | null;
  clearNotification: () => void;
  refreshItems: () => Promise<void>;
  getItem: (id: string) => Promise<ServiceItem | undefined>;
  addItem: (item: CreateServiceItemDto) => Promise<ServiceItem>;
  editItem: (id: string, item: UpdateServiceItemDto) => Promise<ServiceItem>;
  removeItem: (id: string) => Promise<void>;
}

const ItemContext = createContext<ItemContextType | undefined>(undefined);

export const ItemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const clearNotification = () => setNotification(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await itemApi.getAll();
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. Initial REST fetch
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 2. Real-time WebSocket event subscription
  useEffect(() => {
    const unsubscribe = wsClient.subscribe((msg: WsMessage<any>) => {
      if (msg.event === 'ITEM_CREATED') {
        const newItem: ServiceItem = msg.payload;
        setItems((prev) => {
          // Avoid duplicate if this client added it
          if (prev.some((i) => i.id === newItem.id)) return prev;
          return [newItem, ...prev];
        });
        setNotification(`Real-time update: Added "${newItem.serviceName}"`);
      } else if (msg.event === 'ITEM_UPDATED') {
        const updatedItem: ServiceItem = msg.payload;
        setItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
        setNotification(`Real-time update: Updated "${updatedItem.serviceName}"`);
      } else if (msg.event === 'ITEM_DELETED') {
        const { id } = msg.payload;
        setItems((prev) => prev.filter((i) => i.id !== id));
        setNotification(`Real-time update: Service item removed`);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const getItem = async (id: string): Promise<ServiceItem | undefined> => {
    // Check in-memory first for instant load
    const cached = items.find((i) => i.id === id);
    if (cached) return cached;
    return await itemApi.getById(id);
  };

  const addItem = async (dto: CreateServiceItemDto): Promise<ServiceItem> => {
    const created = await itemApi.create(dto);
    setItems((prev) => (prev.some((i) => i.id === created.id) ? prev : [created, ...prev]));
    return created;
  };

  const editItem = async (id: string, dto: UpdateServiceItemDto): Promise<ServiceItem> => {
    const updated = await itemApi.update(id, dto);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    return updated;
  };

  const removeItem = async (id: string): Promise<void> => {
    await itemApi.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <ItemContext.Provider
      value={{
        items,
        loading,
        error,
        notification,
        clearNotification,
        refreshItems: fetchItems,
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
