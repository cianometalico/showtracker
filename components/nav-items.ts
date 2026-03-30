export type NavItem = {
  href: string
  label: string
  priority: 'primary' | 'secondary'
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/',         label: 'HOME',     priority: 'primary' },
  { href: '/shows',    label: 'SHOWS',    priority: 'primary' },
  { href: '/artistas', label: 'ARTISTAS', priority: 'primary' },
  { href: '/estoque',  label: 'ESTOQUE',  priority: 'primary' },
  { href: '/locais',   label: 'LOCAIS',   priority: 'secondary' },
  { href: '/publicos', label: 'PÚBLICOS', priority: 'secondary' },
  { href: '/agenda',   label: 'AGENDA',   priority: 'secondary' },
]
