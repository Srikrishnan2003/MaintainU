'use server'

import { db } from "@/lib/db"
import { users, companies, technicians } from "@/db/schema"
import { eq } from "drizzle-orm"
import { createSession, getSession } from "@/services/auth.service"
import { ActionResult } from "@/lib/validations/actions"

export async function getOrCreateQAAccountsAction(): Promise<ActionResult<{
  admin: { phone: string; password: string }
  company: { phone: string }
  technician: { phone: string }
}>> {
  if (process.env.NODE_ENV !== 'development') return { success: false, error: 'QA mode disabled' }

  const admin = {
    phone: process.env.ADMIN_PHONE ?? '0000000001',
    password: process.env.ADMIN_PASSWORD ?? 'Admin@1234'
  }
  const companyPhone = '+919000000001'
  const technicianPhone = '+919000000002'

  // Company
  let existingCompany = await db.query.users.findFirst({ where: eq(users.phone, companyPhone) })
  if (!existingCompany) {
    const [newUser] = await db.insert(users).values({
      phone: companyPhone,
      role: 'company',
      status: 'ACTIVE',
      name: 'QA Test Company',
      profileCompleted: true
    }).returning()
    await db.insert(companies).values({
      userId: newUser.id,
      companyName: 'QA Test Company',
      address: '123 QA Street, Chennai, Tamil Nadu 600001',
      industryType: 'Manufacturing',
      email: 'qa@testcompany.com',
      contactPerson: 'QA Contact'
    })
  }

  // Technician
  let existingTech = await db.query.users.findFirst({ where: eq(users.phone, technicianPhone) })
  if (!existingTech) {
    const [newUser] = await db.insert(users).values({
      phone: technicianPhone,
      role: 'technician',
      status: 'ACTIVE',
      name: 'QA Technician',
      profileCompleted: true
    }).returning()
    await db.insert(technicians).values({
      userId: newUser.id,
      address: '456 QA Lane, Chennai, Tamil Nadu 600002',
      primarySkill: 'ELECTRICAL',
      experience: 5,
      status: 'ACTIVE'
    })
  }

  return {
    success: true,
    data: {
      admin,
      company: { phone: companyPhone },
      technician: { phone: technicianPhone }
    }
  }
}

export async function qaLoginAction(role: 'admin' | 'company' | 'technician'): Promise<ActionResult<{ redirectTo: string }>> {
  if (process.env.NODE_ENV !== 'development') return { success: false, error: 'QA mode disabled' }

  const phone = role === 'admin'
    ? (process.env.ADMIN_PHONE ?? '0000000001')
    : role === 'company'
    ? '+919000000001'
    : '+919000000002'
  const user = await db.query.users.findFirst({ where: eq(users.phone, phone) })

  if (!user) {
    return { success: false, error: 'QA account not found. Click "Create QA Accounts" first.' }
  }

  await createSession({ id: user.id, role: user.role, status: user.status, phone: user.phone })

  const redirectMap: Record<string, string> = {
    admin: '/admin/dashboard',
    company: '/company/dashboard',
    technician: '/technician/dashboard'
  }

  return { success: true, data: { redirectTo: redirectMap[role] } }
}

export async function getQASessionAction() {
  if (process.env.NODE_ENV !== 'development') return null
  const session = await getSession()
  return session?.role || null
}
