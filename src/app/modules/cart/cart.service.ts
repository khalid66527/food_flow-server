import { cartCollection } from '../../config/db';
import { TCartItem } from './cart.interface';

/**
 * Get the full cart for a given user, sorted by most recently added first.
 */
const getCartByUser = async (userId: string) => {
  const items = (await cartCollection
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray()) as TCartItem[];

  const itemsWithoutId = items.map((item) => normalizeCartDoc(item));

  return {
    items: itemsWithoutId,
    totalItems: itemsWithoutId.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: itemsWithoutId.reduce((sum, item) => {
      const price = item.discountPrice || item.price;
      return sum + price * item.quantity;
    }, 0),
  };
};

/**
 * Add an item to the user's cart. If the same food already exists in the cart,
 * increment its quantity; otherwise insert a new line item.
 */
const addToCart = async (userId: string, payload: Partial<TCartItem>) => {
  const foodId = String(payload.foodId || '').trim();

  if (!userId) throw new Error('User ID is required.');
  if (!foodId) throw new Error('Food ID is required.');
  if (!payload.name) throw new Error('Food name is required.');
  if (payload.price === undefined || Number.isNaN(Number(payload.price))) {
    throw new Error('A valid price is required.');
  }

  const now = new Date().toISOString();
  const normalizedPayload: Partial<TCartItem> = {
    userId,
    foodId,
    restaurantId: String(payload.restaurantId || ''),
    name: String(payload.name || ''),
    price: Number(payload.price),
    image: payload.image ? String(payload.image) : undefined,
    restaurantName: payload.restaurantName ? String(payload.restaurantName) : undefined,
    specialInstructions: payload.specialInstructions
      ? String(payload.specialInstructions)
      : undefined,
  };

  const discountNum =
    payload.discountPrice !== undefined ? Number(payload.discountPrice) : NaN;
  if (!Number.isNaN(discountNum) && discountNum > 0) {
    normalizedPayload.discountPrice = discountNum;
  }

  const existing = (await cartCollection.findOne({ userId, foodId })) as TCartItem | null;
  if (existing) {
    const incrementBy = Math.max(1, Number(payload.quantity) || 1);
    const newQuantity = (existing.quantity || 1) + incrementBy;
    await cartCollection.updateOne(
      { _id: existing._id as any },
      { $set: { quantity: newQuantity, ...normalizedPayload, updatedAt: now } }
    );
    return normalizeCartDoc({
      ...existing,
      ...normalizedPayload,
      quantity: newQuantity,
      updatedAt: now,
    });
  }

  const newDoc: TCartItem = {
    ...normalizedPayload,
    quantity: Math.max(1, Number(payload.quantity) || 1),
    createdAt: now,
    updatedAt: now,
  } as TCartItem;

  const inserted = await cartCollection.insertOne(newDoc as any);
  return normalizeCartDoc({ ...newDoc, _id: inserted.insertedId });
};

/**
 * Build a query that matches a cart line by either the real food id or the
 * cart line-item `_id`, so interactive update/remove work regardless of which
 * id the client sends.
 */
const cartLineQuery = (userId: string, foodId: string): any => {
  const foodIdTrim = String(foodId).trim();
  return {
    userId,
    $or: [{ foodId: foodIdTrim }, { _id: foodIdTrim }],
  };
};

/**
 * Update the quantity of a specific food item in the user's cart using an
 * atomic delta increment so concurrent/rapid requests compose correctly.
 * If the resulting quantity drops to or below zero, the item is removed.
 */
const updateCartItem = async (userId: string, foodId: string, delta: number) => {
  if (!userId) throw new Error('User ID is required.');
  if (!foodId) throw new Error('Food ID is required.');

  const change = Number(delta);
  if (Number.isNaN(change)) throw new Error('A numeric delta is required.');

  const query = cartLineQuery(userId, foodId);

  const now = new Date().toISOString();
  const updated = (await cartCollection.findOneAndUpdate(
    query,
    { $inc: { quantity: change }, $set: { updatedAt: now } },
    { returnDocument: 'after' }
  )) as TCartItem | null;

  if (!updated) throw new Error('Cart item not found.');

  if (Number(updated.quantity) <= 0) {
    await cartCollection.deleteOne(query);
    return { removed: true, quantity: 0 };
  }

  return normalizeCartDoc(updated);
};

/**
 * Remove a single food item from the user's cart.
 */
const removeCartItem = async (userId: string, foodId: string) => {
  if (!userId) throw new Error('User ID is required.');
  if (!foodId) throw new Error('Food ID is required.');

  const result = await cartCollection.deleteOne(cartLineQuery(userId, foodId));
  if (result.deletedCount === 0) throw new Error('Cart item not found.');
  return { removed: true };
};

/**
 * Clear all items from the user's cart.
 */
const clearCart = async (userId: string) => {
  if (!userId) throw new Error('User ID is required.');

  const result = await cartCollection.deleteMany({ userId });
  return { cleared: result.deletedCount ?? 0 };
};

/**
 * Normalize a raw cart document into a clean API shape.
 */
const normalizeCartDoc = (doc: TCartItem) => {
  const { _id, ...rest } = doc;
  const price = Number(doc.price);
  const discountPrice =
    doc.discountPrice !== undefined && Number(doc.discountPrice) > 0
      ? Number(doc.discountPrice)
      : undefined;
  return {
    ...rest,
    _id: _id ? String(_id) : undefined,
    price,
    ...(discountPrice ? { discountPrice } : {}),
  };
};

export const CartService = {
  getCartByUser,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
