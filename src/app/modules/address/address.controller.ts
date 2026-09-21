import { Request, Response } from 'express';
import { AddressService } from './address.service';

/**
 * Get all addresses for the authenticated user.
 */
const getAddresses = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.authedUser?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const data = await AddressService.getAddressesByUser(userId);

    res.status(200).json({
      success: true,
      message: 'Addresses fetched successfully',
      data,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Failed to fetch addresses',
    });
  }
};

/**
 * Create a new address for the authenticated user.
 */
const addAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.authedUser?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const address = await AddressService.addAddress(userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: address,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Failed to add address',
    });
  }
};

/**
 * Update an existing address for the authenticated user.
 */
const updateAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.authedUser?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    if (!id) {
      res.status(400).json({ success: false, message: 'Address ID is required.' });
      return;
    }

    const address = await AddressService.updateAddress(userId, id, req.body);

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: address,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Failed to update address',
    });
  }
};

/**
 * Delete an existing address for the authenticated user.
 */
const deleteAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.authedUser?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    if (!id) {
      res.status(400).json({ success: false, message: 'Address ID is required.' });
      return;
    }

    const result = await AddressService.deleteAddress(userId, id);

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Failed to delete address',
    });
  }
};

/**
 * Set a specific address as the authenticated user's default.
 */
const setDefaultAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.authedUser?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    if (!id) {
      res.status(400).json({ success: false, message: 'Address ID is required.' });
      return;
    }

    const address = await AddressService.setDefaultAddress(userId, id);

    res.status(200).json({
      success: true,
      message: 'Default address updated successfully',
      data: address,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Failed to set default address',
    });
  }
};

export const AddressController = {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
