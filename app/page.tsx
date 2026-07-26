import { getSession } from '@/services/auth.service'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const session = await getSession()

  if (!session) {
    redirect('/onboarding?role=company')
  }

  // Route authenticated users to their role dashboard
  switch (session.role) {
    case 'admin':
      redirect('/admin/dashboard')
    case 'company':
      redirect('/company/dashboard')
    case 'technician':
      redirect('/technician/dashboard')
    default:
      redirect('/onboarding?role=company')
  }
}
