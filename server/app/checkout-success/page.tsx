export default function CheckoutSuccess() {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#f6f3f2', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '48px 40px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ width: '48px', height: '48px', background: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px', color: '#1a1a1a' }}>You're subscribed!</h1>
          <p style={{ color: '#5f5e5e', fontSize: '15px', marginBottom: '32px', lineHeight: '1.5' }}>
            Your Echo subscription is now active. Return to the app to continue auditing.
          </p>
          <p style={{ color: '#9a9897', fontSize: '13px' }}>You can close this tab.</p>
        </div>
      </body>
    </html>
  )
}
