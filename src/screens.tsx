import { ProductImage } from './ProductImage'
import { cleanDescription } from './cleanDescription'
import { useState, type ReactNode } from 'react'
import { CATS, analyze, find, money, total, type Cat, type Items, type Part } from './data'
import { useStore } from './store'

// Navigation helper is also used by App.
// eslint-disable-next-line react-refresh/only-export-components
export const go = (to: string) => { location.hash = '#/' + to }
const A = ({ to, cls, children }: { to: string; cls?: string; children: ReactNode }) => <a href={'#/' + to} className={cls}>{children}</a>
const Tag = ({ k = '', children }: { k?: string; children: ReactNode }) => <span className={'k ' + k}>{children}</span>
const Head = ({ t, sub, children }: { t: string; sub?: string; children?: ReactNode }) => (
  <div className="f w"><div style={{ flex: 1 }}><h1 style={{ fontSize: 32 }}>{t}</h1>{sub && <p className="s" style={{ marginTop: 6 }}>{sub}</p>}</div>{children}</div>
)
function Tags({ items, parts }: { items: Items; parts: Part[] }) {
  const r = analyze(items, parts)
  return <span className="f w">
    {r.bad.length > 0 && <Tag k="x">{r.bad.length} {r.bad.length === 1 ? 'conflict' : 'conflicts'}</Tag>}
    {r.ok.length > 0 && <Tag k="ok">{r.ok.length} compatible</Tag>}
    <Tag k="w2">{r.todo.length} not checked</Tag>
  </span>
}
function useItems(id: string) {
  const s = useStore()
  return id === 'draft' ? s.draft : s.builds.find((b) => b.id === id)?.items
}

export function Landing() {
  const { parts } = useStore()
  const top = parts.slice(0, 4)
  return <>
    <div className="p row" style={{ flexDirection: 'row', gap: 56, alignItems: 'center', paddingTop: 72 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <h1 style={{ fontSize: 56 }}>Pick every part.<br />Know it all fits.</h1>
        <p className="s" style={{ fontSize: 18, maxWidth: 480 }}>Choose a CPU, motherboard, RAM, GPU, storage, PSU and case, watch the total as you go, and get a compatibility report before you buy.</p>
        <div className="f"><A to="builder" cls="b">Start a build</A><A to="catalog" cls="o">Browse parts</A></div>
      </div>
      <div className="c board" style={{ flex: 1 }}>
        <div className="f"><h3 style={{ flex: 1 }}>Sample build</h3><Tag>4 parts</Tag></div>
        {top.map((p) => <div className="r" key={p.id}><div><div className="m">{p.cat}</div>{p.brand} {p.name}</div><span>{money(p.price)}</span></div>)}
        <div className="f" style={{ paddingTop: 16 }}><span className="s" style={{ flex: 1 }}>Total so far</span><h2>{money(top.reduce((s, p) => s + p.price, 0))}</h2></div>
      </div>
    </div>
    <div className="p" style={{ paddingTop: 0 }}><div className="g cols" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
      {[['1 · Pick parts', 'Search the catalog by category and price.'], ['2 · Check fit', 'See what is compatible, what conflicts and what we could not check.'], ['3 · Save and compare', 'Keep several builds and compare them side by side.']].map(([a, b]) =>
        <div className="c" key={a}><h3>{a}</h3><p className="s" style={{ marginTop: 8 }}>{b}</p></div>)}
    </div></div>
  </>
}

export function Dashboard() {
  const { builds, parts } = useStore()
  const sums = builds.map((b) => total(b.items, parts))
  const sum = sums.reduce((a, b) => a + b, 0)
  const last = builds[builds.length - 1]
  const stats: [string, string][] = [['Saved builds', String(builds.length)], ['Total value', money(sum)], ['Average build', money(builds.length ? Math.round(sum / builds.length) : 0)], ['Catalog parts', String(parts.length)]]
  return <div className="p">
    <Head t="Dashboard" sub="Overview of your saved builds"><A to="builder" cls="b">New build</A></Head>
    <div className="g cols" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>{stats.map(([a, b]) => <div className="c" key={a}><div className="m">{a}</div><h1 style={{ fontSize: 34, marginTop: 6 }}>{b}</h1></div>)}</div>
    <div className="g cols" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="c"><h2>Recent builds</h2>
        {builds.length === 0 && <p className="s" style={{ marginTop: 12 }}>No saved builds yet.</p>}
        {builds.slice(-4).reverse().map((b) => <div className="r" key={b.id}><div><A to={'build/' + b.id} cls="t">{b.name}</A><div className="m">{CATS.filter((c) => b.items[c]).length} parts</div></div><span>{money(total(b.items, parts))}</span></div>)}
      </div>
      <div className="c"><h2 style={{ marginBottom: 8 }}>Cost by category{last ? ' · ' + last.name : ''}</h2>
        {last && CATS.map((c) => { const p = find(parts, last.items[c]); return <div className="r" key={c} style={{ border: 0, padding: '8px 0' }}>
          <span className="s" style={{ width: 100, flex: 'none' }}>{c}</span>
          <div className="bar"><div style={{ width: `${Math.min(100, ((p?.price ?? 0) / 600) * 100)}%` }} /></div>
          <span style={{ width: 56, textAlign: 'right', flex: 'none' }}>{p ? money(p.price) : '—'}</span></div> })}
      </div>
    </div>
  </div>
}

export function Catalog({ cat }: { cat?: string }) {
  const { parts, draft, pick } = useStore()
  const initial = CATS.find((c) => c === decodeURIComponent(cat ?? ''))
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Cat | ''>(initial ?? '')
  const [max, setMax] = useState('')
  const [sort, setSort] = useState('name')
  const limit = max === '' ? Infinity : Number(max)
  const shown = parts
    .filter((p) => (!sel || p.cat === sel) && p.price <= limit && (p.brand + ' ' + p.name + ' ' + p.spec).toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : (a.brand + a.name).localeCompare(b.brand + b.name)))
  const dirty = q !== '' || sel !== '' || max !== ''
  const clear = () => { setQ(''); setSel(''); setMax('') }
  const count = (c: Cat) => parts.filter((p) => p.cat === c).length
  return <div className="p">
    <Head t="Parts" sub={`${shown.length} of ${parts.length} parts. Add the ones you like to your current build.`}><A to="builder" cls="o">Go to build</A></Head>
    <div className="chips" role="group" aria-label="Filter by category">
      <button className={'chip' + (sel === '' ? ' on' : '')} aria-pressed={sel === ''} onClick={() => setSel('')}>All ({parts.length})</button>
      {CATS.map((c) => <button key={c} className={'chip' + (sel === c ? ' on' : '')} aria-pressed={sel === c} onClick={() => setSel(sel === c ? '' : c)}>{c} ({count(c)})</button>)}
    </div>
    <div className="toolbar">
      <label style={{ flex: 1, minWidth: 220 }}>Search<input className="i" placeholder="Try &quot;Ryzen&quot; or &quot;DDR5&quot;" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      <label style={{ width: 160 }}>Max price (PHP)<input className="i" type="number" min={0} placeholder="No limit" value={max} onChange={(e) => setMax(e.target.value)} /></label>
      <label style={{ width: 190 }}>Sort by<select className="i" value={sort} onChange={(e) => setSort(e.target.value)}><option value="name">Name</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label>
      {dirty && <button className="o" onClick={clear}>Clear filters</button>}
    </div>
    {shown.length === 0
      ? <div className="c empty"><h3>No parts match</h3><p className="s">Try a different search, raise the max price or pick another category.</p><button className="b" onClick={clear}>Clear filters</button></div>
      : <div className="grid-auto">
        {shown.map((p) => {
          const inBuild = draft[p.cat] === p.id
          const other = !inBuild && !!draft[p.cat]
          return <div className="c card" key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ marginBottom: 8 }}><ProductImage part={p} height={90} /></div>
            <span className="m">{p.brand}</span>
            <h3><A to={'part/' + p.id} cls="t">{p.name}</A></h3>
            <div className="m" style={{ flex: 1 }}>{cleanDescription(p.spec)}</div>
            <div className="f" style={{ marginTop: 10 }}>
              <b style={{ flex: 1, fontSize: 18 }}>{money(p.price)}</b>
              {inBuild
                ? <button className="o on" title="Click to remove from your build" onClick={() => pick(p.cat, '')}>Added ✓</button>
                : <button className="o" title={other ? `Replaces your current ${p.cat}` : undefined} onClick={() => pick(p.cat, p.id)}>{other ? 'Replace' : 'Add'}</button>}
            </div>
          </div>
        })}
      </div>}
  </div>
}

export function Details({ id }: { id: string }) {
  const { parts, pick } = useStore()
  const p = find(parts, id)
  if (!p) return <div className="p"><p>Part not found.</p><A to="catalog" cls="o">Back to catalog</A></div>
  const rows: [string, string][] = [['Brand', p.brand], ['Category', p.cat], ['Details', cleanDescription(p.spec)]]
  if (p.socket) rows.push(['Socket', p.socket])
  if (p.ddr) rows.push(['Memory type', p.ddr])
  if (p.watts) rows.push([p.cat === 'PSU' ? 'Output' : 'Power draw', p.watts + ' W'])
  if (p.len) rows.push(['Length', p.len + ' mm'])
  if (p.maxGpu) rows.push(['Max GPU length', p.maxGpu + ' mm'])
  return <div className="p">
    <span className="m"><A to="catalog" cls="t">Catalog</A> / {p.cat} / {p.name}</span>
    <div className="g cols" style={{ gridTemplateColumns: '1fr 1fr', gap: 40 }}>
      <ProductImage part={p} height={340} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h1 style={{ fontSize: 36 }}>{p.brand} {p.name}</h1><h2 style={{ fontSize: 32 }}>{money(p.price)}</h2>
        <div className="f w"><button className="b" onClick={() => { pick(p.cat, p.id); go('builder') }}>Add to build</button><A to="catalog" cls="o">Back to catalog</A></div>
        <div className="c"><h3>Specifications</h3>{rows.map(([a, b]) => <div className="r" key={a}><span className="s">{a}</span><span className="m" style={{ color: 'var(--tx)', flex: 'none' }}>{b}</span></div>)}</div>
      </div>
    </div>
  </div>
}

export function Builder() {
  const { parts, draft, pick, setDraft, save } = useStore()
  const [name, setName] = useState('')
  const r = analyze(draft, parts)
  const n = CATS.filter((c) => find(parts, draft[c])).length
  return <div className="p row" style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
    <div className="c" style={{ flex: 1 }}><h2>Untitled build</h2>
      {CATS.map((c) => { const sel = find(parts, draft[c]); return <div className="r w" key={c}>
        <div style={{ minWidth: 180 }}><div className="m">{c}</div><div>{sel ? sel.brand + ' ' + sel.name : <span className="s">Not selected</span>}</div>{sel && <div className="m">{cleanDescription(sel.spec)}</div>}</div>
        {sel && <span>{money(sel.price)}</span>}
        <select className="i" style={{ width: 210 }} aria-label={'Choose ' + c} value={draft[c] ?? ''} onChange={(e) => pick(c, e.target.value)}>
          <option value="">Choose {c}</option>{parts.filter((p) => p.cat === c).map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.price)}</option>)}
        </select><A to={'catalog/' + encodeURIComponent(c)} cls="o">Browse</A></div> })}
    </div>
    <div className="c side" style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3>Summary</h3>
      <div className="f"><span className="s" style={{ flex: 1 }}>Parts</span>{n} of {CATS.length}</div>
      <div className="bar" style={{ flex: 'none' }}><div style={{ width: `${(n / CATS.length) * 100}%` }} /></div>
      <div className="f"><span className="s" style={{ flex: 1 }}>Est. power</span>≈ {r.watts} W</div>
      <div className="f"><span className="s" style={{ flex: 1 }}>Total</span><h2>{money(total(draft, parts))}</h2></div>
      <Tags items={draft} parts={parts} />
      <label>Build name<input className="i" value={name} onChange={(e) => setName(e.target.value)} placeholder="Untitled build" /></label>
      <button className="b" disabled={n === 0} onClick={() => go('build/' + save(name))}>Save build</button>
      <A to="report/draft" cls="o">View compatibility report</A>
      <button className="o" onClick={() => setDraft({})}>Clear</button>
    </div>
  </div>
}

export function MyBuilds() {
  const { builds, parts, rename, dup, del, setDraft } = useStore()
  return <div className="p">
    <Head t="My builds" sub="Open, rename, duplicate or delete your saved builds"><A to="builder" cls="b">New build</A></Head>
    <div className="g cols" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))' }}>
      {builds.map((b) => <div className="c" key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3><A to={'build/' + b.id} cls="t">{b.name}</A></h3>
        <span className="m">{CATS.filter((c) => b.items[c]).length} parts</span><h2>{money(total(b.items, parts))}</h2>
        <Tags items={b.items} parts={parts} />
        <div className="f w">
          <button className="o" onClick={() => { const n = prompt('Rename build', b.name); if (n?.trim()) rename(b.id, n.trim()) }}>Rename</button>
          <button className="o" onClick={() => dup(b.id)}>Duplicate</button>
          <button className="o" onClick={() => { if (confirm(`Delete "${b.name}"?`)) del(b.id) }}>Delete</button>
          <button className="o" onClick={() => { setDraft(b.items); go('builder') }}>Edit</button>
        </div></div>)}
      <A to="builder" cls="ph">+ Start a new build</A>
    </div>
  </div>
}

export function BuildDetails({ id }: { id: string }) {
  const { builds, parts, dup, setDraft } = useStore()
  const b = builds.find((x) => x.id === id)
  if (!b) return <div className="p"><p>Build not found.</p><A to="builds" cls="o">Back to My Builds</A></div>
  const r = analyze(b.items, parts)
  return <div className="p">
    <Head t={b.name} sub={`${CATS.filter((c) => b.items[c]).length} parts`}>
      <button className="o" onClick={() => { setDraft(b.items); go('builder') }}>Edit in builder</button>
      <button className="o" onClick={() => { dup(b.id); go('builds') }}>Duplicate</button>
    </Head>
    <div className="g cols" style={{ gridTemplateColumns: '1fr 320px', alignItems: 'start' }}>
      <div className="c"><h2>Itemized costs</h2>
        {CATS.map((c) => { const p = find(parts, b.items[c]); return <div className="r" key={c}><span className="m" style={{ width: 100, flex: 'none' }}>{c}</span><span style={{ flex: 1 }}>{p ? p.brand + ' ' + p.name : <span className="s">Not selected</span>}</span><span>{p ? money(p.price) : '—'}</span></div> })}
        <div className="f" style={{ paddingTop: 16 }}><span className="s" style={{ flex: 1 }}>Total</span><h2>{money(total(b.items, parts))}</h2></div>
      </div>
      <div className="c" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}><h3>Compatibility</h3><Tags items={b.items} parts={parts} />
        <p className="s">{r.bad.length ? r.bad[0].detail : 'No conflicts found in the checked specifications.'}</p><A to={'report/' + b.id} cls="b">Open full report</A></div>
    </div>
  </div>
}

export function Report({ id }: { id: string }) {
  const { parts, builds } = useStore()
  const items = useItems(id)
  if (!items) return <div className="p"><p>Build not found.</p></div>
  const r = analyze(items, parts)
  const col = (t: string, k: string, list: typeof r.ok, cls: string) => <div className="c"><div className="f"><Tag k={cls}>{list.length} {k}</Tag><h3>{t}</h3></div>
    {list.length === 0 && <p className="s" style={{ marginTop: 12 }}>Nothing here.</p>}
    {list.map((x) => <div className="r" key={x.label}><div>{x.label}<div className="s" style={{ marginTop: 4 }}>{x.detail}</div></div></div>)}</div>
  return <div className="p">
    <Head t="Compatibility report" sub={id === 'draft' ? 'Current build in the builder' : builds.find((b) => b.id === id)?.name}><A to={id === 'draft' ? 'builder' : 'build/' + id} cls="o">Back to build</A></Head>
    <div className="g cols" style={{ gridTemplateColumns: 'repeat(3,1fr)', alignItems: 'start' }}>
      {col('Compatible', 'OK', r.ok, 'ok')}{col('Conflicts', r.bad.length === 1 ? 'conflict' : 'conflicts', r.bad, 'x')}{col('Not checked', 'unchecked', r.todo, 'w2')}
    </div>
  </div>
}

export function Compare() {
  const { builds, parts } = useStore()
  const [a, setA] = useState(builds[0]?.id ?? '')
  const [b, setB] = useState(builds[1]?.id ?? '')
  const A1 = builds.find((x) => x.id === a), B1 = builds.find((x) => x.id === b)
  const ta = A1 ? total(A1.items, parts) : 0, tb = B1 ? total(B1.items, parts) : 0
  const sel = (v: string, set: (s: string) => void, l: string) => <label style={{ flex: 1 }}>{l}<select className="i" value={v} onChange={(e) => set(e.target.value)}>{builds.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
  const row = (l: string, x: string, y: string, tag?: ReactNode) => <div className="r" key={l}><span className="s" style={{ width: 140, flex: 'none' }}>{l}</span><span style={{ flex: 1 }}>{x}</span><span style={{ flex: 1 }}>{y} {tag}</span></div>
  const nm = (bd?: { items: Items }, c?: Cat) => { const p = find(parts, bd?.items[c!]); return p ? p.brand + ' ' + p.name : '—' }
  return <div className="p"><Head t="Compare builds" sub="Two saved builds, side by side" />
    <div className="c">
      <div className="f w">{sel(a, setA, 'Build A')}{sel(b, setB, 'Build B')}</div>
      {A1 && B1 ? <>
        <div className="r" style={{ marginTop: 12 }}><span className="s" style={{ width: 140, flex: 'none' }}>Total price</span><b style={{ flex: 1, fontSize: 20 }}>{money(ta)} {ta < tb && <Tag>LOWER</Tag>}</b><b style={{ flex: 1, fontSize: 20 }}>{money(tb)} {tb < ta && <Tag>LOWER</Tag>}</b></div>
        {CATS.map((c) => row(c, nm(A1, c), nm(B1, c)))}
        {row('Est. power', `≈ ${analyze(A1.items, parts).watts} W`, `≈ ${analyze(B1.items, parts).watts} W`)}
      </> : <p className="s" style={{ marginTop: 16 }}>Save at least two builds to compare them.</p>}
    </div>
  </div>
}

const blank: Part = { id: '', cat: 'CPU', brand: '', name: '', price: 0, spec: '' }
export function Admin() {
  const { parts, upsertPart, delPart } = useStore()
  const [f, setF] = useState<Part>(blank)
  const [q, setQ] = useState('')
  const input = (l: string, k: 'name' | 'brand' | 'spec') => <label>{l}<input className="i" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
  return <div className="p row" style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
    <div className="c" style={{ flex: 1 }}>
      <div className="f w"><h2 style={{ flex: 1 }}>Catalog parts</h2><input className="i" aria-label="Search" placeholder="Search" style={{ width: 200 }} value={q} onChange={(e) => setQ(e.target.value)} /><button className="b" onClick={() => setF(blank)}>Add part</button></div>
      {parts.filter((p) => (p.brand + p.name + p.cat).toLowerCase().includes(q.toLowerCase())).map((p) => <div className="r" key={p.id}>
        <div>{p.brand} {p.name}<div className="m">{p.cat} · {cleanDescription(p.spec)}</div></div><span>{money(p.price)}</span>
        <button className="o" onClick={() => setF(p)}>Edit</button>
        <button className="o" onClick={() => { if (confirm(`Delete ${p.name}?`)) delPart(p.id) }}>Delete</button></div>)}
    </div>
    <div className="c side" style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h3>{f.id ? 'Edit part' : 'Add part'}</h3>
      {input('Name', 'name')}{input('Brand', 'brand')}
      <label>Category<select className="i" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value as Cat })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label>Price (PHP)<input className="i" type="number" min={0} value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} /></label>
      {input('Key specs', 'spec')}
      <div className="f"><button className="b" disabled={!f.name.trim()} onClick={() => { upsertPart({ ...f, id: f.id || 'p' + Date.now().toString(36) }); setF(blank) }}>Save part</button><button className="o" onClick={() => setF(blank)}>Cancel</button></div>
    </div>
  </div>
}
