import { useState } from 'react'
import { App, Card, Descriptions, Space, Statistic, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { RefSelect } from '../ResourceForm'
import { extractError, getBangDiem, type BangDiem as BangDiemData, type KetQuaHocTap } from '../api'
import { DASH, formatDate, formatNumber } from '../resources'

const num = (v: unknown) => formatNumber(v, 2)

const columns: ColumnsType<KetQuaHocTap> = [
  { title: 'Học kỳ', dataIndex: 'ma_hk' },
  { title: 'Mã HP', dataIndex: 'ma_hp' },
  { title: 'Tên học phần', dataIndex: 'ten_hp' },
  { title: 'Lớp HP', dataIndex: 'ma_lop' },
  { title: 'Số TC', dataIndex: 'so_tc', align: 'right' },
  { title: 'CC', dataIndex: 'diem_cc', align: 'right', render: num },
  { title: 'GK', dataIndex: 'diem_gk', align: 'right', render: num },
  { title: 'CK', dataIndex: 'diem_ck', align: 'right', render: num },
  { title: 'Tổng kết', dataIndex: 'diem_tk', align: 'right', render: num },
]

export default function BangDiem() {
  const { message } = App.useApp()
  const [data, setData] = useState<BangDiemData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async (maSv?: string) => {
    if (!maSv) return setData(null)
    setLoading(true)
    try {
      setData(await getBangDiem(maSv))
    } catch (e) {
      setData(null)
      message.error(extractError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Bảng điểm
      </Typography.Title>
      <div style={{ maxWidth: 420 }}>
        <RefSelect
          refConfig={{ resource: 'sinh-vien', valueField: 'ma_sv', labelField: 'ten' }}
          onChange={load}
          allowClear
        />
      </div>
      {data && (
        <>
          <Card loading={loading}>
            <Descriptions column={{ xs: 1, md: 2 }} title="Thông tin sinh viên">
              <Descriptions.Item label="Mã SV">{data.sinh_vien.ma_sv}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">{data.sinh_vien.ten}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">{formatDate(data.sinh_vien.ngaysinh)}</Descriptions.Item>
              <Descriptions.Item label="Lớp">
                {data.sinh_vien.ten_lop ?? data.sinh_vien.ma_lophc}
              </Descriptions.Item>
              <Descriptions.Item label="Ngành">{data.sinh_vien.ten_nganh ?? DASH}</Descriptions.Item>
            </Descriptions>
            <Space size={48}>
              <Statistic title="Tổng tín chỉ tích lũy" value={data.tong_tc} />
              <Statistic title="GPA (hệ 10)" value={data.gpa_he10 ?? '—'} />
            </Space>
          </Card>
          <Table<KetQuaHocTap>
            bordered
            size="middle"
            loading={loading}
            columns={columns}
            dataSource={data.ket_qua}
            rowKey={(r) => `${r.ma_hk}|${r.ma_lop}`}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </>
      )}
    </Space>
  )
}
