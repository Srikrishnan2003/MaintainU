'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { requireRole } from '@/services/auth.service'
import { ActionResult, validateAction } from '@/lib/validations/actions'

export async function bootstrapAdminAction(): Promise<void> {
  const adminPhone = process.env.ADMIN_PHONE
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = process.env.ADMIN_NAME || 'Admin'

  if (!adminPhone || !adminPassword) {
    console.warn('[Bootstrap] ADMIN_PHONE or ADMIN_PASSWORD not set in environment')
    return
  }

  const normalizedPhone = adminPhone.startsWith('+91')
    ? adminPhone
    : `+91${adminPhone}`

  const passwordHash = await bcrypt.hash(adminPassword, 10)

  // 1. Check if a user with this exact phone already exists in the database
  const userWithPhone = await db.query.users.findFirst({
    where: eq(users.phone, normalizedPhone),
  })

  if (userWithPhone) {
    // A user with this phone exists! Ensure they are an active admin with the current password hash and name
    await db.update(users)
      .set({
        role: 'admin',
        status: 'ACTIVE',
        passwordHash,
        name: adminName,
        profileCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userWithPhone.id))
    console.log('[Bootstrap] Admin account synced with existing phone and name')
    return
  }

  // 2. No user owns this phone. Check if an admin account already exists (e.g. from seed)
  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.role, 'admin'),
  })

  if (existingAdmin) {
    // Safe to update existing admin's phone, password, and name
    await db.update(users)
      .set({ phone: normalizedPhone, passwordHash, name: adminName, status: 'ACTIVE', updatedAt: new Date() })
      .where(eq(users.id, existingAdmin.id))
    console.log('[Bootstrap] Admin phone, password, and name updated')
    return
  }

  // 3. No admin and no conflicting phone exists — create a brand new admin user
  await db.insert(users).values({
    phone: normalizedPhone,
    role: 'admin',
    status: 'ACTIVE',
    passwordHash,
    profileCompleted: true,
    name: adminName,
  })
  console.log('[Bootstrap] Admin account created successfully')
}

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string()
    .min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export async function changeAdminPasswordAction(
  currentPassword: string,
  newPassword: string,
  confirmPassword?: string
): Promise<ActionResult<void>> {
  const validation = validateAction(passwordChangeSchema, {
    currentPassword,
    newPassword,
    confirmPassword: confirmPassword ?? newPassword,
  })

  if (!validation.success) {
    return validation
  }

  try {
    const session = await requireRole('admin')
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    })

    if (!user || !user.passwordHash) {
      return { success: false, error: 'Admin account not found or invalid' }
    }

    const isMatch = await bcrypt.compare(validation.data.currentPassword, user.passwordHash)
    if (!isMatch) {
      return { success: false, error: 'Current password is incorrect' }
    }

    const passwordHash = await bcrypt.hash(validation.data.newPassword, 10)
    await db.update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, user.id))

    return { success: true, message: 'Password updated successfully' }
  } catch (e: any) {
    console.error('changeAdminPasswordAction error:', e)
    return { success: false, error: e.message || 'Failed to update password' }
  }
}
