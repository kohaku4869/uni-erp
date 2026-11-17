import { useState } from 'react'
import { App, Card, Descriptions, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { RefSelect } from '../ResourceForm'
import { extractError, getDanhSachLop, type DanhSachLop as DanhSachLopData, type SinhVienLop } from '../api'
import { formatNumber } from '../resources'

const num = (v: unknown) => formatNumber(v, 2)

const columns: ColumnsType<SinhVienLop> = [
  { title: 'Mã SV', dataIndex: 'ma_sv' },
  { title: 'Họ tên', dataIndex: 'ten' },
  { title: 'Lớp', dataIndex: 'ma_lophc' },
  { title: 'CC', dataIndex: 'diem_cc', align: 'right', render: num },
  { title: 'GK', dataIndex: 'diem_gk', align: 'right', render: num },
  { title: 'CK', dataIndex: 'diem_ck', align: 'right', render: num },
  { title: 'Tổng kết', dataIndex: 'diem_tk', align: 'right', render: num },
]

export default function DanhSachLop() {
  const { message } = App.useApp()
  const [data, setData] = useState<DanhSachLopData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async (maLop?: string) => {
    if (!maLop) return setData(null)
    setLoading(true)
    try {
      setData(await getDanhSachLop(maLop))
    } catch (e) {
      setData(null)
      message.error(extractError(e))
    } finally {
      setLoading(false)
    }
  }

  const info = data?.lop_hoc_phan

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Danh sách lớp học phần
      </Typography.Title>
      <div style={{ maxWidth: 420 }}>
        <RefSelect
          refConfig={{ resource: 'lop-hoc-phan', valueField: 'ma_lop' }}
          onChange={load}
          allowClear
        />
      </div>
      {data && info && (
        <>
          <Card loading={loading}>
            <Descriptions column={{ xs: 1, md: 2 }} title="Thông tin lớp">
              <Descriptions.Item label="Mã lớp">{info.ma_lop}</Descriptions.Item>
              <Descriptions.Item label="Học phần">{`${info.ma_hp} - ${info.ten_hp}`}</Descriptions.Item>
              <Descriptions.Item label="Học kỳ">{info.ma_hk}</Descriptions.Item>
              <Descriptions.Item label="Giảng viên">{info.ten_gv}</Descriptions.Item>
              <Descriptions.Item label="Phòng">{info.ma_phong}</Descriptions.Item>
              <Descriptions.Item label="Sĩ số / sức chứa">
                {info.si_so} / {info.suc_chua ?? '—'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
          <Table<SinhVienLop>
            bordered
            size="middle"
            loading={loading}
            columns={columns}
            dataSource={data.sinh_vien}
            rowKey="ma_sv"
            pagination={{ pageSize: 20 }}
            scroll={{ x: 'max-content' }}
          />
        </>
      )}
    </Space>
  )
}
