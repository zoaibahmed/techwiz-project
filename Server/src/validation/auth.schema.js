import { z } from 'zod';

export const registerCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  phone: z.string().min(7, 'Contact number is required').max(20),
  address: z.string().min(5, 'Address is required for pickup identification').max(250),
});

export const registerFarmerSchema = z.object({
  name: z.string().min(2, 'Contact person name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  phone: z.string().min(7, 'Contact number is required').max(20),
  address: z.string().min(5, 'Farm or business address is required').max(250),
  businessName: z.string().min(2, 'Stall or business name is required').max(100),
  contactPerson: z.string().min(2, 'Contact person is required').max(100),
  bio: z.string().max(1000).optional().default(''),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const farmerStatusUpdateSchema = z.object({
  approvalStatus: z.enum(['pending', 'approved', 'suspended']),
  reason: z.string().max(250).optional(),
});
