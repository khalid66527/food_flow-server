import express, { Router } from 'express';
import { CategoryController } from './category.controller';

const router: Router = express.Router();

// Public / Admin category list
router.get('/', CategoryController.getAllCategories);

// Admin Category Management Endpoints
router.post('/', CategoryController.createCategory);
router.patch('/:id', CategoryController.updateCategory);
router.delete('/:id', CategoryController.deleteCategory);

export const CategoryRoutes = router;
