import { Request, Response } from 'express';
import { RestaurantService } from './restaurant.service';
import { TRestaurantQueryParams } from './restaurant.interface';

const createRestaurant = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;
    if (!payload?.restaurantName && !payload?.name) {
      res.status(400).json({ success: false, message: 'Restaurant Name is required.' });
      return;
    }

    const result = await RestaurantService.createOrUpdateRestaurant(payload);
    const message = result.isUpdated
      ? 'Existing restaurant profile updated successfully!'
      : 'Restaurant profile created successfully!';

    res.status(result.isUpdated ? 200 : 201).json({
      success: true,
      message,
      data: result.data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to create restaurant profile',
    });
  }
};

const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerEmail =
      (req.query.ownerEmail as string) ||
      (req.query.email as string) ||
      (req.headers['x-user-email'] as string);
    const ownerId =
      (req.query.ownerId as string) ||
      (req.query.id as string) ||
      (req.headers['x-user-id'] as string);

    const restaurant = await RestaurantService.getMyRestaurantProfile(ownerEmail, ownerId);

    if (!restaurant) {
      res.status(200).json({
        success: false,
        message: 'No restaurant found for this account',
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Restaurant profile fetched successfully',
      data: restaurant,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch restaurant profile',
    });
  }
};

const updateMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerEmail =
      (req.query.ownerEmail as string) ||
      (req.query.email as string) ||
      (req.headers['x-user-email'] as string) ||
      req.body.ownerEmail ||
      req.body.contactEmail;

    const result = await RestaurantService.updateMyRestaurantProfile(ownerEmail, req.body);

    if (!result) {
      res.status(404).json({
        success: false,
        message: 'Restaurant profile not found for update',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Restaurant profile updated successfully!',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to update profile',
    });
  }
};

const toggleStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerEmail, email, isOpen } = req.body;
    const targetEmail =
      ownerEmail ||
      email ||
      (req.query.ownerEmail as string) ||
      (req.query.email as string) ||
      (req.headers['x-user-email'] as string);

    const result = await RestaurantService.toggleRestaurantStatus(targetEmail, isOpen);

    if (!result) {
      res.status(404).json({
        success: false,
        message: 'Restaurant not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Restaurant is now ${isOpen ? 'Open' : 'Closed'}`,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to toggle status',
    });
  }
};

/**
 * Get All Restaurants (Search, Filter, Sort, Pagination)
 */
const getAllRestaurants = async (req: Request, res: Response): Promise<void> => {
  try {
    const queryParams: TRestaurantQueryParams = {
      search: (req.query.search as string) || (req.query.searchQuery as string),
      searchQuery: (req.query.searchQuery as string) || (req.query.search as string),
      category: (req.query.category as string) || (req.query.cuisine as string),
      cuisine: (req.query.cuisine as string) || (req.query.category as string),
      restaurantId: req.query.restaurantId as string,
      sortBy: req.query.sortBy as string,
      priceRange: req.query.priceRange as string,
      minRating: req.query.minRating as string,
      freeDelivery: req.query.freeDelivery as string,
      openNow: req.query.openNow as string,
      featuredOnly: req.query.featuredOnly as string,
      location: (req.query.location as string) || (req.query.city as string),
      city: (req.query.city as string) || (req.query.location as string),
      division: (req.query.division as string) || '',
      district: (req.query.district as string) || '',
      upazila: (req.query.upazila as string) || '',
      lat: (req.query.lat as string) || (req.query.latitude as string),
      lng: (req.query.lng as string) || (req.query.longitude as string),
      page: req.query.page as string,
      limit: req.query.limit as string,
    };

    const result = await RestaurantService.getAllRestaurants(queryParams);

    res.status(200).json({
      success: true,
      message: 'Restaurants fetched successfully',
      data: result.data,
      pagination: result.pagination,
      meta: result.meta,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch restaurants',
      data: [],
    });
  }
};

/**
 * Add Food Item to Restaurant Menu
 */
const addFoodItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, price, restaurantId } = req.body;

    if (!name || !String(name).trim()) {
      res.status(400).json({ success: false, message: 'Food Name is required.' });
      return;
    }
    const priceNum = Number(price);
    if (price === undefined || price === null || Number.isNaN(priceNum) || priceNum <= 0) {
      res
        .status(400)
        .json({ success: false, message: 'Food Price must be a valid amount greater than 0.' });
      return;
    }
    if (!restaurantId || !String(restaurantId).trim()) {
      res.status(400).json({ success: false, message: 'Restaurant ID is required.' });
      return;
    }

    const foodItem = await RestaurantService.addFoodItem(req.body);
    res.status(201).json({
      success: true,
      message: 'Food item added successfully',
      data: foodItem,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Failed to add food item',
    });
  }
};

/**
 * Get Restaurant Menu Items
 */
const getRestaurantMenu = async (req: Request, res: Response): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    const items = await RestaurantService.getRestaurantMenu(restaurantId);
    res.status(200).json({
      success: true,
      message: 'Menu items fetched successfully',
      data: items,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch menu items',
      data: [],
    });
  }
};

/**
 * Update Food Item
 */
const updateFoodItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { foodId } = req.params;
    const updated = await RestaurantService.updateFoodItem(foodId, req.body);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Food item not found' });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Food item updated successfully',
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Failed to update food item',
    });
  }
};

/**
 * Toggle Food Item Availability
 */
const toggleFoodAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { foodId } = req.params;
    const { isAvailable, status } = req.body;
    const availableFlag = typeof isAvailable === 'boolean' ? isAvailable : status === 'available';

    const updated = await RestaurantService.toggleFoodAvailability(foodId, availableFlag);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Food item not found' });
      return;
    }
    res.status(200).json({
      success: true,
      message: `Food item is now ${availableFlag ? 'Available' : 'Unavailable'}`,
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Failed to toggle food availability',
    });
  }
};

/**
 * Delete Food Item
 */
const deleteFoodItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { foodId } = req.params;
    const deleted = await RestaurantService.deleteFoodItem(foodId);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Food item not found or already deleted' });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Food item deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Failed to delete food item',
    });
  }
};

/**
 * Get Single Food Item Details by ID
 */
const getFoodItemDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { foodId } = req.params;
    const foodItem = await RestaurantService.getFoodItemById(foodId);
    if (!foodItem) {
      res.status(404).json({
        success: false,
        message: 'Food item not found',
        data: null,
      });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Food item details fetched successfully',
      data: foodItem,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch food details',
      data: null,
    });
  }
};

/**
 * Get Single Restaurant Details by ID or Slug
 */
const getSingleRestaurant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurant = await RestaurantService.getSingleRestaurant(id);
    if (!restaurant) {
      res.status(404).json({
        success: false,
        message: 'Restaurant not found',
        data: null,
      });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Restaurant fetched successfully',
      data: restaurant,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch restaurant',
      data: null,
    });
  }
};

/**
 * Get Grocery Foods strictly for a specific Restaurant
 */
const getRestaurantGroceryItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    if (!restaurantId || !String(restaurantId).trim()) {
      res.status(400).json({
        success: false,
        message: 'Restaurant ID is required',
        data: [],
      });
      return;
    }

    const items = await RestaurantService.getRestaurantGroceryFoods(restaurantId);
    res.status(200).json({
      success: true,
      message: 'Restaurant grocery items fetched successfully',
      data: items,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch restaurant grocery items',
      data: [],
    });
  }
};

/**
 * Aggregate Grocery Ingredient List for selected dishes & quantities
 */
const aggregateGroceryList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { restaurantId, selectedItems } = req.body;
    if (!restaurantId || !String(restaurantId).trim()) {
      res.status(400).json({
        success: false,
        message: 'Restaurant ID is required for grocery aggregation',
      });
      return;
    }

    if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
      res.status(400).json({
        success: false,
        message: 'At least one food item must be selected for aggregation',
      });
      return;
    }

    const result = await RestaurantService.aggregateGroceryList(restaurantId, selectedItems);
    res.status(200).json({
      success: true,
      message: 'Grocery ingredients aggregated successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to aggregate grocery ingredients',
    });
  }
};

/**
 * Update Secret Grocery Raw Materials / Ingredients for a specific food item
 */
const updateFoodSecretRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { foodId } = req.params;
    const { ingredients } = req.body;

    if (!foodId) {
      res.status(400).json({
        success: false,
        message: 'Food ID is required',
      });
      return;
    }

    const updated = await RestaurantService.updateFoodSecretRecipe(foodId, ingredients);

    res.status(200).json({
      success: true,
      message: 'Secret recipe raw materials saved successfully',
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to update food secret recipe',
    });
  }
};

export const RestaurantController = {
  createRestaurant,
  getMyProfile,
  updateMyProfile,
  toggleStatus,
  getAllRestaurants,
  addFoodItem,
  getRestaurantMenu,
  updateFoodItem,
  toggleFoodAvailability,
  deleteFoodItem,
  getFoodItemDetails,
  getSingleRestaurant,
  getRestaurantGroceryItems,
  aggregateGroceryList,
  updateFoodSecretRecipe,
};


