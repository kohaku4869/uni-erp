import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Menu, Row, Space, Table, Typography } from 'antd'
import { CaretRightOutlined } from '@ant-design/icons'
import {
  extractError,
  listQueries,
  runQuery,
  type QueryInfo,
  type QueryResult,
} from '../api'

const show = (v: unknown) =>
  v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)

export default function TruyVan() {
  const [queries, setQueries] = useState<QueryInfo[]>([])
  const [selected, setSelected] = useState<string>()
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  const run = async (id: string) => {
    setLoading(true)
    setError(undefined)
    try {
      setResult(await runQuery(id))
    } catch (e) {
      setResult(null)
      setError(extractError(e))
    } finally {
      setLoading(false)
    }
  }

  // Chọn truy vấn nào thì chạy luôn truy vấn đó
  const select = (id: string) => {
    setSelected(id)
    void run(id)
  }

  useEffect(() => {
    listQueries()
      .then((list) => {
        setQueries(list)
        if (list.length) select(list[0].id)
      })
      .catch((e) => setError(extractError(e)))
  }, [])

  const query = queries.find((q) => q.id === selected)
  // Hàng là mảng → đổi thành object theo chỉ số cột
  const columns = (result?.columns ?? []).map((name, i) => ({
    title: name,
    dataIndex: String(i),
    render: show,
  }))
  const dataSource = (result?.rows ?? []).map((r, n) => ({
    key: n,
    ...Object.fromEntries(r.map((v, i) => [String(i), v])),
  }))

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Truy vấn SQL
      </Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8} xl={7}>
          <Card styles={{ body: { padding: 0 } }}>
            <Menu
              mode="inline"
              selectedKeys={selected ? [selected] : []}
              onClick={(e) => select(e.key)}
              items={queries.map((q) => ({ key: q.id, label: q.title, title: q.title }))}
              style={{ borderInlineEnd: 0 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={16} xl={17} style={{ minWidth: 0 }}>
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            {query && (
              <Card>
                <Typography.Title level={4} style={{ marginTop: 0 }}>
                  {query.title}
                </Typography.Title>
                {query.desc && <Typography.Paragraph>{query.desc}</Typography.Paragraph>}
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 6,
                    overflowX: 'auto',
                    whiteSpace: 'pre',
                    fontFamily: 'Consolas, Menlo, monospace',
                    fontSize: 13,
                    margin: '0 0 12px',
                  }}
                >
                  {query.sql}
                </pre>
                <Button
                  type="primary"
                  icon={<CaretRightOutlined />}
                  loading={loading}
                  onClick={() => run(query.id)}
                >
                  Chạy truy vấn
                </Button>
              </Card>
            )}
            {error && <Alert type="error" showIcon message="Lỗi" description={error} />}
            {result && (
              <Card>
                <Typography.Text type="secondary">
                  {result.row_count} dòng · {result.elapsed_ms} ms
                </Typography.Text>
                <Table
                  size="small"
                  loading={loading}
                  columns={columns}
                  dataSource={dataSource}
                  scroll={{ x: 'max-content' }}
                  pagination={{ pageSize: 20, hideOnSinglePage: true }}
                  style={{ marginTop: 8 }}
                />
              </Card>
            )}
          </Space>
        </Col>
      </Row>
    </Space>
  )
}
