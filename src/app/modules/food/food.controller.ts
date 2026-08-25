import { Request, Response } from 'express';
import { FoodService } from './food.service';
import { TFoodQueryParams } from './food.interface';
/**
 * Get All Global Food Items (Search, Filter, Sort, Pagination)
 */
const getAllGlobalFoodItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const queryParams: TFoodQueryParams = {
      search: (req.query.search as string) || '',
      category: (req.query.category as string) || '',
      restaurantId: (req.query.restaurantId as string) || '',
      sortBy: (req.query.sortBy as string) || 'newest',
      isVegetarian: req.query.isVegetarian as string,
      isSpicy: req.query.isSpicy as string,
      status: (req.query.status as string) || '',
      minPrice: req.query.minPrice as string,
      maxPrice: req.query.maxPrice as string,
      openNow: req.query.openNow as string,
      featuredOnly: req.query.featuredOnly as string,
      page: req.query.page as string,
      limit: req.query.limit as string,
    };

    const result = await FoodService.getAllGlobalFoodItems(queryParams);

    res.status(200).json({
      success: true,
      message: 'Food items fetched successfully',
      data: result.data,
      pagination: result.pagination,
      meta: result.meta,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch food items',
      data: [],
    });
  }
};

/**
 * Get all distinct food categories
 */
const getDistinctCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await FoodService.getDistinctCategories();
    res.status(200).json({
      success: true,
      message: 'Categories fetched successfully',
      data: categories,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch categories',
      data: [],
    });
  }
};

export const FoodController = {
  getAllGlobalFoodItems,
  getDistinctCategories,
};
