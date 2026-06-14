'use client'
import { useState } from 'react'

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', type: 'restaurant',
    businessName: '', message: '', city: '', state: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await fetch('https://vibechops.onrender.com/api/v2/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      setSubmitted(true)
    } catch {
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: '#FFF8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
        <h2 style={{ fontWeight: '900', fontSize: '28px', color: '#1C1C1E', marginBottom: '12px' }}>Application Received!</h2>
        <p style={{ color: '#636366', fontSize: '16px', lineHeight: 1.6 }}>
          Thank you for your interest in partnering with VibeChops. Our team will review your application and reach out to
          <strong> {form.email}</strong> within 24-48 hours.
        </p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8F0', padding: '48px 24px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontWeight: '900', fontSize: '32px', color: '#1C1C1E', marginBottom: '12px' }}>Partner with VibeChops 🤝</h1>
          <p style={{ color: '#636366', fontSize: '16px' }}>Join Nigeria's fastest growing food delivery platform. Fill in your details and we'll be in touch within 48 hours.</p>
        </div>

        <div style={{ background: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontWeight: '700', color: '#1C1C1E', display: 'block', marginBottom: '12px', fontSize: '15px' }}>I want to join as a *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { value: 'restaurant', label: '🍽️ Restaurant', desc: 'Traditional restaurant with ready-to-serve food' },
                { value: 'vendor', label: '👨‍🍳 Home Cook / Vendor', desc: 'Home cook with pre-order meals' },
                { value: 'delivery', label: '🚚 Delivery Company', desc: 'Delivery logistics company' },
                { value: 'rider', label: '🛵 Individual Rider', desc: 'Freelance delivery rider' },
              ].map(opt => (
                <button key={opt.value}
                  onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                  style={{
                    padding: '16px', borderRadius: '16px',
                    border: `2px solid ${form.type === opt.value ? '#E8621A' : '#E8E8E8'}`,
                    background: form.type === opt.value ? '#FFF1E8' : 'white',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: form.type === opt.value ? '#E8621A' : '#1C1C1E', marginBottom: '4px' }}>{opt.label}</div>
                  <div style={{ fontSize: '11px', color: '#636366' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {[
            { key: 'name', label: 'Your Full Name *', type: 'text', placeholder: 'e.g. Aisha Ibrahim' },
            { key: 'businessName', label: 'Business Name *', type: 'text', placeholder: 'e.g. Mama Cass Kitchen' },
            { key: 'email', label: 'Email Address *', type: 'email', placeholder: 'your@email.com' },
            { key: 'phone', label: 'Phone Number *', type: 'tel', placeholder: '+234 800 000 0000' },
            { key: 'city', label: 'City *', type: 'text', placeholder: 'e.g. Maiduguri' },
            { key: 'state', label: 'State *', type: 'text', placeholder: 'e.g. Borno' },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: '600', color: '#636366', display: 'block', marginBottom: '6px', fontSize: '13px' }}>{field.label}</label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={(form as any)[field.key]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                style={{
                  width: '100%', padding: '12px 16px', border: '1.5px solid #E8E8E8', borderRadius: '12px',
                  fontSize: '15px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#E8621A'}
                onBlur={e => e.target.style.borderColor = '#E8E8E8'}
              />
            </div>
          ))}

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontWeight: '600', color: '#636366', display: 'block', marginBottom: '6px', fontSize: '13px' }}>Additional Information</label>
            <textarea
              placeholder="Tell us about your business, cuisine type, daily capacity, etc."
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={4}
              style={{
                width: '100%', padding: '12px 16px', border: '1.5px solid #E8E8E8', borderRadius: '12px',
                fontSize: '15px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !form.name || !form.email || !form.phone}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg, #E8621A, #C4501A)',
              color: 'white', border: 'none', borderRadius: '14px',
              fontSize: '16px', fontWeight: '800', cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}>
            {loading ? 'Submitting...' : 'Submit Application →'}
          </button>

          <p style={{ textAlign: 'center', color: '#A0A0A0', fontSize: '13px', marginTop: '16px' }}>
            We review all applications within 24-48 hours. You'll receive a confirmation email with next steps.
          </p>
        </div>
      </div>
    </div>
  )
}
