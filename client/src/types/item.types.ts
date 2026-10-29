export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface ServiceItem {
  id: string;
  serviceName: string;
  cost: number;
  mileage: number;
  serviceDate: string; // YYYY-MM-DD
  isCompleted: boolean;
  location?: LocationCoordinates;
}

export type CreateServiceItemDto = Omit<ServiceItem, 'id'>;
export type UpdateServiceItemDto = Partial<CreateServiceItemDto>;

export type WsEventType = 'ITEM_CREATED' | 'ITEM_UPDATED' | 'ITEM_DELETED';

export interface WsMessage<T = unknown> {
  event: WsEventType;
  payload: T;
  timestamp: string;
}
