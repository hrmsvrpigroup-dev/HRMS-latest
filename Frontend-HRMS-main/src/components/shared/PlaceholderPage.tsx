type Props = {
  title: string
  description?: string
}

export default function PlaceholderPage({ title, description }: Props) {
  return (
    <section className="card">
      <h1 style={{ marginTop: 0 }}>{title}</h1>
      <p style={{ marginBottom: 0, color: '#475569' }}>
        {description ?? 'This module scaffold is ready for implementation.'}
      </p>
    </section>
  )
}

