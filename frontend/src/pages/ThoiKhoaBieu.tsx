import { useState } from 'react'
import { App, Flex, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { RefSelect } from '../ResourceForm'
import { extractError, getThoiKhoaBieu, type TkbItem } from '../api'
import { formatDate } from '../resources'

const columns: ColumnsType<TkbItem> = [
  { title: 'Ngày', dataIndex: 'ngay', render: formatDate },
  { title: 'Tiết bắt đầu', dataIndex: 'tiet_bd', align: 'right' },
  { title: 'Số tiết', dataIndex: 'so_tiet', align: 'right' },
  { title: 'Học phần', dataIndex: 'ten_hp', render: (v: string, r) => `${r.ma_hp} - ${v}` },
  { title: 'Lớp HP', dataIndex: 'ma_lop' },
  { title: 'Phòng', dataIndex: 'ma_phong' },
  { title: 'Giảng viên', dataIndex: 'ten_gv' },
]

export default function ThoiKhoaBieu() {
  const { message } = App.useApp()
  const [maSv, setMaSv] = useState<string>()
  const [maHk, setMaHk] = useState<string>()
  const [rows, setRows] = useState<TkbItem[]>([])
  const [loading, setLoading] = useState(false)

  const load = async (sv?: string, hk?: string) => {
    if (!sv) return setRows([])
    setLoading(true)
    try {
      setRows(await getThoiKhoaBieu(sv, hk))
    } catch (e) {
      setRows([])
      message.error(extractError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Thời khóa biểu
      </Typography.Title>
      <Flex gap={16} wrap>
        <div style={{ width: 320 }}>
          <RefSelect
            refConfig={{ resource: 'sinh-vien', valueField: 'ma_sv', labelField: 'ten' }}
            value={maSv}
            onChange={(v) => {
              setMaSv(v)
              void load(v, maHk)
            }}
            allowClear
          />
        </div>
        <div style={{ width: 240 }}>
          <RefSelect
            refConfig={{ resource: 'hoc-ky', valueField: 'ma_hk' }}
            value={maHk}
            onChange={(v) => {
              setMaHk(v)
              void load(maSv, v)
            }}
            allowClear
          />
        </div>
      </Flex>
      <Table<TkbItem>
        bordered
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={rows}
        rowKey={(r) => `${r.ngay}|${r.tiet_bd}|${r.ma_lop}`}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: maSv ? 'Không có lịch học' : 'Chọn sinh viên để xem thời khóa biểu' }}
      />
    </Space>
  )
}
