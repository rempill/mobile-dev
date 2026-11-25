import type { Request, Response } from 'express';
import type { CreateServiceItemDto } from '../types/item.types.js';
import { itemStore } from '../store/item.store.js';
import { socketService } from '../ws/socket.service.js';

import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);

// ensure server/uploads exists
const uploadsDir=path.resolve(__dirname,'../../uploads');
if(!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir,{recursive: true});
}

// multer disk storage config
const storage=multer.diskStorage({
    destination: (_req,_file,cb) => cb(null, uploadsDir),
    filename: (_req,file,cb) => {
        const ext=path.extname(file.originalname) || '.jpg';
        cb(null,`receipt-${Date.now()}-${Math.random().toString(36).substring(8)}${ext}`);
    }
});

export const getItems = (req: Request, res: Response) => {
    const userId=req.user!.id;
    const page=Math.max(1,parseInt(req.query.page as string) || 1);
    const limit=Math.max(1,parseInt(req.query.limit as string) || 10);
    const searchQuery=(req.query.q as string) || '';
    const category=(req.query.category as string) || 'all';

    const result=itemStore.getPaginated(userId, page, limit, searchQuery,category);
    res.json(result);
};

export const photoUploadMiddleware=multer({
    storage,
    limits:{fileSize:10*1024*1024}, // 10MB
    fileFilter: (_req,file,cb) => {
        if (file.mimetype.startsWith('image/')){
            cb(null,true);
        } else{
            cb(new Error('Only image files JPEG,PNG,WebP) are allowed'));
        }
    }
}).single('photo');

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

// POST /api/items/:id/photo
export const uploadItemPhoto = (req: Request<{ id: string }>, res: Response): void => {
  const userId = req.user!.id;
  const { id } = req.params;

  if (!req.file) {
    res.status(400).json({ error: 'No image file uploaded under field "photo".' });
    return;
  }

  // Ensure item exists and belongs to current user
  const existing = itemStore.getById(id, userId);
  if (!existing) {
    // Clean up uploaded file if item not found / unauthorized
    fs.unlink(req.file.path, () => {});
    res.status(404).json({ error: `Service item '${id}' not found or unauthorized.` });
    return;
  }

  const relativePath = path.relative(path.resolve(__dirname, '../../'), req.file.path);
  const result = itemStore.setPhoto(id, userId, relativePath, req.file.mimetype);

  if (!result) {
    fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Failed to update photo record.' });
    return;
  }

  // Clean up old file if it existed
  if (result.previousPhotoPath) {
    const oldFullPath = path.resolve(__dirname, '../../', result.previousPhotoPath);
    fs.unlink(oldFullPath, () => {});
  }

  // Broadcast WebSocket update
  socketService.broadcast(userId, 'ITEM_UPDATED', result.item);

  res.status(200).json(result.item);
};

// GET /api/items/:id/photo
export const getItemPhoto = (req: Request<{ id: string }>, res: Response): void => {
  const userId = req.user!.id;
  const { id } = req.params;

  const photoRecord = itemStore.getPhotoFile(id, userId);
  if (!photoRecord) {
    res.status(404).json({ error: 'No photo found for this item.' });
    return;
  }

  const fullPath = path.resolve(__dirname, '../../', photoRecord.photoPath);
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: 'Photo file missing on disk.' });
    return;
  }

  res.setHeader('Content-Type', photoRecord.photoMimeType);
  res.setHeader('Cache-Control', 'private, max-age=86400');
  fs.createReadStream(fullPath).pipe(res);
};

// DELETE /api/items/:id/photo
export const deleteItemPhoto = (req: Request<{ id: string }>, res: Response): void => {
  const userId = req.user!.id;
  const { id } = req.params;

  const result = itemStore.clearPhoto(id, userId);
  if (!result) {
    res.status(404).json({ error: `Service item '${id}' not found or unauthorized.` });
    return;
  }

  if (result.previousPhotoPath) {
    const oldFullPath = path.resolve(__dirname, '../../', result.previousPhotoPath);
    fs.unlink(oldFullPath, () => {});
  }

  socketService.broadcast(userId, 'ITEM_UPDATED', result.item);
  res.status(200).json(result.item);
};