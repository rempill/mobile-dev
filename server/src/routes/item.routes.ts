import { Router } from 'express';
import { getItems, getItemById, createItem, updateItem, deleteItem } from '../controllers/item.controller.js';
import {authToken} from '../middleware/auth.middleware.js';

const router = Router();

// secure all endppints with JWT verif
router.use(authToken);

router.get('/', getItems);
router.get('/:id', getItemById);
router.post('/', createItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);

export default router;
