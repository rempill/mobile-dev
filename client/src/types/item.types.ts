export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface ServiceItem {
  id: string;
  userId?:string;
  serviceName: string;
  cost: number;
  mileage: number;
  serviceDate: string; // YYYY-MM-DD
  category: string;
  isCompleted: boolean;
  location?: LocationCoordinates;
  _syncStatus?: 'synced' | 'pending'; // flag for items queued offline
}

export type CreateServiceItemDto = Omit<ServiceItem, 'id' | 'userId' | '_syncStatus'>;
export type UpdateServiceItemDto = Partial<CreateServiceItemDto>;

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export type WsEventType = 'ITEM_CREATED' | 'ITEM_UPDATED' | 'ITEM_DELETED';

export interface WsMessage<T = unknown> {
  event: WsEventType;
  payload: T;
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}