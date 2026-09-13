import { ObjectId } from 'mongodb';
import { categoryCollection } from '../../config/db';
import { ICategory, ICategoryPayload } from './category.interface';

const DEFAULT_CATEGORIES = [
  { name: 'Pizza', emoji: '🍕', description: 'Freshly baked artisan pizzas and calzones', displayOrder: 1 },
  { name: 'Burgers', emoji: '🍔', description: 'Juicy Angus beef, chicken smash burgers & sliders', displayOrder: 2 },
  { name: 'Biryani', emoji: '🍛', description: 'Shahi mutton kacchi, morog polao & aromatic biryani', displayOrder: 3 },
  { name: 'Pasta', emoji: '🍝', description: 'Creamy Alfredo, Arrabbiata & Italian pastas', displayOrder: 4 },
  { name: 'BBQ & Grill', emoji: '🍖', description: 'Smoky charcoal chicken, kebabs & grilled platters', displayOrder: 5 },
  { name: 'Desserts', emoji: '🍰', description: 'Cakes, pastries, waffles & cold gelato desserts', displayOrder: 6 },
  { name: 'Drinks', emoji: '🥤', description: 'Fresh fruit juices, mocktails, soda & smoothies', displayOrder: 7 },
  { name: 'Sushi', emoji: '🍣', description: 'Authentic Japanese sushi rolls & sashimi grade seafood', displayOrder: 8 },
  { name: 'Chinese', emoji: '🍲', description: 'Classic chow mein, fried rice, dumplings & Wok bowls', displayOrder: 9 },
  { name: 'Thai', emoji: '🌿', description: 'Spicy Tom Yum, green curry & aromatic herb dishes', displayOrder: 10 },
  { name: 'Healthy', emoji: '🥗', description: 'Nutritious green salads, protein bowls & diet meals', displayOrder: 11 },
];

/**
 * Helper to slugify category names
 */
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Seed initial categories if collection is empty
 */
const seedInitialCategories = async (): Promise<void> => {
  const count = await categoryCollection.countDocuments();
  if (count === 0) {
    const now = new Date();
    const seedDocs = DEFAULT_CATEGORIES.map((item) => ({
      name: item.name,
      slug: slugify(item.name),
      emoji: item.emoji,
      description: item.description,
      isActive: true,
      displayOrder: item.displayOrder,
      createdAt: now,
      updatedAt: now,
    }));
    await categoryCollection.insertMany(seedDocs);
    console.log('🌱 Successfully seeded initial global food categories!');
  }
};

/**
 * Get all categories
 */
const getAllCategories = async (includeInactive = false): Promise<ICategory[]> => {
  await seedInitialCategories();

  const filter = includeInactive ? {} : { isActive: true };
  const categories = await categoryCollection
    .find(filter)
    .sort({ displayOrder: 1, name: 1 })
    .toArray();

  return categories.map((doc) => ({
    _id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug || slugify(doc.name),
    emoji: doc.emoji || '🏷️',
    description: doc.description || '',
    isActive: doc.isActive ?? true,
    displayOrder: doc.displayOrder || 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }));
};

/**
 * Create a new global category (Admin)
 */
const createCategory = async (payload: ICategoryPayload): Promise<ICategory> => {
  const trimmedName = payload.name.trim();
  if (!trimmedName) {
    throw new Error('Category name is required.');
  }

  // Check duplicate name
  const existing = await categoryCollection.findOne({
    name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
  });
  if (existing) {
    throw new Error(`Category "${trimmedName}" already exists.`);
  }

  const now = new Date();
  const slug = slugify(trimmedName);

  const doc = {
    name: trimmedName,
    slug,
    emoji: payload.emoji?.trim() || '🏷️',
    description: payload.description?.trim() || '',
    isActive: payload.isActive ?? true,
    displayOrder: Number(payload.displayOrder) || 0,
    createdAt: now,
    updatedAt: now,
  };

  const result = await categoryCollection.insertOne(doc);

  return {
    _id: result.insertedId.toString(),
    ...doc,
  };
};

/**
 * Update existing category (Admin)
 */
const updateCategory = async (
  id: string,
  payload: Partial<ICategoryPayload>
): Promise<ICategory | null> => {
  if (!ObjectId.isValid(id)) {
    throw new Error('Invalid category ID.');
  }

  const updateFields: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (payload.name !== undefined) {
    const trimmedName = payload.name.trim();
    if (!trimmedName) throw new Error('Category name cannot be empty.');
    
    // Check duplicate
    const existing = await categoryCollection.findOne({
      _id: { $ne: new ObjectId(id) },
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });
    if (existing) {
      throw new Error(`Category "${trimmedName}" already exists.`);
    }

    updateFields.name = trimmedName;
    updateFields.slug = slugify(trimmedName);
  }

  if (payload.emoji !== undefined) updateFields.emoji = payload.emoji.trim() || '🏷️';
  if (payload.description !== undefined) updateFields.description = payload.description.trim();
  if (payload.isActive !== undefined) updateFields.isActive = Boolean(payload.isActive);
  if (payload.displayOrder !== undefined) updateFields.displayOrder = Number(payload.displayOrder) || 0;

  const result = await categoryCollection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updateFields },
    { returnDocument: 'after' }
  );

  if (!result || !result.value) {
    // Retry fetch if returnDocument object structure varies by driver version
    const updatedDoc = await categoryCollection.findOne({ _id: new ObjectId(id) });
    if (!updatedDoc) return null;
    return {
      _id: updatedDoc._id.toString(),
      name: updatedDoc.name,
      slug: updatedDoc.slug,
      emoji: updatedDoc.emoji || '🏷️',
      description: updatedDoc.description || '',
      isActive: updatedDoc.isActive ?? true,
      displayOrder: updatedDoc.displayOrder || 0,
      createdAt: updatedDoc.createdAt,
      updatedAt: updatedDoc.updatedAt,
    };
  }

  const doc = result.value;
  return {
    _id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    emoji: doc.emoji || '🏷️',
    description: doc.description || '',
    isActive: doc.isActive ?? true,
    displayOrder: doc.displayOrder || 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

/**
 * Delete a category (Admin)
 */
const deleteCategory = async (id: string): Promise<boolean> => {
  if (!ObjectId.isValid(id)) {
    throw new Error('Invalid category ID.');
  }

  const res = await categoryCollection.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount > 0;
};

export const CategoryService = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  seedInitialCategories,
};
