import type { Request, Response } from 'express';
import type { CreateServiceItemDto } from '../types/item.types.js';
import { itemStore } from '../store/item.store.js';
import { socketService } from '../ws/socket.service.js';

export const getItems = (_req: Request, res: Response) => {
    const items = itemStore.getAll();
    res.json(items);
};

export const getItemById = (req: Request<{ id: string }>, res: Response): void => {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'Invalid ID parameter.' });
        return;
    }

    const item = itemStore.getById(id);
    if (!item) {
        res.status(404).json({ error: `Service item with ID '${id}' not found.` });
        return;
    }
    res.json(item);
};

export const createItem = (req: Request, res: Response): void => {
    const { serviceName, cost, mileage, serviceDate, isCompleted, location } = req.body;

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
        isCompleted:Boolean(isCompleted),
        location
    });

    // Notify clients via WebSocket

    socketService.broadcast('ITEM_CREATED',newItem);

    res.status(201).json(newItem);
};

export const updateItem = (req: Request<{ id: string }>, res: Response): void => {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'Invalid ID parameter.' });
        return;
    }
    const { serviceName, cost, mileage, serviceDate, isCompleted, location } = req.body;
    
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
    if (isCompleted !== undefined) updateDto.isCompleted = Boolean(isCompleted);
    if (location !== undefined) updateDto.location = location;

    const updatedItem = itemStore.update(id, updateDto);

    if (!updatedItem) {
        res.status(404).json({ error: `Service item with ID '${id}' not found.` });
        return;
    }

    // Notify clients via WS
    socketService.broadcast('ITEM_UPDATED', updatedItem);

    res.json(updatedItem);
};

export const deleteItem = (req: Request<{ id: string }>, res: Response): void => {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'Invalid ID parameter.' });
        return;
    }

    const deleted = itemStore.delete(id);

    if (!deleted) {
        res.status(404).json({ error: `Service item with ID '${id}' not found.` });
        return;
    }

    // Notify clients via WS
    socketService.broadcast('ITEM_DELETED', { id });

    res.status(204).send();
};