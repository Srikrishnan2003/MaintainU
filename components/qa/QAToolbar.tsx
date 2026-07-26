'use client'

import { useState, useEffect } from 'react'
import { getOrCreateQAAccountsAction, qaLoginAction, getQASessionAction } from '@/actions/qa.action'
import { qaForms } from '@/lib/qa-autofill'

function fillInput(selector: string, value: any) {
  const el = document.querySelector(selector) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  if (!el) {
    console.warn(`[QA Auto-fill] Could not find field with selector: ${selector}`)
    return
  }
  
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set || Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set || Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype, 'value'
  )?.set

  nativeInputValueSetter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

export default function QAToolbar() {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [pathname, setPathname] = useState('')

  useEffect(() => {
    setPathname(window.location.pathname)
    getQASessionAction().then(res => setRole(res))
  }, [])

  if (process.env.NODE_ENV !== 'development') return null

  const handleCreate = async () => {
    setLoading(true)
    await getOrCreateQAAccountsAction()
    setLoading(false)
  }

  const handleLogin = async (targetRole: 'admin' | 'company' | 'technician') => {
    setLoading(true)
    const res = await qaLoginAction(targetRole)
    if (res.success && res.data) {
      window.location.href = res.data.redirectTo
    } else {
      alert(res.error || 'Failed to login')
    }
    setLoading(false)
  }

  const handleAutofill = () => {
    if (pathname === '/company/requests/new') {
      fillInput('[name="serviceType"]', qaForms.companyRequest.serviceType)
      fillInput('[name="priority"]', qaForms.companyRequest.priority)
      fillInput('[name="description"]', qaForms.companyRequest.description)
      fillInput('[name="location"]', qaForms.companyRequest.location)
      fillInput('[name="supervisorName"]', qaForms.companyRequest.supervisorName)
      fillInput('[name="supervisorPhone"]', qaForms.companyRequest.supervisorPhone)
    } else if (pathname === '/company/onboarding' || pathname === '/register/company') {
      fillInput('[name="companyName"]', qaForms.companyOnboarding.companyName)
      fillInput('[name="industryType"]', qaForms.companyOnboarding.industryType)
      fillInput('[name="email"]', qaForms.companyOnboarding.email)
      fillInput('[name="contactPerson"]', qaForms.companyOnboarding.contactPerson)
      fillInput('[name="address"]', qaForms.companyOnboarding.address)
      fillInput('[name="gstin"]', qaForms.companyOnboarding.gstin)
    } else if (pathname === '/technician/onboarding' || pathname === '/register/technician') {
      fillInput('[name="name"]', qaForms.technicianOnboarding.name)
      fillInput('[name="dob"]', qaForms.technicianOnboarding.dob)
      fillInput('[name="gender"]', qaForms.technicianOnboarding.gender)
      fillInput('[name="address"]', qaForms.technicianOnboarding.address)
      fillInput('[name="experience"]', qaForms.technicianOnboarding.experience)
      fillInput('[name="primarySkill"]', qaForms.technicianOnboarding.primarySkill)
      fillInput('[name="emergencyContactName"]', qaForms.technicianOnboarding.emergencyContactName)
      fillInput('[name="emergencyContactPhone"]', qaForms.technicianOnboarding.emergencyContactPhone)
    } else if (pathname === '/admin/invoices/new') {
      fillInput('[name="laborCost"]', qaForms.invoice.laborCost)
      fillInput('[name="materialCost"]', qaForms.invoice.materialCost)
    }
  }

  const getFormLabel = () => {
    if (pathname === '/company/requests/new') return 'Fill Request Form'
    if (pathname === '/company/onboarding' || pathname === '/register/company') return 'Fill Company Form'
    if (pathname === '/technician/onboarding' || pathname === '/register/technician') return 'Fill Tech Form'
    if (pathname === '/admin/invoices/new') return 'Fill Invoice Form'
    return 'No form on this page'
  }

  const formLabel = getFormLabel()
  const formDisabled = formLabel === 'No form on this page'

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      {expanded && (
        <div style={{ background: '#111', color: '#fff', padding: 16, borderRadius: 8, border: '1px solid #333', width: 300, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>QA Helper</h3>
            <span style={{ fontSize: 10, color: '#888' }}>{process.env.NODE_ENV}</span>
          </div>
          
          <div style={{ fontSize: 12, marginBottom: 16, color: '#aaa' }}>
            <div>Role: {role || 'Guest'}</div>
            <div>Path: {pathname}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <button onClick={handleCreate} disabled={loading} style={{ width: '100%', padding: 8, background: '#333', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 8, fontSize: 12 }}>
              {loading ? 'Working...' : 'Create QA Accounts'}
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={() => handleLogin('admin')} disabled={loading} style={{ padding: 6, background: role === 'admin' ? '#0070f3' : '#222', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Login as Admin</button>
              <button onClick={() => handleLogin('company')} disabled={loading} style={{ padding: 6, background: role === 'company' ? '#0070f3' : '#222', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Login as Company</button>
              <button onClick={() => handleLogin('technician')} disabled={loading} style={{ padding: 6, background: role === 'technician' ? '#0070f3' : '#222', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Login as Technician</button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #333', paddingTop: 16 }}>
            <button 
              onClick={handleAutofill} 
              disabled={formDisabled}
              style={{ width: '100%', padding: 8, background: formDisabled ? '#222' : '#0070f3', color: formDisabled ? '#555' : 'white', border: 'none', borderRadius: 4, cursor: formDisabled ? 'not-allowed' : 'pointer', fontSize: 12 }}
            >
              {formLabel}
            </button>
          </div>
        </div>
      )}
      <button 
        onClick={() => setExpanded(!expanded)}
        style={{ width: 40, height: 40, borderRadius: 20, background: '#0070f3', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
      >
        QA
      </button>
    </div>
  )
}
