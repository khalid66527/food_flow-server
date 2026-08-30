import { ObjectId } from 'mongodb';
import { usersCollection, restaurantCollection, db } from '../../config/db';
import { TUser, TUserQueryParams, IUserStats } from './admin.interface';

/**
 * Helper to get the correct user collection (checks 'user' or 'users')
 */
const getActiveUserCollection = async () => {
  const countInUser = await usersCollection.countDocuments().catch(() => 0);
  if (countInUser > 0) return usersCollection;

  const fallbackUsers = db.collection('users');
  const countInUsers = await fallbackUsers.countDocuments().catch(() => 0);
  if (countInUsers > 0) return fallbackUsers;

  return usersCollection;
};

/**
 * Standardize user role string
 */
const standardizeRole = (rawRole?: any): string => {
  if (!rawRole || typeof rawRole !== 'string') return 'Customer';
  const trimmed = rawRole.trim();
  if (/^(admin|super-admin|super_admin)/i.test(trimmed)) return 'admin';
  if (/^(restaurant|restaurant partner|restaurant_partner|vendor)/i.test(trimmed)) return 'Restaurant Partner';
  if (/^(rider|delivery partner|delivery_partner|delivery|driver)/i.test(trimmed)) return 'Delivery Partner';
  if (/^(customer|user|client)/i.test(trimmed)) return 'Customer';
  return trimmed;
};

/**
 * Regular expressions for role matching
 */
const ROLE_PATTERNS = {
  ADMIN: /^(admin|super-admin|super_admin)/i,
  RESTAURANT: /^(restaurant|restaurant partner|restaurant_partner|vendor)/i,
  RIDER: /^(rider|delivery partner|delivery_partner|delivery|driver)/i,
  CUSTOMER: /^(customer|user|client)/i,
};

/**
 * Build MongoDB user search/filter query
 */
const buildUserQuery = (queryParams: TUserQueryParams) => {
  const { role, status, search } = queryParams;
  const filter: Record<string, any> = {};

  // 1. Role Filter
  if (role && role.toLowerCase() !== 'all') {
    const roleLower = role.toLowerCase().trim();
    if (roleLower === 'customer') {
      filter.$or = [
        { role: { $regex: ROLE_PATTERNS.CUSTOMER } },
        { role: null },
        { role: { $exists: false } },
        { role: '' },
      ];
    } else if (roleLower === 'admin') {
      filter.role = { $regex: ROLE_PATTERNS.ADMIN };
    } else if (
      roleLower === 'restaurant' ||
      roleLower === 'restaurant partner' ||
      roleLower === 'restaurant_partner'
    ) {
      filter.role = { $regex: ROLE_PATTERNS.RESTAURANT };
    } else if (
      roleLower === 'rider' ||
      roleLower === 'delivery partner' ||
      roleLower === 'delivery_partner' ||
      roleLower === 'delivery'
    ) {
      filter.role = { $regex: ROLE_PATTERNS.RIDER };
    } else {
      filter.role = { $regex: new RegExp(`^${role}$`, 'i') };
    }
  }

  // 2. Status Filter
  if (status && status.toLowerCase() !== 'all') {
    filter.status = { $regex: new RegExp(`^${status}$`, 'i') };
  }

  // 3. Search Filter across name, email, phone
  if (search && search.trim() !== '') {
    const searchRegex = { $regex: search.trim(), $options: 'i' };
    const searchConditions = [
      { name: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
    ];

    if (filter.$or) {
      // combine with existing $or
      filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
      delete filter.$or;
    } else {
      filter.$or = searchConditions;
    }
  }

  return filter;
};

/**
 * Get all users with filters, search, pagination, stats & restaurant enrichment
 */
const getAllUsers = async (queryParams: TUserQueryParams) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = queryParams;

  const collection = await getActiveUserCollection();
  const filter = buildUserQuery(queryParams);

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.max(1, parseInt(String(limit), 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sortOptions: Record<string, 1 | -1> = {
    [sortBy]: sortDirection,
  };

  // Fetch users & total matching count
  const [rawUsers, total] = await Promise.all([
    collection.find(filter).sort(sortOptions).skip(skip).limit(limitNum).toArray(),
    collection.countDocuments(filter),
  ]);

  // Enrich Users with Restaurant info (if they own a restaurant)
  const usersWithRestaurant = await Promise.all(
    rawUsers.map(async (user: any) => {
      let restaurantData = null;
      try {
        restaurantData = await restaurantCollection.findOne({
          $or: [
            { ownerEmail: user.email },
            { ownerId: user._id?.toString() },
            { ownerId: user.id },
          ],
        });
      } catch (err) {
        // continue
      }

      const role = standardizeRole(user.role);

      return {
        _id: user._id?.toString() || user.id,
        id: user.id || user._id?.toString(),
        name: user.name || 'Unnamed User',
        email: user.email,
        emailVerified: Boolean(user.emailVerified),
        image: user.image || user.avatar || '',
        role: role,
        phone: user.phone || '',
        status: user.status || 'active',
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date(),
        restaurant: restaurantData
          ? {
              _id: restaurantData._id?.toString(),
              restaurantName: restaurantData.restaurantName || restaurantData.name || 'Unnamed Restaurant',
              slug: restaurantData.slug,
              logo: restaurantData.logo,
              bannerImage: restaurantData.bannerImage,
              cuisineTypes: restaurantData.cuisineTypes || restaurantData.cuisines || [],
              address: restaurantData.address,
              status: restaurantData.status || 'active',
              rating: restaurantData.rating || 0,
              totalReviews: restaurantData.totalReviews || 0,
              contactNumber: restaurantData.contactNumber || restaurantData.phone || '',
            }
          : null,
      };
    })
  );

  // Calculate real-time overall stats across whole collection
  const [totalUsers, restaurants, riders, admins] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments({ role: { $regex: ROLE_PATTERNS.RESTAURANT } }),
    collection.countDocuments({ role: { $regex: ROLE_PATTERNS.RIDER } }),
    collection.countDocuments({ role: { $regex: ROLE_PATTERNS.ADMIN } }),
  ]);

  const customers = Math.max(0, totalUsers - (restaurants + riders + admins));

  const stats: IUserStats = {
    totalUsers,
    customers,
    restaurants,
    riders,
    admins,
  };

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      stats,
    },
    data: usersWithRestaurant,
  };
};

/**
 * Get Single User by ID or Email with complete restaurant details
 */
const getUserById = async (userIdOrEmail: string) => {
  const collection = await getActiveUserCollection();

  const query: Record<string, any>[] = [
    { email: userIdOrEmail },
    { id: userIdOrEmail },
    { _id: userIdOrEmail },
  ];
  if (ObjectId.isValid(userIdOrEmail)) {
    try {
      query.push({ _id: new ObjectId(userIdOrEmail) });
    } catch (e) {}
  }

  const user = await collection.findOne({ $or: query });
  if (!user) return null;

  let restaurant = null;
  try {
    restaurant = await restaurantCollection.findOne({
      $or: [
        { ownerEmail: user.email },
        { ownerId: user._id?.toString() },
        { ownerId: user.id },
      ],
    });
  } catch (err) {
    // continue
  }

  return {
    _id: user._id?.toString() || user.id,
    id: user.id || user._id?.toString(),
    name: user.name,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    image: user.image || user.avatar || '',
    role: standardizeRole(user.role),
    phone: user.phone || '',
    status: user.status || 'active',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    restaurant,
  };
};

/**
 * Update User Role
 */
const updateUserRole = async (userId: string, newRole: string) => {
  const collection = await getActiveUserCollection();
  const standardizedRole = standardizeRole(newRole);

  const query: Record<string, any>[] = [
    { id: userId },
    { email: userId },
    { _id: userId },
  ];
  if (ObjectId.isValid(userId)) {
    try {
      query.push({ _id: new ObjectId(userId) });
    } catch (e) {}
  }

  const result = await collection.updateOne(
    { $or: query },
    {
      $set: {
        role: standardizedRole,
        updatedAt: new Date(),
      },
    }
  );

  // Also update fallback collection if present
  const fallbackUsers = db.collection('users');
  if (fallbackUsers !== collection) {
    await fallbackUsers.updateOne(
      { $or: query },
      {
        $set: {
          role: standardizedRole,
          updatedAt: new Date(),
        },
      }
    ).catch(() => {});
  }

  return result;
};

/**
 * Update User Status (e.g. 'active', 'blocked', 'suspended')
 */
const updateUserStatus = async (userId: string, newStatus: string) => {
  const collection = await getActiveUserCollection();

  const query: Record<string, any>[] = [
    { id: userId },
    { email: userId },
    { _id: userId },
  ];
  if (ObjectId.isValid(userId)) {
    try {
      query.push({ _id: new ObjectId(userId) });
    } catch (e) {}
  }

  const result = await collection.updateOne(
    { $or: query },
    {
      $set: {
        status: newStatus,
        updatedAt: new Date(),
      },
    }
  );

  const fallbackUsers = db.collection('users');
  if (fallbackUsers !== collection) {
    await fallbackUsers.updateOne(
      { $or: query },
      {
        $set: {
          status: newStatus,
          updatedAt: new Date(),
        },
      }
    ).catch(() => {});
  }

  return result;
};

/**
 * Update User general details
 */
const updateUser = async (userId: string, payload: Partial<TUser>) => {
  const collection = await getActiveUserCollection();

  const query: Record<string, any>[] = [
    { id: userId },
    { email: userId },
    { _id: userId },
  ];
  if (ObjectId.isValid(userId)) {
    try {
      query.push({ _id: new ObjectId(userId) });
    } catch (e) {}
  }

  const updateDoc: Record<string, any> = {
    ...payload,
    updatedAt: new Date(),
  };
  delete updateDoc._id;
  delete updateDoc.id;

  if (updateDoc.role) {
    updateDoc.role = standardizeRole(updateDoc.role);
  }

  const result = await collection.updateOne({ $or: query }, { $set: updateDoc });
  return result;
};

/**
 * Delete User
 */
const deleteUser = async (userId: string) => {
  const collection = await getActiveUserCollection();

  const query: Record<string, any>[] = [
    { id: userId },
    { email: userId },
    { _id: userId },
  ];
  if (ObjectId.isValid(userId)) {
    try {
      query.push({ _id: new ObjectId(userId) });
    } catch (e) {}
  }

  const result = await collection.deleteOne({ $or: query });

  const fallbackUsers = db.collection('users');
  if (fallbackUsers !== collection) {
    await fallbackUsers.deleteOne({ $or: query }).catch(() => {});
  }

  return result;
};

/**
 * Get Restaurant details by owner email or owner ID
 */
const getRestaurantDetails = async (identifier: string) => {
  const query: Record<string, any>[] = [
    { ownerEmail: identifier },
    { ownerId: identifier },
    { slug: identifier },
  ];

  if (ObjectId.isValid(identifier)) {
    try {
      query.push({ _id: new ObjectId(identifier) });
    } catch (e) {}
  }

  const restaurant = await restaurantCollection.findOne({ $or: query });
  return restaurant;
};

export const AdminService = {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  updateUser,
  deleteUser,
  getRestaurantDetails,
};
