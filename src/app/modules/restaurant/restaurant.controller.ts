import { Request, Response } from 'express';
import { RestaurantService } from './restaurant.service';

const createRestaurant = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;
    if (!payload?.restaurantName) {
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

const getAllRestaurants = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await RestaurantService.getAllRestaurants(req.query);

    res.status(200).json({
      success: true,
      message: 'Restaurants fetched successfully',
      meta: result.meta,
      data: result.data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch restaurants',
    });
  }
};

const getSingleRestaurant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idOrSlug } = req.params;
    const restaurant = await RestaurantService.getSingleRestaurant(idOrSlug);

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
    });
  }
};

export const RestaurantController = {
  createRestaurant,
  getMyProfile,
  updateMyProfile,
  toggleStatus,
  getAllRestaurants,
  getSingleRestaurant,
};
