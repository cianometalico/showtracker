export function EnrichmentDot({ mbid }: { mbid?: string | null }) {
  if (mbid) {
    return (
      <span style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: 'var(--amber)',
        flexShrink: 0,
        verticalAlign: 'middle',
      }} />
    )
  }
  return (
    <span style={{
      display: 'inline-block',
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'transparent',
      border: '1.5px solid var(--text-muted)',
      flexShrink: 0,
      verticalAlign: 'middle',
    }} />
  )
}
