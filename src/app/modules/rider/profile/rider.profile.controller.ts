import { Request, Response } from 'express';
import { RiderProfileService } from './rider.profile.service';

/**
 * Get My Rider Profile
 */
const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = (req.query.email as string) || (req.headers['x-user-email'] as string);
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
    const identifier = email || userId;

    if (!identifier) {
      res.status(400).json({
        success: false,
        message: 'Rider email or user ID is required to fetch profile.',
      });
      return;
    }

    const rider = await RiderProfileService.getMyRiderProfile(identifier);

    if (!rider) {
      res.status(200).json({
        success: true,
        data: null,
        message: 'No rider profile found for this user.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: rider,
      message: 'Rider profile retrieved successfully!',
    });
  } catch (error: any) {
    console.error('Error fetching rider profile:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch rider profile',
    });
  }
};

/**
 * Create a new Rider Profile
 */
const createProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;

    if (!payload.email || !payload.name) {
      res.status(400).json({
        success: false,
        message: 'Name and email are required.',
      });
      return;
    }

    const newRider = await RiderProfileService.createRiderProfile(payload);

    res.status(201).json({
      success: true,
      message: 'Rider profile created successfully!',
      data: newRider,
    });
  } catch (error: any) {
    console.error('Error creating rider profile:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create rider profile',
    });
  }
};

/**
 * Update existing Rider Profile
 */
const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = (req.query.email as string) || req.body.email;
    const userId = (req.query.userId as string) || req.body.userId;
    const identifier = email || userId;

    if (!identifier) {
      res.status(400).json({
        success: false,
        message: 'Email or User ID is required to update profile.',
      });
      return;
    }

    const updatedRider = await RiderProfileService.updateRiderProfile(identifier, req.body);

    res.status(200).json({
      success: true,
      message: 'Rider profile updated successfully!',
      data: updatedRider,
    });
  } catch (error: any) {
    console.error('Error updating rider profile:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update rider profile',
    });
  }
};

/**
 * Toggle Rider Online Availability
 */
const toggleAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, userId, isAvailable } = req.body;
    const identifier = email || userId;

    if (!identifier || typeof isAvailable !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'Identifier and isAvailable boolean are required.',
      });
      return;
    }

    const updated = await RiderProfileService.toggleAvailability(identifier, isAvailable);

    res.status(200).json({
      success: true,
      message: `Rider is now ${isAvailable ? 'Online & Available' : 'Offline'}`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error toggling rider availability:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update availability status',
    });
  }
};

/**
 * Delete Rider Profile
 */
const deleteProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, userId } = req.body;
    const identifier = email || userId || (req.query.email as string);

    if (!identifier) {
      res.status(400).json({
        success: false,
        message: 'Identifier is required to delete profile.',
      });
      return;
    }

    const result = await RiderProfileService.deleteRiderProfile(identifier);

    res.status(200).json({
      success: true,
      message: 'Rider profile deleted successfully!',
      data: result,
    });
  } catch (error: any) {
    console.error('Error deleting rider profile:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete rider profile',
    });
  }
};

/**
 * Get All Riders (for listing/discovery)
 */
const getAllRiders = async (_req: Request, res: Response): Promise<void> => {
  try {
    const riders = await RiderProfileService.getAllRiders();
    res.status(200).json({
      success: true,
      data: riders,
    });
  } catch (error: any) {
    console.error('Error fetching all riders:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch riders',
    });
  }
};

export const RiderProfileController = {
  getMyProfile,
  createProfile,
  updateProfile,
  toggleAvailability,
  deleteProfile,
  getAllRiders,
};
