export default function LoadingSpinner() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '300px', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div
          className="spinner"
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '3px solid var(--border-glass)',
            borderTopColor: 'var(--primary)',
            animation: 'spin 1s cubic-bezier(0.55, 0.085, 0.68, 0.53) infinite',
          }}
        />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500, letterSpacing: '0.02em' }}>
          Loading HRMS Dashboard...
        </span>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export { LoadingSpinner }
