import axios from 'axios'

export type Row = Record<string, unknown>

const client = axios.create({ baseURL: '/api' })

interface ValidationItem {
  loc?: (string | number)[]
  msg?: string
}

export function extractError(err: unknown): string {
  if (axios.isAxiosError<{ detail?: string | ValidationItem[] }>(err)) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail
        .map((d) => {
          const field = d.loc?.filter((x) => x !== 'body').join('.')
          return field ? `${field}: ${d.msg}` : (d.msg ?? '')
        })
        .join('; ')
    }
    return err.response ? err.message : 'Không kết nối được máy chủ'
  }
  return err instanceof Error ? err.message : 'Lỗi không xác định'
}

// ---- generic CRUD ----

const path = (resource: string, pk: string[]) =>
  `/${[resource, ...pk.map(encodeURIComponent)].join('/')}`

export const listRows = (resource: string) =>
  client.get<Row[]>(`/${resource}`, { params: { limit: 1000 } }).then((r) => r.data)
export const createRow = (resource: string, body: Row) => client.post(`/${resource}`, body)
export const updateRow = (resource: string, pk: string[], body: Row) =>
  client.put(path(resource, pk), body)
export const deleteRow = (resource: string, pk: string[]) => client.delete(path(resource, pk))

// ---- reports ----

export interface ThongKe {
  khoa: number
  nganh: number
  giang_vien: number
  sinh_vien: number
  hoc_phan: number
  lop_hoc_phan: number
  dang_ki: number
}

export interface KetQuaHocTap {
  ma_hk: string
  ma_lop: string
  ma_hp: string
  ten_hp: string
  so_tc: number
  diem_cc: number | null
  diem_gk: number | null
  diem_ck: number | null
  diem_tk: number | null
}

export interface BangDiem {
  sinh_vien: {
    ma_sv: string
    ten: string
    ngaysinh: string
    ma_lophc: string
    ten_lop: string | null
    ten_nganh: string | null
  }
  ket_qua: KetQuaHocTap[]
  tong_tc: number
  gpa_he10: number | null
}

export interface TkbItem {
  ngay: string
  tiet_bd: number
  so_tiet: number
  ma_lop: string
  ma_hp: string
  ten_hp: string
  ma_phong: string
  ten_gv: string
}

export interface SinhVienLop {
  ma_sv: string
  ten: string
  ma_lophc: string
  diem_cc: number | null
  diem_gk: number | null
  diem_ck: number | null
  diem_tk: number | null
}

export interface DanhSachLop {
  lop_hoc_phan: {
    ma_lop: string
    ma_hp: string
    ten_hp: string
    ma_hk: string
    ten_gv: string
    ma_phong: string
    suc_chua: number | null
    si_so: number
  }
  sinh_vien: SinhVienLop[]
}

const getData = <T>(url: string, params?: Record<string, string>) =>
  client.get<T>(url, { params }).then((r) => r.data)

export const getThongKe = () => getData<ThongKe>('/reports/thong-ke')
export const getBangDiem = (maSv: string) =>
  getData<BangDiem>(`/reports/bang-diem/${encodeURIComponent(maSv)}`)
export const getThoiKhoaBieu = (maSv: string, maHk?: string) =>
  getData<TkbItem[]>(`/reports/thoi-khoa-bieu/${encodeURIComponent(maSv)}`, maHk ? { ma_hk: maHk } : {})
export const getDanhSachLop = (maLop: string) =>
  getData<DanhSachLop>(`/reports/lop-hoc-phan/${encodeURIComponent(maLop)}/sinh-vien`)

// ---- truy vấn SQL mẫu ----

export interface QueryInfo {
  id: string
  title: string
  desc: string
  sql: string
}

export interface QueryResult {
  columns: string[]
  rows: unknown[][]
  row_count: number
  elapsed_ms: number
}

export const listQueries = () => getData<QueryInfo[]>('/queries')
export const runQuery = (id: string) => getData<QueryResult>(`/queries/${encodeURIComponent(id)}/run`)
