import { Request, Response } from 'express';
import { CategoryService } from './category.service';

/**
 * Get all categories (Public / Admin)
 * Query param: all=true to include inactive categories for Admin
 */
const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const includeInactive = req.query.all === 'true' || req.query.includeInactive === 'true';
    const categories = await CategoryService.getAllCategories(includeInactive);

    res.status(200).json({
      success: true,
      message: 'Global categories fetched successfully',
      data: categories,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch global categories',
      data: [],
    });
  }
};

/**
 * Create a new global category (Admin)
 */
const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const newCategory = await CategoryService.createCategory(req.body);

    res.status(201).json({
      success: true,
      message: `Category "${newCategory.name}" created successfully!`,
      data: newCategory,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Failed to create category',
    });
  }
};

/**
 * Update an existing category (Admin)
 */
const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updatedCategory = await CategoryService.updateCategory(id, req.body);

    if (!updatedCategory) {
      res.status(404).json({
        success: false,
        message: 'Category not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Category updated successfully!',
      data: updatedCategory,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Failed to update category',
    });
  }
};

/**
 * Delete a category (Admin)
 */
const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isDeleted = await CategoryService.deleteCategory(id);

    if (!isDeleted) {
      res.status(404).json({
        success: false,
        message: 'Category not found or already deleted',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully!',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Failed to delete category',
    });
  }
};

export const CategoryController = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
