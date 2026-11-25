import { Router } from 'express';
import {
    getItems,
    getItemById,
    createItem,
    updateItem,
    deleteItem,
    uploadItemPhoto,
    getItemPhoto,
    deleteItemPhoto,
    photoUploadMiddleware 
} from '../controllers/item.controller.js';
import {authToken} from '../middleware/auth.middleware.js';

const router = Router();

// secure all endppints with JWT verif
router.use(authToken);

router.get('/', getItems);
router.get('/:id', getItemById);
router.post('/', createItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);

// Photo endpoints
router.post('/:id/photo', photoUploadMiddleware, uploadItemPhoto);
router.get('/:id/photo', getItemPhoto);
router.delete('/:id/photo', deleteItemPhoto);

export default router;
