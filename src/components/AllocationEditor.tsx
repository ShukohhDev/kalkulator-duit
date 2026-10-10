import { useState } from 'react'
import type { AppState, Category, CategoryKind } from '../types'
import type { Updater } from '../hooks/useAppState'
import { CATEGORY_COLORS, categoryKind } from '../lib/state'
import { PROFILES, applyProfile, findProfile } from '../lib/profiles'
import { applyLifestyle } from '../lib/lifestyles'
import { uid } from '../lib/id'
import { CustomSelect } from './CustomSelect'

interface Props {
  state: AppState
  update: Updater
  onDone: () => void
}

interface Row {
  id: string
  name: string
  color: string
  optional: boolean
  builtin: boolean
  kind: CategoryKind
}

const pctOf = (value: string): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

const fmtPct = (value: number): string => String(Math.round(value * 10) / 10)

const sumText = (value: number): string => fmtPct(value).replace('.', ',')

function buildRows(state: AppState): Row[] {
  const defOptional = new Map<string, boolean>()
  for (const profile of PROFILES) {
    for (const entry of profile.ratios) defOptional.set(entry.id, Boolean(entry.optional))
  }

  const rows: Row[] = state.categories.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
    optional: Boolean(category.optional) || Boolean(defOptional.get(category.id)),
    builtin: category.builtin,
    kind: categoryKind(category),
  }))
  const ids = new Set(rows.map((row) => row.id))
  const names = new Set(rows.map((row) => row.name.trim().toLowerCase()))

  PROFILES.forEach((profile) => {
    profile.ratios.forEach((entry, index) => {
      if (ids.has(entry.id) || names.has(entry.name.toLowerCase())) return
      rows.push({
        id: entry.id,
        name: entry.name,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        optional: Boolean(entry.optional),
        builtin: true,
        kind: categoryKind({ id: entry.id }),
      })
      ids.add(entry.id)
      names.add(entry.name.toLowerCase())
    })
  })
  return rows
}

export function AllocationEditor({ state, update, onDone }: Props) {
  const [rows, setRows] = useState<Row[]>(() => buildRows(state))
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const byId = new Map(state.categories.map((category) => [category.id, category]))
    return Object.fromEntries(
      buildRows(state).map((row) => {
        const category = byId.get(row.id)
        const pct = category ? (category.off ? (category.baseRatio ?? 0) * 100 : category.ratio * 100) : 0
        return [row.id, fmtPct(pct)]
      }),
    )
  })
  const [off, setOff] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(state.categories.filter((category) => category.off).map((category) => [category.id, true])),
  )
  const [newName, setNewName] = useState('')

  const activeProfile = findProfile(state.profile)
  const otherProfile = PROFILES.find((profile) => profile.id !== state.profile) ?? PROFILES[0]!
  const otherMap = new Map(otherProfile.ratios.map((entry) => [entry.id, entry.ratio * 100]))

  const pct = (id: string) => pctOf(draft[id] ?? '0')
  const activeSum = rows.reduce((total, row) => (off[row.id] ? total : total + pct(row.id)), 0)
  const otherSum = otherProfile.ratios.reduce((total, entry) => total + entry.ratio, 0) * 100
  const sumOk = Math.abs(activeSum - 100) <= 0.1

  const scaleOthers = (exceptId: string, factor: number) => {
    setDraft((prev) => {
      const next = { ...prev }
      for (const row of rows) {
        if (row.id === exceptId || off[row.id]) continue
        next[row.id] = fmtPct(pctOf(prev[row.id] ?? '0') * factor)
      }
      return next
    })
  }

  const toggleOff = (row: Row) => {
    const value = pct(row.id)
    if (off[row.id]) {
      const factor = (100 - value) / 100
      if (factor > 0) scaleOthers(row.id, factor)
      setOff((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
    } else {
      if (value < 100) scaleOthers(row.id, 100 / (100 - value))
      setOff((prev) => ({ ...prev, [row.id]: true }))
    }
  }

  const save = () => {
    if (!sumOk || activeSum <= 0) return
    update((s) => {
      const byId = new Map(s.categories.map((category) => [category.id, category]))
      const categories: Category[] = rows.map((row) => {
        const isOff = Boolean(off[row.id])
        const raw = pct(row.id)
        const previous = byId.get(row.id)
        return {
          id: row.id,
          name: row.name,
          ratio: isOff ? 0 : raw / activeSum,
          builtin: row.builtin,
          color: previous?.color ?? row.color,
          kind: row.kind,
          ...(row.optional ? { optional: true } : {}),
          ...(isOff ? { off: true, baseRatio: raw / 100 } : {}),
        }
      })
      return { ...s, categories }
    })
    onDone()
  }

  const reset = () => {
    const refreshed = applyLifestyle(applyProfile(state.categories, findProfile(state.profile)), state.lifestyle)
    const byId = new Map(refreshed.map((category) => [category.id, category]))
    setDraft((prev) =>
      Object.fromEntries(
        rows.map((row) => {
          const category = byId.get(row.id)
          return [row.id, category ? fmtPct(category.ratio * 100) : prev[row.id]]
        }),
      ),
    )
    setOff({})
  }

  const addRow = () => {
    const name = newName.trim()
    if (name === '' || rows.some((row) => row.name.trim().toLowerCase() === name.toLowerCase())) return
    const row: Row = {
      id: uid('cat'),
      name,
      color: CATEGORY_COLORS[rows.length % CATEGORY_COLORS.length],
      optional: false,
      builtin: false,
      kind: 'harian',
    }
    setRows((prev) => [...prev, row])
    setDraft((prev) => ({ ...prev, [row.id]: '0' }))
    setNewName('')
  }

  return (
    <div className="alloc-edit">
      <div className="alloc-table-wrap">
        <table className="alloc-table">
          <thead>
            <tr>
              <th>Kategori</th>
              <th className="alloc-col-active">{activeProfile.label}</th>
              <th>{otherProfile.label}</th>
              <th>Opsional?</th>
              <th>Jenis</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isOff = Boolean(off[row.id])
              const other = otherMap.get(row.id)
              return (
                <tr key={row.id} className={isOff ? 'alloc-off' : undefined}>
                  <td>
                    <span className="alloc-cat">
                      <span className="alloc-dot" style={{ background: row.color }} />
                      {row.name}
                    </span>
                  </td>
                  <td>
                    <input
                      className="input alloc-pct-input"
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      inputMode="decimal"
                      value={draft[row.id] ?? '0'}
                      disabled={isOff}
                      aria-label={`Persen ${row.name}`}
                      onChange={(event) => setDraft((prev) => ({ ...prev, [row.id]: event.target.value }))}
                    />
                  </td>
                  <td className="alloc-pct-static">{other === undefined ? '-' : `${fmtPct(other)}%`}</td>
                  <td className="alloc-toggle-cell">
                    {row.optional ? (
                      <input
                        type="checkbox"
                        checked={!isOff}
                        aria-label={`Opsional ${row.name}`}
                        onChange={() => toggleOff(row)}
                      />
                    ) : (
                      <span className="alloc-pct-static">Tidak</span>
                    )}
                  </td>
                  <td>
                    <CustomSelect
                      className="input alloc-kind"
                      aria-label={`Jenis ${row.name}`}
                      value={row.kind}
                      onChange={(event) =>
                        setRows((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, kind: event.target.value as CategoryKind }
                              : item,
                          ),
                        )
                      }
                      title={`Pilih Jenis Kategori ${row.name}`}
                    >
                      <option value="harian">Harian</option>
                      <option value="keinginan">Keinginan</option>
                      <option value="tabungan">Tabungan</option>
                    </CustomSelect>
                  </td>
                  <td className="alloc-action-cell">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={isOff || pct(row.id) === 0}
                      onClick={() => setDraft((prev) => ({ ...prev, [row.id]: '0' }))}
                    >
                      Kurangi
                    </button>
                  </td>
                </tr>
              )
            })}
            <tr className="alloc-total">
              <td>Total</td>
              <td>{sumText(activeSum)}%</td>
              <td>{sumText(otherSum)}%</td>
              <td />
              <td />
              <td />
            </tr>
            <tr className="alloc-total">
              <td>Cek 100%</td>
              <td>
                <span className={sumOk ? 'alloc-check alloc-check-ok' : 'alloc-check text-danger'}>
                  {sumOk ? 'OK' : 'BELUM'}
                </span>
              </td>
              <td className="alloc-check alloc-check-ok">{Math.abs(otherSum - 100) <= 0.1 ? 'OK' : 'BELUM'}</td>
              <td />
              <td />
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="alloc-add">
        <input
          className="input"
          type="text"
          placeholder="Nama kategori baru"
          value={newName}
          aria-label="Nama kategori baru"
          onChange={(event) => setNewName(event.target.value)}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={addRow} disabled={newName.trim() === ''}>
          + Tambah kategori
        </button>
      </div>

      <div className="alloc-legend muted small">
        <span>Sel angka berwarna biru = nilai yang bisa kamu ubah. Total dan cek dihitung otomatis.</span>
        <span>Kategori opsional yang dimatikan: persentasenya dibagi proporsional ke kategori lain, sehingga total tetap 100%.</span>
        <span>Kurangi menyetel persen ke 0; riwayat catatan tetap aman.</span>
        <span>
          Jenis menentukan sisa uang periode lalu: <strong>Harian</strong> dibawa ke periode berikut,{' '}
          <strong>Keinginan</strong> ditawarkan pindah ke tabungan, <strong>Tabungan</strong> menumpuk natural.
        </span>
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn-sm" disabled={!sumOk} onClick={save}>
          Simpan alokasi
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
          Reset ke default
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>
          Batal
        </button>
      </div>
    </div>
  )
}
