export interface LocationCoordinates{
    lat:number;
    lng:number;
}

export interface ServiceItem{
    id: string; // UUID
    userId:string; // Tenancy ownership
    serviceName: string;
    cost: number;
    mileage: number;
    serviceDate: string; // date string (YYYY-MM-DD)
    category:string; // e.g. "Maintenance", "Repair"
    isCompleted: boolean;
    location?: LocationCoordinates | undefined;
    // Versioned, JWT-protected URL: /api/items/:id/photo?v=<epochMs>. Never expose disk path.
    photoUrl?: string | undefined;
    createdAt?: string | undefined;
}

// photoUrl is server-controlled: it can only change through /photo endpoints
export type CreateServiceItemDto=Omit<ServiceItem,'id'|'userId'|'createdAt'|'photoUrl'>;
export type UpdateServiceItemDto=Partial<CreateServiceItemDto>;

export interface PaginatedResult<T>{
    data:T[];
    pagination:{
        total:number;
        page:number;
        limit:number;
        totalPages:number;
        hasMore:boolean;
    }
}

export type WsEventType='ITEM_CREATED' | 'ITEM_UPDATED' | 'ITEM_DELETED';

export interface WsMessage<T = unknown>{
    event:WsEventType;
    payload:T;
    timestamp:string;
}

export interface AuthenticatedUser{
    id:string;
    email:string;
    name?:string | undefined;
}
