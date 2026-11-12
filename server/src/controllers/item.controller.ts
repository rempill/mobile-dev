import type { Request, Response } from 'express';
import type { CreateServiceItemDto } from '../types/item.types.js';
import { itemStore } from '../store/item.store.js';
import { socketService } from '../ws/socket.service.js';

export const getItems = (req: Request, res: Response) => {
    const userId=req.user!.id;
    const page=Math.max(1,parseInt(req.query.page as string) || 1);
    const limit=Math.max(1,parseInt(req.query.limit as string) || 10);
    const searchQuery=(req.query.q as string) || '';
    const category=(req.query.category as string) || 'all';

    const result=itemStore.getPaginated(userId, page, limit, searchQuery,category);
    res.json(result);
};

export const getItemById = (req: Request<{ id: string }>, res: Response): void => {
    const userId=req.user!.id;
    const { id } = req.params;

    const item = itemStore.getById(id,userId);
    if (!item) {
        res.status(404).json({ error: `Service item with ID '${id}' not found (or access was denied).` });
        return;
    }
    res.json(item);
};

export const createItem = (req: Request, res: Response): void => {
    const userId=req.user!.id;
    const { serviceName, cost, mileage, serviceDate, category, isCompleted, location } = req.body;

    // Validation
    if (!serviceName || typeof serviceName !== 'string' || serviceName.trim() === '') {
        res.status(400).json({ error: 'Field "serviceName" is required and must be a non-empty string.' });
        return;
    }

    if (cost === undefined || isNaN(Number(cost)) || Number(cost) < 0) {
        res.status(400).json({ error: 'Field "cost" must be a non-negative number.' });
        return;
    }

    if (mileage === undefined || isNaN(Number(mileage)) || Number(mileage) < 0) {
        res.status(400).json({ error: 'Field "mileage" must be a non-negative number.' });
        return;
    }

    const newItem=itemStore.create({
        serviceName,    
        cost:Number(cost),
        mileage:Number(mileage),
        serviceDate,
        category: category || 'Maintenance',
        isCompleted:Boolean(isCompleted),
        location
    }, userId);

    // Notify client via WebSocket
    socketService.broadcast(userId,'ITEM_CREATED',newItem);

    res.status(201).json(newItem);
};

export const updateItem = (req: Request<{ id: string }>, res: Response): void => {
    const userId=req.user!.id;
    const { id } = req.params;
    const { serviceName, cost, mileage, serviceDate, category, isCompleted, location } = req.body;
    
    // Validate 
    if (serviceName !== undefined && (typeof serviceName !== 'string' || serviceName.trim() === '')) {
        res.status(400).json({ error: '"serviceName" cannot be empty.' });
        return;
    }

    if (cost !== undefined && (isNaN(Number(cost)) || Number(cost) < 0)) {
        res.status(400).json({ error: '"cost" must be a non-negative number.' });
        return;
    }

    if (mileage !== undefined && (isNaN(Number(mileage)) || Number(mileage) < 0)) {
        res.status(400).json({ error: '"mileage" must be a non-negative number.' });
        return;
    }

    const updateDto: Partial<CreateServiceItemDto> = {};
    if (serviceName !== undefined) updateDto.serviceName = serviceName;
    if (cost !== undefined) updateDto.cost = Number(cost);
    if (mileage !== undefined) updateDto.mileage = Number(mileage);
    if (serviceDate !== undefined) updateDto.serviceDate = serviceDate;
    if (category !== undefined) updateDto.category = category;
    if (isCompleted !== undefined) updateDto.isCompleted = Boolean(isCompleted);
    if (location !== undefined) updateDto.location = location;

    const updatedItem = itemStore.update(id, updateDto, userId);

    if (!updatedItem) {
        res.status(404).json({ error: `Service item with ID '${id}' not found (or unauthorized).` });
        return;
    }

    // Notify clients via WS
    socketService.broadcast(userId, 'ITEM_UPDATED', updatedItem);

    res.json(updatedItem);
};

export const deleteItem = (req: Request<{ id: string }>, res: Response): void => {
    const userId=req.user!.id;
    const { id } = req.params;

    const deleted = itemStore.delete(id,userId);

    if (!deleted) {
        res.status(404).json({ error: `Service item with ID '${id}' not found (or unauthorized).` });
        return;
    }

    // Notify client via WS
    socketService.broadcast(userId,'ITEM_DELETED', { id });

    res.status(204).send();
};