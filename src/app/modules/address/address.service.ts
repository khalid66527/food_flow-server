import { ObjectId } from 'mongodb';
import { addressCollection } from '../../config/db';
import { TAddress } from './address.interface';

/**
 * Safely convert a string id to an ObjectId. Falls back to the raw string
 * if the value is not a valid ObjectId hex string (defensive).
 */
const toObjectId = (id: string): ObjectId | string => {
  try {
    return new ObjectId(id);
  } catch {
    return id;
  }
};

/**
 * Build a query that scopes an address operation to the authenticated user
 * AND a specific address id, so a caller can never touch another user's
 * records even if they guess/supply an address id.
 */
const userAddressQuery = (userId: string, id: string): any => ({
  userId,
  _id: toObjectId(id),
});

/**
 * Get all saved addresses for a user, with defaults first, newest first.
 */
const getAddressesByUser = async (userId: string) => {
  if (!userId) throw new Error('User ID is required.');

  const docs = (await addressCollection
    .find({ userId })
    .sort({ isDefault: -1, createdAt: -1 })
    .toArray()) as TAddress[];

  return docs.map((doc) => normalizeAddressDoc(doc));
};

/**
 * Add a new address for the user. If the address is marked as the default,
 * unset the default flag on all of the user's other addresses first so only
 * one default ever exists.
 */
const addAddress = async (userId: string, payload: Partial<TAddress>) => {
  if (!userId) throw new Error('User ID is required.');

  const data = validateAddressPayload(payload);
  const now = new Date().toISOString();

  const doc: TAddress = {
    userId,
    fullName: data.fullName,
    phoneNumber: data.phoneNumber,
    streetAddress: data.streetAddress,
    area: data.area,
    isDefault: data.isDefault as boolean,
    building: data.building,
    postalCode: data.postalCode,
    deliveryInstructions: data.deliveryInstructions,
    createdAt: now,
    updatedAt: now,
  };

  if (doc.isDefault) {
    await clearOtherDefaults(userId);
  }

  const inserted = await addressCollection.insertOne(doc as any);
  return normalizeAddressDoc({ ...doc, _id: inserted.insertedId });
};

/**
 * Update an existing address. If the update sets isDefault to true, unset the
 * default flag on all of the user's other addresses so only one default exists.
 */
const updateAddress = async (userId: string, id: string, payload: Partial<TAddress>) => {
  if (!userId) throw new Error('User ID is required.');
  if (!id) throw new Error('Address ID is required.');

  const existing = (await addressCollection.findOne(
    userAddressQuery(userId, id)
  )) as TAddress | null;
  if (!existing) throw new Error('Address not found.');

  // Merge provided values over the existing record so partial updates keep the
  // original required fields intact instead of overwriting them with blanks.
  const merged: Partial<TAddress> = {
    fullName: payload.fullName !== undefined ? payload.fullName : existing.fullName,
    phoneNumber:
      payload.phoneNumber !== undefined ? payload.phoneNumber : existing.phoneNumber,
    streetAddress:
      payload.streetAddress !== undefined ? payload.streetAddress : existing.streetAddress,
    area: payload.area !== undefined ? payload.area : existing.area,
    building: payload.building !== undefined ? payload.building : existing.building,
    postalCode: payload.postalCode !== undefined ? payload.postalCode : existing.postalCode,
    deliveryInstructions:
      payload.deliveryInstructions !== undefined
        ? payload.deliveryInstructions
        : existing.deliveryInstructions,
    isDefault: payload.isDefault !== undefined ? payload.isDefault : existing.isDefault,
  };

  const data = validateAddressPayload(merged, false);
  const now = new Date().toISOString();

  const desiredDefault = data.isDefault;

  if (desiredDefault) {
    await clearOtherDefaults(userId, id);
  }

  const updated = (await addressCollection.findOneAndUpdate(
    userAddressQuery(userId, id),
    {
      $set: {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        streetAddress: data.streetAddress,
        area: data.area,
        building: data.building,
        postalCode: data.postalCode,
        deliveryInstructions: data.deliveryInstructions,
        isDefault: desiredDefault as boolean,
        updatedAt: now,
      },
    },
    { returnDocument: 'after' }
  )) as TAddress | null;

  if (!updated) throw new Error('Address not found.');
  return normalizeAddressDoc(updated);
};

/**
 * Delete a specific address belonging to the user.
 */
const deleteAddress = async (userId: string, id: string) => {
  if (!userId) throw new Error('User ID is required.');
  if (!id) throw new Error('Address ID is required.');

  const result = await addressCollection.deleteOne(userAddressQuery(userId, id));
  if (result.deletedCount === 0) throw new Error('Address not found.');
  return { deleted: true };
};

/**
 * Set a specific address as the user's default and unset all other defaults.
 */
const setDefaultAddress = async (userId: string, id: string) => {
  if (!userId) throw new Error('User ID is required.');
  if (!id) throw new Error('Address ID is required.');

  const now = new Date().toISOString();
  const query = userAddressQuery(userId, id);

  const existing = (await addressCollection.findOne(query)) as TAddress | null;
  if (!existing) throw new Error('Address not found.');

  await clearOtherDefaults(userId, id);
  await addressCollection.updateOne(
    query,
    { $set: { isDefault: true, updatedAt: now } }
  );

  const updated = (await addressCollection.findOne(query)) as TAddress | null;
  if (!updated) throw new Error('Address not found.');
  return normalizeAddressDoc(updated);
};

/**
 * Clear the isDefault flag on all of the user's addresses, optionally
 * excluding one id (used when making that address the new default).
 */
const clearOtherDefaults = async (userId: string, excludeId?: string) => {
  await addressCollection.updateMany(
    { userId, isDefault: true, ...(excludeId ? { _id: { $ne: toObjectId(excludeId) as ObjectId } } : {}) },
    { $set: { isDefault: false } }
  );
};

/**
 * Validate and coerce an address payload. When `partial` is true (updates),
 * required fields fall back to the existing values so optional partial updates
 * still persist correctly.
 */
const validateAddressPayload = (
  payload: Partial<TAddress>,
  partial = false
): {
  fullName: string;
  phoneNumber: string;
  streetAddress: string;
  area: string;
  building?: string;
  postalCode?: string;
  deliveryInstructions?: string;
  isDefault?: boolean;
} => {
  const fullName = String(payload.fullName ?? '').trim();
  const phoneNumber = String(payload.phoneNumber ?? '').trim();
  const streetAddress = String(payload.streetAddress ?? '').trim();
  const area = String(payload.area ?? '').trim();

  if (!partial) {
    if (!fullName) throw new Error('Full name is required.');
    if (!phoneNumber) throw new Error('Phone number is required.');
    if (!streetAddress) throw new Error('Street address is required.');
    if (!area) throw new Error('Area is required.');
  }

  return {
    fullName,
    phoneNumber,
    streetAddress,
    area,
    building: payload.building ? String(payload.building).trim() : undefined,
    postalCode: payload.postalCode ? String(payload.postalCode).trim() : undefined,
    deliveryInstructions: payload.deliveryInstructions
      ? String(payload.deliveryInstructions).trim()
      : undefined,
    isDefault: payload.isDefault === true,
  };
};

/**
 * Normalize a raw address document into a clean API shape with a string _id.
 */
const normalizeAddressDoc = (doc: TAddress) => {
  const { _id, ...rest } = doc;
  return {
    ...rest,
    _id: _id ? String(_id) : undefined,
  };
};

export const AddressService = {
  getAddressesByUser,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
