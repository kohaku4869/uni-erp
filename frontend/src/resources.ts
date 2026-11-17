import dayjs from 'dayjs'

export type FieldType = 'text' | 'int' | 'float' | 'date' | 'datetime' | 'bool'

export interface FieldRef {
  resource: string
  valueField: string
  labelField?: string
}

export interface FieldConfig {
  name: string
  label: string
  type: FieldType
  required: boolean
  min?: number
  max?: number
  step?: number
  ref?: FieldRef
}

export interface ResourceConfig {
  key: string
  label: string
  pk: string[]
  fields: FieldConfig[]
}

// ---- format helpers ----

export const DASH = '—'

export const formatDate = (v: unknown): string => (v ? dayjs(v as string).format('DD/MM/YYYY') : DASH)

export const formatDateTime = (v: unknown): string =>
  v ? dayjs(v as string).format('DD/MM/YYYY HH:mm') : DASH

export const formatNumber = (v: unknown, digits?: number): string => {
  if (v === null || v === undefined || v === '') return DASH
  const n = Number(v)
  if (Number.isNaN(n)) return DASH
  return n.toLocaleString('vi-VN', digits === undefined ? {} : { maximumFractionDigits: digits })
}

// ---- field builders ----

const field = (name: string, label: string, type: FieldType, required: boolean, extra?: Partial<FieldConfig>): FieldConfig => ({
  name,
  label,
  type,
  required,
  ...extra,
})
const text = (name: string, label: string, required = true) => field(name, label, 'text', required)
const date = (name: string, label: string, required = true) => field(name, label, 'date', required)
const int = (name: string, label: string, required = true, min?: number, max?: number) =>
  field(name, label, 'int', required, { min, max })
const score = (name: string, label: string) =>
  field(name, label, 'float', false, { min: 0, max: 10, step: 0.25 })
const fk = (name: string, label: string, resource: string, valueField: string, labelField?: string) =>
  field(name, label, 'text', true, { ref: { resource, valueField, labelField } })

export const RESOURCES: ResourceConfig[] = [
  { key: 'khoa', label: 'Khoa', pk: ['ma_khoa'], fields: [text('ma_khoa', 'Mã khoa'), text('ten', 'Tên khoa')] },
  {
    key: 'nganh',
    label: 'Ngành',
    pk: ['ma_nganh'],
    fields: [text('ma_nganh', 'Mã ngành'), text('ten', 'Tên ngành'), fk('ma_khoa', 'Khoa', 'khoa', 'ma_khoa', 'ten')],
  },
  {
    key: 'giang-vien',
    label: 'Giảng viên',
    pk: ['ma_gv'],
    fields: [text('ma_gv', 'Mã GV'), text('ten', 'Họ tên'), fk('ma_khoa', 'Khoa', 'khoa', 'ma_khoa', 'ten')],
  },
  {
    key: 'lop-hanh-chinh',
    label: 'Lớp hành chính',
    pk: ['ma_lop'],
    fields: [
      text('ma_lop', 'Mã lớp'),
      text('ten_lop', 'Tên lớp'),
      fk('ma_nganh', 'Ngành', 'nganh', 'ma_nganh', 'ten'),
      fk('ma_cvht', 'Cố vấn học tập', 'giang-vien', 'ma_gv', 'ten'),
    ],
  },
  {
    key: 'sinh-vien',
    label: 'Sinh viên',
    pk: ['ma_sv'],
    fields: [
      text('ma_sv', 'Mã SV'),
      text('ten', 'Họ tên'),
      date('ngaysinh', 'Ngày sinh'),
      fk('ma_lophc', 'Lớp hành chính', 'lop-hanh-chinh', 'ma_lop', 'ten_lop'),
    ],
  },
  {
    key: 'hoc-ky',
    label: 'Học kỳ',
    pk: ['ma_hk'],
    fields: [text('ma_hk', 'Mã học kỳ'), text('nam_hoc', 'Năm học', false), int('ky', 'Kỳ', false)],
  },
  {
    key: 'hoc-phan',
    label: 'Học phần',
    pk: ['ma_hp'],
    fields: [
      text('ma_hp', 'Mã HP'),
      text('ten', 'Tên học phần'),
      int('so_tc', 'Số tín chỉ', true, 1, 6),
      text('nhom_hp', 'Nhóm HP', false),
    ],
  },
  {
    key: 'phong-hoc',
    label: 'Phòng học',
    pk: ['ma_phong'],
    fields: [text('ma_phong', 'Mã phòng'), int('suc_chua', 'Sức chứa', false, 1)],
  },
  {
    key: 'lop-hoc-phan',
    label: 'Lớp học phần',
    pk: ['ma_lop'],
    fields: [
      text('ma_lop', 'Mã lớp HP'),
      fk('ma_gv', 'Giảng viên', 'giang-vien', 'ma_gv', 'ten'),
      fk('ma_hp', 'Học phần', 'hoc-phan', 'ma_hp', 'ten'),
      fk('ma_hk', 'Học kỳ', 'hoc-ky', 'ma_hk'),
      fk('ma_phong', 'Phòng học', 'phong-hoc', 'ma_phong'),
    ],
  },
  {
    key: 'lich',
    label: 'Lịch học',
    pk: ['ngay', 'tiet_bd', 'lop_hp'],
    fields: [
      date('ngay', 'Ngày'),
      int('tiet_bd', 'Tiết bắt đầu', true),
      int('so_tiet', 'Số tiết', true),
      fk('lop_hp', 'Lớp học phần', 'lop-hoc-phan', 'ma_lop'),
    ],
  },
  {
    key: 'dang-ki',
    label: 'Đăng kí',
    pk: ['ma_sv', 'ma_lop'],
    fields: [
      fk('ma_sv', 'Sinh viên', 'sinh-vien', 'ma_sv', 'ten'),
      fk('ma_lop', 'Lớp học phần', 'lop-hoc-phan', 'ma_lop'),
      score('diem_cc', 'Điểm CC'),
      score('diem_gk', 'Điểm GK'),
      score('diem_ck', 'Điểm CK'),
      field('ngay_dk', 'Ngày đăng kí', 'datetime', false),
    ],
  },
  {
    key: 'chuong-trinh-dao-tao',
    label: 'Chương trình đào tạo',
    pk: ['ma_nganh', 'ma_hp'],
    fields: [
      fk('ma_nganh', 'Ngành', 'nganh', 'ma_nganh', 'ten'),
      fk('ma_hp', 'Học phần', 'hoc-phan', 'ma_hp', 'ten'),
      field('bat_buoc', 'Bắt buộc', 'bool', true),
    ],
  },
  {
    key: 'tien-quyet',
    label: 'Tiên quyết',
    pk: ['mon_hoc', 'mh_tq'],
    fields: [
      fk('mon_hoc', 'Môn học', 'hoc-phan', 'ma_hp', 'ten'),
      fk('mh_tq', 'Môn tiên quyết', 'hoc-phan', 'ma_hp', 'ten'),
    ],
  },
  {
    key: 'ren-luyen',
    label: 'Rèn luyện',
    pk: ['ma_sv', 'ma_hk'],
    fields: [
      fk('ma_sv', 'Sinh viên', 'sinh-vien', 'ma_sv', 'ten'),
      fk('ma_hk', 'Học kỳ', 'hoc-ky', 'ma_hk'),
      int('diem_rl', 'Điểm rèn luyện', true, 0, 100),
    ],
  },
  {
    key: 'hoc-phi',
    label: 'Học phí',
    pk: ['ma_sv', 'ma_hk'],
    fields: [
      fk('ma_sv', 'Sinh viên', 'sinh-vien', 'ma_sv', 'ten'),
      fk('ma_hk', 'Học kỳ', 'hoc-ky', 'ma_hk'),
      field('so_tien', 'Số tiền', 'float', true, { min: 0, step: 1000 }),
      date('ngay_nop', 'Ngày nộp'),
    ],
  },
  {
    key: 'canh-bao',
    label: 'Cảnh báo học vụ',
    pk: ['ma_sv', 'ma_hk'],
    fields: [
      fk('ma_sv', 'Sinh viên', 'sinh-vien', 'ma_sv', 'ten'),
      fk('ma_hk', 'Học kỳ', 'hoc-ky', 'ma_hk'),
      int('muc_cb', 'Mức cảnh báo', true),
    ],
  },
]

export const RESOURCE_MAP: Record<string, ResourceConfig> = Object.fromEntries(
  RESOURCES.map((r) => [r.key, r]),
)
