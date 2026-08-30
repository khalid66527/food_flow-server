import { ObjectId } from 'mongodb';
import { riderCollection, usersCollection } from '../../../config/db';
import { TRiderProfile } from './rider.profile.interface';

/**
 * Get Rider Profile by Email, User ID, or Rider _id
 */
const getMyRiderProfile = async (identifier: string) => {
  if (!identifier) return null;

  const query: Record<string, any>[] = [
    { email: identifier },
    { userId: identifier },
    { phone: identifier },
  ];

  if (ObjectId.isValid(identifier)) {
    try {
      query.push({ _id: new ObjectId(identifier) });
    } catch (e) {
      // ignore
    }
  }

  const rider = await riderCollection.findOne({ $or: query });
  return rider;
};

/**
 * Create a new Rider Profile
 */
const createRiderProfile = async (payload: Partial<TRiderProfile>) => {
  const { email, phone, name, userId } = payload;

  if (!email || !name) {
    throw new Error('Name and email are required to create a rider profile.');
  }

  // Check if rider profile already exists
  const existingRider = await riderCollection.findOne({
    $or: [{ email }, ...(userId ? [{ userId }] : [])],
  });

  if (existingRider) {
    throw new Error('A rider profile already exists for this account.');
  }

  const now = new Date();

  const newRiderDoc: TRiderProfile = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : '',
    userId: userId || '',
    avatar: payload.avatar || '',
    nidNumber: payload.nidNumber || '',
    drivingLicenseNumber: payload.drivingLicenseNumber || '',
    vehicleType: payload.vehicleType || 'bike',
    vehicleBrand: payload.vehicleBrand || '',
    vehicleNumber: payload.vehicleNumber || '',
    deliveryZone: payload.deliveryZone || 'Dhaka Central',
    city: payload.city || 'Dhaka',
    address: payload.address || {
      street: '',
      area: '',
      city: payload.city || 'Dhaka',
      fullAddress: '',
    },
    emergencyContact: payload.emergencyContact || {
      name: '',
      relation: '',
      phone: '',
    },
    isAvailable: payload.isAvailable !== undefined ? payload.isAvailable : true,
    status: payload.status || 'active',
    totalDeliveries: payload.totalDeliveries || 0,
    rating: payload.rating || 5.0,
    totalEarnings: payload.totalEarnings || 0,
    bio: payload.bio || '',
    createdAt: now,
    updatedAt: now,
  };

  const result = await riderCollection.insertOne(newRiderDoc as any);

  // Sync role to Delivery Partner in user collection if exists
  await usersCollection.updateOne(
    { email: email.trim().toLowerCase() },
    { $set: { role: 'Delivery Partner', updatedAt: now } }
  ).catch(() => {});

  const createdRider = await riderCollection.findOne({ _id: result.insertedId });
  return createdRider;
};

/**
 * Update existing Rider Profile
 */
const updateRiderProfile = async (identifier: string, payload: Partial<TRiderProfile>) => {
  if (!identifier) {
    throw new Error('Rider identifier is required.');
  }

  const query: Record<string, any>[] = [
    { email: identifier },
    { userId: identifier },
  ];

  if (ObjectId.isValid(identifier)) {
    try {
      query.push({ _id: new ObjectId(identifier) });
    } catch (e) {}
  }

  const existingRider = await riderCollection.findOne({ $or: query });
  if (!existingRider) {
    throw new Error('Rider profile not found.');
  }

  const updateData: Record<string, any> = {
    ...payload,
    updatedAt: new Date(),
  };

  delete updateData._id;
  delete updateData.createdAt;

  await riderCollection.updateOne({ _id: existingRider._id }, { $set: updateData });

  const updatedRider = await riderCollection.findOne({ _id: existingRider._id });
  return updatedRider;
};

/**
 * Toggle Rider online availability
 */
const toggleAvailability = async (identifier: string, isAvailable: boolean) => {
  const query: Record<string, any>[] = [
    { email: identifier },
    { userId: identifier },
  ];

  if (ObjectId.isValid(identifier)) {
    try {
      query.push({ _id: new ObjectId(identifier) });
    } catch (e) {}
  }

  const result = await riderCollection.findOneAndUpdate(
    { $or: query },
    {
      $set: {
        isAvailable,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  return result;
};

/**
 * Delete Rider Profile
 */
const deleteRiderProfile = async (identifier: string) => {
  const query: Record<string, any>[] = [
    { email: identifier },
    { userId: identifier },
  ];

  if (ObjectId.isValid(identifier)) {
    try {
      query.push({ _id: new ObjectId(identifier) });
    } catch (e) {}
  }

  const result = await riderCollection.deleteOne({ $or: query });
  return result;
};

/**
 * Get all riders with optional filters
 */
const getAllRiders = async () => {
  const riders = await riderCollection.find({}).sort({ createdAt: -1 }).toArray();
  return riders;
};

export const RiderProfileService = {
  getMyRiderProfile,
  createRiderProfile,
  updateRiderProfile,
  toggleAvailability,
  deleteRiderProfile,
  getAllRiders,
};
