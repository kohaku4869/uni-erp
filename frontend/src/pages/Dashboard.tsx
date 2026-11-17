import { useEffect, useState } from 'react'
import { App, Card, Col, Row, Spin, Statistic, Typography } from 'antd'
import { extractError, getThongKe, type ThongKe } from '../api'

const CARDS: { key: keyof ThongKe; label: string }[] = [
  { key: 'khoa', label: 'Khoa' },
  { key: 'nganh', label: 'Ngành' },
  { key: 'giang_vien', label: 'Giảng viên' },
  { key: 'sinh_vien', label: 'Sinh viên' },
  { key: 'hoc_phan', label: 'Học phần' },
  { key: 'lop_hoc_phan', label: 'Lớp học phần' },
  { key: 'dang_ki', label: 'Lượt đăng kí' },
]

export default function Dashboard() {
  const { message } = App.useApp()
  const [data, setData] = useState<ThongKe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getThongKe()
      .then(setData)
      .catch((e) => message.error(extractError(e)))
      .finally(() => setLoading(false))
  }, [message])

  return (
    <>
      <Typography.Title level={3}>Tổng quan</Typography.Title>
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {CARDS.map((c) => (
            <Col key={c.key} xs={12} md={8} xl={6}>
              <Card>
                <Statistic title={c.label} value={data?.[c.key] ?? '—'} />
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>
    </>
  )
}
