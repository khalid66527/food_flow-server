import { Request, Response } from 'express';
import { CartService } from './cart.service';

const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId || !String(userId).trim()) {
      res.status(400).json({ success: false, message: 'User ID is required.' });
      return;
    }

    const cart = await CartService.getCartByUser(userId);

    res.status(200).json({
      success: true,
      message: 'Cart fetched successfully',
      data: cart,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch cart',
    });
  }
};

const addItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const payload = req.body;

    if (!userId || !String(userId).trim()) {
      res.status(400).json({ success: false, message: 'User ID is required.' });
      return;
    }

    const item = await CartService.addToCart(userId, payload);

    res.status(201).json({
      success: true,
      message: 'Item added to cart successfully',
      data: item,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Failed to add item to cart',
    });
  }
};

const updateQuantity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, foodId } = req.params;
    const quantity = Number(req.body.quantity ?? req.query.quantity);

    if (!userId || !String(userId).trim()) {
      res.status(400).json({ success: false, message: 'User ID is required.' });
      return;
    }
    if (!foodId || !String(foodId).trim()) {
      res.status(400).json({ success: false, message: 'Food ID is required.' });
      return;
    }
    if (Number.isNaN(quantity)) {
      res.status(400).json({ success: false, message: 'Quantity must be a valid number.' });
      return;
    }

    const updated = await CartService.updateCartItem(userId, foodId, quantity);

    res.status(200).json({
      success: true,
      message: 'Cart item updated successfully',
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Failed to update cart item',
    });
  }
};

const removeItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, foodId } = req.params;

    if (!userId || !String(userId).trim()) {
      res.status(400).json({ success: false, message: 'User ID is required.' });
      return;
    }
    if (!foodId || !String(foodId).trim()) {
      res.status(400).json({ success: false, message: 'Food ID is required.' });
      return;
    }

    await CartService.removeCartItem(userId, foodId);

    res.status(200).json({
      success: true,
      message: 'Cart item removed successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Failed to remove cart item',
    });
  }
};

const clearCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId || !String(userId).trim()) {
      res.status(400).json({ success: false, message: 'User ID is required.' });
      return;
    }

    const result = await CartService.clearCart(userId);

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to clear cart',
    });
  }
};

export const CartController = {
  getCart,
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
};
