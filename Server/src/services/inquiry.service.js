import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

export async function submitContactInquiryService(data) {
  const db = getDB();
  const now = new Date();

  const doc = {
    name: data.name.trim(),
    email: data.email.toLowerCase().trim(),
    phone: data.phone ? data.phone.trim() : '',
    subject: data.subject.trim(),
    message: data.message.trim(),
    status: 'new', // 'new', 'in_progress', 'resolved'
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection('contactInquiries').insertOne(doc);

  return {
    id: result.insertedId.toString(),
    name: doc.name,
    email: doc.email,
    subject: doc.subject,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listInquiriesAdminService(query = {}) {
  const db = getDB();
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  const inquiries = await db
    .collection('contactInquiries')
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return inquiries.map((iq) => ({
    id: iq._id.toString(),
    name: iq.name,
    email: iq.email,
    phone: iq.phone || '',
    subject: iq.subject,
    message: iq.message,
    status: iq.status,
    adminNotes: iq.adminNotes || '',
    createdAt: iq.createdAt instanceof Date ? iq.createdAt.toISOString() : iq.createdAt,
    updatedAt: iq.updatedAt instanceof Date ? iq.updatedAt.toISOString() : iq.updatedAt,
  }));
}

export async function updateInquiryStatusAdminService(id, { status, adminNotes = '' }) {
  const db = getDB();
  const iId = new ObjectId(id);

  const result = await db.collection('contactInquiries').updateOne(
    { _id: iId },
    { $set: { status, adminNotes, updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) {
    const err = new Error('Inquiry not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const updated = await db.collection('contactInquiries').findOne({ _id: iId });
  return {
    id: updated._id.toString(),
    status: updated.status,
    adminNotes: updated.adminNotes,
    updatedAt: updated.updatedAt.toISOString(),
  };
}
