export const CATS = ['CPU', 'Motherboard', 'RAM', 'GPU', 'Storage', 'PSU', 'Case', 'CPU Cooler'] as const
export type Cat = (typeof CATS)[number]
export interface Part {
  id: string; sku?: string; cat: Cat; name: string; brand: string; price: number; spec: string
  socket?: string; ddr?: string; watts?: number; len?: number; maxGpu?: number
}
export type Items = Partial<Record<Cat, string>>
export interface Build { id: string; name: string; items: Items }
export interface Check { label: string; detail: string }

export const PARTS: Part[] = [
  { id: 'cpu1', cat: 'CPU', brand: 'AMD', name: 'Ryzen 5 7600', price: 229, spec: '6 cores / 12 threads · 65 W', socket: 'AM5', watts: 65 },
  { id: 'cpu2', cat: 'CPU', brand: 'Intel', name: 'Core i5-13600K', price: 299, spec: '14 cores / 20 threads · 125 W', socket: 'LGA1700', watts: 125 },
  { id: 'cpu3', cat: 'CPU', brand: 'AMD', name: 'Ryzen 5 5600', price: 129, spec: '6 cores / 12 threads · 65 W', socket: 'AM4', watts: 65 },
  { id: 'mb1', cat: 'Motherboard', brand: 'MSI', name: 'B650 Tomahawk', price: 199, spec: 'ATX · AM5 · DDR5', socket: 'AM5', ddr: 'DDR5' },
  { id: 'mb2', cat: 'Motherboard', brand: 'ASUS', name: 'Prime Z790-P', price: 229, spec: 'ATX · LGA1700 · DDR5', socket: 'LGA1700', ddr: 'DDR5' },
  { id: 'mb3', cat: 'Motherboard', brand: 'Gigabyte', name: 'B550 Aorus Elite', price: 109, spec: 'ATX · AM4 · DDR4', socket: 'AM4', ddr: 'DDR4' },
  { id: 'ram1', cat: 'RAM', brand: 'Corsair', name: 'Vengeance 32GB', price: 109, spec: 'DDR5-6000 · 2×16 GB', ddr: 'DDR5' },
  { id: 'ram2', cat: 'RAM', brand: 'Kingston', name: 'Fury 16GB', price: 64, spec: 'DDR5-5600 · 2×8 GB', ddr: 'DDR5' },
  { id: 'ram3', cat: 'RAM', brand: 'Crucial', name: 'Ballistix 16GB', price: 39, spec: 'DDR4-3200 · 2×8 GB', ddr: 'DDR4' },
  { id: 'gpu1', cat: 'GPU', brand: 'NVIDIA', name: 'RTX 4070 Super 12GB', price: 599, spec: 'PCIe 4.0 · 336 mm · 220 W', watts: 220, len: 336 },
  { id: 'gpu2', cat: 'GPU', brand: 'AMD', name: 'Radeon RX 7600 8GB', price: 269, spec: 'PCIe 4.0 · 204 mm · 165 W', watts: 165, len: 204 },
  { id: 'ssd1', cat: 'Storage', brand: 'WD', name: 'SN850X 1TB', price: 89, spec: 'NVMe Gen4 · M.2' },
  { id: 'ssd2', cat: 'Storage', brand: 'Crucial', name: 'P3 500GB', price: 45, spec: 'NVMe Gen3 · M.2' },
  { id: 'psu1', cat: 'PSU', brand: 'Corsair', name: 'RM750e', price: 99, spec: '750 W · 80+ Gold', watts: 750 },
  { id: 'psu2', cat: 'PSU', brand: 'Corsair', name: 'CV650', price: 69, spec: '650 W · 80+ Bronze', watts: 650 },
  { id: 'case1', cat: 'Case', brand: 'NZXT', name: 'H5 Flow', price: 94, spec: 'ATX mid tower · GPU up to 305 mm', maxGpu: 305 },
  { id: 'case2', cat: 'Case', brand: 'Cooler Master', name: 'Q300L', price: 59, spec: 'Micro-ATX tower · GPU up to 360 mm', maxGpu: 360 },
]

export const money = (amount: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount)
export const find = (parts: Part[], id?: string) => parts.find((p) => p.id === id)
export const total = (items: Items, parts: Part[]) =>
  CATS.reduce((s, c) => s + (find(parts, items[c])?.price ?? 0), 0)

export function analyze(items: Items, parts: Part[]) {
  const g = (c: Cat) => find(parts, items[c])
  const cpu = g('CPU'), mb = g('Motherboard'), ram = g('RAM'), gpu = g('GPU'), psu = g('PSU'), cs = g('Case')
  const ok: Check[] = [], bad: Check[] = [], todo: Check[] = []
  const rule = (a: Part | undefined, b: Part | undefined, pass: boolean, label: string, yes: string, no: string) => {
    if (!a || !b) todo.push({ label, detail: 'Select both parts to check this.' })
    else (pass ? ok : bad).push({ label, detail: pass ? yes : no })
  }
  rule(cpu, mb, cpu?.socket === mb?.socket, 'CPU and motherboard', `Both use socket ${cpu?.socket}.`, `CPU is ${cpu?.socket} but the board is ${mb?.socket}.`)
  rule(ram, mb, ram?.ddr === mb?.ddr, 'RAM and motherboard', `${mb?.ddr} is supported.`, `RAM is ${ram?.ddr} but the board takes ${mb?.ddr}.`)
  rule(gpu, cs, (gpu?.len ?? 0) <= (cs?.maxGpu ?? 0), 'GPU and case', `GPU (${gpu?.len} mm) fits within ${cs?.maxGpu} mm.`, `GPU is ${gpu?.len} mm long; the case fits up to ${cs?.maxGpu} mm.`)
  const watts = (cpu?.watts ?? 0) + (gpu?.watts ?? 0) + 100
  const need = Math.ceil(watts * 1.25)
  if (!psu || (!cpu && !gpu)) todo.push({ label: 'Power supply', detail: 'Select a PSU and a CPU or GPU to check.' })
  else rule(psu, psu, psu.watts! >= need, 'Power supply', `${psu.watts} W covers the ≈ ${watts} W estimate.`, `${psu.watts} W is below the ${need} W recommended for ≈ ${watts} W.`)
  todo.push({ label: 'CPU cooler clearance', detail: 'Not covered by the catalog data.' }, { label: 'BIOS version', detail: 'Needs a manual check for this CPU.' }, { label: 'Radiator support', detail: 'Case data missing.' })
  return { ok, bad, todo, watts }
}
