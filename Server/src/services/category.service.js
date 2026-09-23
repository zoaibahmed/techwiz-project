import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

export async function listCategoriesService() {
  const db = getDB();
  const categories = await db.collection('categories').find({ isActive: true }).sort({ name: 1 }).toArray();

  return categories.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    description: c.description || '',
    icon: c.icon || '',
  }));
}

export async function createCategoryService(adminId, data) {
  const db = getDB();

  // Check unique slug/name
  const existing = await db.collection('categories').findOne({
    $or: [{ slug: data.slug.toLowerCase().trim() }, { name: data.name.trim() }],
  });

  if (existing) {
    const err = new Error('A category with this name or slug already exists.');
    err.code = 'CATEGORY_EXISTS';
    err.statusCode = 409;
    throw err;
  }

  const doc = {
    name: data.name.trim(),
    slug: data.slug.toLowerCase().trim(),
    description: data.description || '',
    icon: data.icon || '',
    isActive: true,
    createdBy: new ObjectId(adminId),
    createdAt: new Date(),
  };

  const result = await db.collection('categories').insertOne(doc);

  return {
    id: result.insertedId.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    icon: doc.icon,
  };
}

export async function updateCategoryService(adminId, categoryId, data) {
  const db = getDB();
  const cId = new ObjectId(categoryId);

  const updateFields = { updatedAt: new Date() };
  if (data.name) updateFields.name = data.name.trim();
  if (data.slug) updateFields.slug = data.slug.toLowerCase().trim();
  if (data.description !== undefined) updateFields.description = data.description;
  if (data.icon !== undefined) updateFields.icon = data.icon;

  const result = await db.collection('categories').updateOne({ _id: cId }, { $set: updateFields });
  if (result.matchedCount === 0) {
    const err = new Error('Category not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const updated = await db.collection('categories').findOne({ _id: cId });
  return {
    id: updated._id.toString(),
    name: updated.name,
    slug: updated.slug,
    description: updated.description,
    icon: updated.icon,
  };
}

export async function deleteCategoryService(adminId, categoryId) {
  const db = getDB();
  const cId = new ObjectId(categoryId);

  // Soft delete
  const result = await db.collection('categories').updateOne({ _id: cId }, { $set: { isActive: false } });
  if (result.matchedCount === 0) {
    const err = new Error('Category not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  return { id: categoryId, deleted: true };
}
