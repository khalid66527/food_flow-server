import { Request, Response } from 'express';
import { AdminService } from './admin.service';

/**
 * Get all users with filtering, search, pagination, and stats
 */
const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = {
      role: req.query.role as string,
      status: req.query.status as string,
      search: req.query.search as string,
      page: req.query.page as string,
      limit: req.query.limit as string,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const result = await AdminService.getAllUsers(query);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully!',
      meta: result.meta,
      data: result.data,
    });
  } catch (error: any) {
    console.error('Error fetching users in AdminController:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve users',
    });
  }
};

/**
 * Get single user by ID or Email
 */
const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, message: 'User ID is required.' });
      return;
    }

    const user = await AdminService.getUserById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User details retrieved successfully!',
      data: user,
    });
  } catch (error: any) {
    console.error('Error fetching user by id in AdminController:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve user',
    });
  }
};

/**
 * Update user role (e.g. Customer, Restaurant, Rider, Admin)
 */
const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      res.status(400).json({ success: false, message: 'Role is required.' });
      return;
    }

    const validRoles = [
      'Customer',
      'Restaurant',
      'Rider',
      'Admin',
      'Restaurant Partner',
      'Delivery Partner',
      'customer',
      'restaurant',
      'rider',
      'admin',
      'restaurant partner',
      'delivery partner',
      'super-admin',
    ];
    if (!validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: 'Invalid role. Must be Customer, Restaurant Partner, Delivery Partner, or Admin.',
      });
      return;
    }

    const result = await AdminService.updateUserRole(id, role);
    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'User not found to update role.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `User role successfully updated to ${role}!`,
      data: { id, role },
    });
  } catch (error: any) {
    console.error('Error updating user role in AdminController:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user role',
    });
  }
};

/**
 * Update user status (active / blocked / inactive)
 */
const updateUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ success: false, message: 'Status is required.' });
      return;
    }

    const result = await AdminService.updateUserStatus(id, status);
    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'User not found to update status.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `User status successfully updated to ${status}!`,
      data: { id, status },
    });
  } catch (error: any) {
    console.error('Error updating user status in AdminController:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user status',
    });
  }
};

/**
 * Update user general profile
 */
const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const result = await AdminService.updateUser(id, payload);
    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'User not found to update.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User profile updated successfully!',
      data: { id, ...payload },
    });
  } catch (error: any) {
    console.error('Error updating user in AdminController:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user',
    });
  }
};

/**
 * Delete a user by ID
 */
const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, message: 'User ID is required.' });
      return;
    }

    const result = await AdminService.deleteUser(id);
    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'User not found to delete.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully!',
      data: { id },
    });
  } catch (error: any) {
    console.error('Error deleting user in AdminController:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete user',
    });
  }
};

/**
 * Get Restaurant details by owner email or owner ID
 */
const getRestaurantDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;
    if (!identifier) {
      res.status(400).json({ success: false, message: 'Restaurant identifier is required.' });
      return;
    }

    const restaurant = await AdminService.getRestaurantDetails(identifier);
    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Restaurant details retrieved successfully!',
      data: restaurant,
    });
  } catch (error: any) {
    console.error('Error fetching restaurant details in AdminController:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve restaurant details',
    });
  }
};

/**
 * Get all restaurants for Admin
 */
const getAllRestaurants = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = {
      status: req.query.status as string,
      search: req.query.search as string,
      page: req.query.page as string,
      limit: req.query.limit as string,
    };

    const result = await AdminService.getAllRestaurantsAdmin(query);

    res.status(200).json({
      success: true,
      message: 'Restaurants retrieved successfully!',
      meta: result.meta,
      data: result.data,
    });
  } catch (error: any) {
    console.error('Error fetching restaurants in AdminController:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve restaurants',
    });
  }
};

/**
 * Update restaurant status (approve to active, suspend, reject, pending)
 */
const updateRestaurantStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      res.status(400).json({ success: false, message: 'Restaurant ID and status are required.' });
      return;
    }

    const updated = await AdminService.updateRestaurantStatusAdmin(id, status);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Restaurant not found to update status.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Restaurant status updated to "${status}" successfully!`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating restaurant status in AdminController:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update restaurant status',
    });
  }
};

/**
 * Delete a restaurant
 */
const deleteRestaurant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, message: 'Restaurant ID is required.' });
      return;
    }

    const result = await AdminService.deleteRestaurantAdmin(id);
    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'Restaurant not found to delete.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Restaurant deleted successfully!',
      data: { id },
    });
  } catch (error: any) {
    console.error('Error deleting restaurant in AdminController:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete restaurant',
    });
  }
};

/**
 * Get all riders for Admin
 */
const getAllRiders = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = {
      status: req.query.status as string,
      search: req.query.search as string,
      page: req.query.page as string,
      limit: req.query.limit as string,
    };

    const result = await AdminService.getAllRidersAdmin(query);

    res.status(200).json({
      success: true,
      message: 'Riders retrieved successfully!',
      meta: result.meta,
      data: result.data,
    });
  } catch (error: any) {
    console.error('Error fetching riders in AdminController:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve riders',
    });
  }
};

/**
 * Update rider status (approve to active, suspend, reject, pending)
 */
const updateRiderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      res.status(400).json({ success: false, message: 'Rider ID and status are required.' });
      return;
    }

    const updated = await AdminService.updateRiderStatusAdmin(id, status);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Rider not found to update status.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Rider status updated to "${status}" successfully!`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating rider status in AdminController:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update rider status',
    });
  }
};

/**
 * Delete a rider
 */
const deleteRider = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, message: 'Rider ID is required.' });
      return;
    }

    const result = await AdminService.deleteRiderAdmin(id);
    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'Rider not found to delete.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Rider deleted successfully!',
      data: { id },
    });
  } catch (error: any) {
    console.error('Error deleting rider in AdminController:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete rider',
    });
  }
};

/**
 * Get Restaurant & Rider combined stats
 */
const getRestaurantAndRiderStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await AdminService.getRestaurantAndRiderStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error fetching restaurant & rider stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve stats',
    });
  }
};

export const AdminController = {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  updateUser,
  deleteUser,
  getRestaurantDetails,
  getAllRestaurants,
  updateRestaurantStatus,
  deleteRestaurant,
  getAllRiders,
  updateRiderStatus,
  deleteRider,
  getRestaurantAndRiderStats,
};

