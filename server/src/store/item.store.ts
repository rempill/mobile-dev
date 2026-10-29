import {randomUUID} from 'crypto';
import type { CreateServiceItemDto, ServiceItem, UpdateServiceItemDto } from '../types/item.types.js';

class ItemStore{
    private items: ServiceItem[]=[
        {
            id: randomUUID(),
            serviceName:'Oil & Filter Change',
            cost:85.50,
            mileage:124500,
            serviceDate:'2026-10-11',
            isCompleted:true,
            location:{lat:44.4323,lng:26.1063}
        },
        {
            id: randomUUID(),
            serviceName:'Tire Rotation',
            cost:50.0,
            mileage:126000,
            serviceDate:'2026-11-11',
            isCompleted:false,
            location:{lat:44.4323,lng:26.1063}
        },
        {
            id: randomUUID(),
            serviceName:'Brake Pad Replacement',
            cost:230.0,
            mileage:128000,
            serviceDate:'2026-11-12',
            isCompleted:false,
            location:{lat:44.4323,lng:26.1063}
        }
    ];

    getAll(): ServiceItem[]{
        return [...this.items];
    }

    getById(id: string): ServiceItem|undefined{
        return this.items.find(it=>it.id===id);
    }

    create(dto: CreateServiceItemDto): ServiceItem {
        const today = new Date().toISOString().split('T')[0] ?? '';
        const newItem: ServiceItem = {
            id: randomUUID(),
            serviceName: dto.serviceName.trim(),
            cost: Number(dto.cost),
            mileage: Number(dto.mileage),
            serviceDate: dto.serviceDate ? dto.serviceDate : today,
            isCompleted: Boolean(dto.isCompleted),
            location: dto.location ?? { lat: 0, lng: 0 }
        };
        this.items.unshift(newItem);
        return newItem;
    }

    update(id: string, dto: UpdateServiceItemDto): ServiceItem | null {
        const index = this.items.findIndex((item) => item.id === id);
        if (index === -1) return null;

        const current = this.items[index];
        if (!current) return null;

        const updated: ServiceItem = {
            ...current,
            serviceName: dto.serviceName !== undefined ? dto.serviceName.trim() : current.serviceName,
            cost: dto.cost !== undefined ? Number(dto.cost) : current.cost,
            mileage: dto.mileage !== undefined ? Number(dto.mileage) : current.mileage,
            serviceDate: dto.serviceDate !== undefined ? dto.serviceDate : current.serviceDate,
            isCompleted: dto.isCompleted !== undefined ? Boolean(dto.isCompleted) : current.isCompleted,
            location: dto.location !== undefined ? dto.location : current.location,
        };

        this.items[index] = updated;
        return updated;
    }

    delete(id:string):boolean{
        const initialLen=this.items.length;
        this.items=this.items.filter((item)=>item.id !== id);
        return this.items.length < initialLen;
    }    
}

export const itemStore=new ItemStore();