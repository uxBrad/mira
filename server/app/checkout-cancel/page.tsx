export default function CheckoutCancel() {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#f6f3f2', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '48px 40px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ width: '48px', height: '48px', background: '#e5e7eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px', color: '#1a1a1a' }}>Checkout cancelled</h1>
          <p style={{ color: '#5f5e5e', fontSize: '15px', marginBottom: '32px', lineHeight: '1.5' }}>
            No charge was made. Return to Echo whenever you're ready to subscribe.
          </p>
          <p style={{ color: '#9a9897', fontSize: '13px' }}>You can close this tab.</p>
        </div>
      </body>
    </html>
  )
}
