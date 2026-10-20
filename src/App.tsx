import { useEffect, useState } from 'react'
import { StoreProvider, useStore } from './store'
import { CATS } from './data'
import * as S from './screens'

const NAV: [string, string, string[]][] = [
  ['dashboard', 'Dashboard', ['dashboard']], ['catalog', 'Parts', ['catalog', 'part']], ['builder', 'Build', ['builder']],
  ['builds', 'My builds', ['builds', 'build', 'report']], ['compare', 'Compare', ['compare']], ['admin', 'Products', ['admin']],
]

function NavBar({ route }: { route: string }) {
  const { draft } = useStore()
  const n = CATS.filter((c) => draft[c]).length
  return (
    <nav className="n" aria-label="Main">
      <a className="brand" href="#/">RigForge</a>
      {NAV.map(([to, label, on]) => (
        <a key={to} href={'#/' + to} className={on.includes(route) ? 'on' : ''} aria-current={on.includes(route) ? 'page' : undefined}>
          {label}{to === 'builder' && n > 0 && <span className="badge" title={`${n} parts in your current build`}>{n}</span>}
        </a>
      ))}
    </nav>
  )
}

function useHash() {
  const read = () => location.hash.replace(/^#\/?/, '').split('/')
  const [h, set] = useState(read)
  useEffect(() => {
    const f = () => { set(read()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return h
}

export default function App() {
  const [route, id = ''] = useHash()
  const page = (() => {
    switch (route) {
      case 'dashboard': return <S.Dashboard />
      case 'catalog': return <S.Catalog key={id} cat={id} />
      case 'part': return <S.Details id={id} />
      case 'builder': return <S.Builder />
      case 'builds': return <S.MyBuilds />
      case 'build': return <S.BuildDetails id={id} />
      case 'report': return <S.Report id={id} />
      case 'compare': return <S.Compare />
      case 'admin': return <S.Admin />
      default: return <S.Landing />
    }
  })()
  return (
    <StoreProvider>
      <NavBar route={route} />
      {page}
    </StoreProvider>
  )
}
