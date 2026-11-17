import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { App, Button, Flex, Input, Popconfirm, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { createRow, deleteRow, extractError, listRows, updateRow, type Row } from './api'
import { DASH, formatDate, formatDateTime, formatNumber, RESOURCE_MAP, type FieldConfig } from './resources'
import ResourceForm from './ResourceForm'

function renderCell(f: FieldConfig, v: unknown) {
  if (f.type === 'bool') return v ? <Tag color="green">Có</Tag> : <Tag>Không</Tag>
  if (v === null || v === undefined || v === '') return DASH
  if (f.type === 'date') return formatDate(v)
  if (f.type === 'datetime') return formatDateTime(v)
  if (f.type === 'int' || f.type === 'float') return formatNumber(v)
  return String(v)
}

export default function ResourcePage() {
  const { resourceKey = '' } = useParams()
  if (!RESOURCE_MAP[resourceKey]) return <Navigate to="/" replace />
  // key forces fresh state when switching between resources
  return <ResourceView key={resourceKey} resourceKey={resourceKey} />
}

function ResourceView({ resourceKey }: { resourceKey: string }) {
  const config = RESOURCE_MAP[resourceKey]
  const { message } = App.useApp()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [reloadCount, setReloadCount] = useState(0)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    listRows(resourceKey)
      .then((data) => alive && setRows(data))
      .catch((e) => alive && message.error(extractError(e)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [resourceKey, reloadCount, message])

  const reload = () => setReloadCount((n) => n + 1)
  const pkValues = (row: Row) => config.pk.map((k) => String(row[k]))

  const handleSubmit = async (values: Row, isEdit: boolean) => {
    setSaving(true)
    try {
      if (isEdit && editing) await updateRow(resourceKey, pkValues(editing), values)
      else await createRow(resourceKey, values)
      message.success(isEdit ? 'Đã cập nhật' : 'Đã thêm mới')
      setOpen(false)
      reload()
    } catch (e) {
      message.error(extractError(e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row: Row) => {
    try {
      await deleteRow(resourceKey, pkValues(row))
      message.success('Đã xóa')
      reload()
    } catch (e) {
      message.error(extractError(e))
    }
  }

  const openForm = (row: Row | null) => {
    setEditing(row)
    setOpen(true)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => Object.values(r).some((v) => v != null && String(v).toLowerCase().includes(q)))
  }, [rows, search])

  const columns: ColumnsType<Row> = [
    ...config.fields.map((f) => ({
      title: f.label,
      dataIndex: f.name,
      key: f.name,
      render: (v: unknown) => renderCell(f, v),
      sorter: (a: Row, b: Row) =>
        String(a[f.name] ?? '').localeCompare(String(b[f.name] ?? ''), 'vi', { numeric: true }),
    })),
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_: unknown, row: Row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openForm(row)} />
          <Popconfirm
            title="Xóa bản ghi này?"
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(row)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {config.label}
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm(null)}>
          Thêm mới
        </Button>
      </Flex>
      <Input.Search
        allowClear
        placeholder="Tìm kiếm..."
        style={{ maxWidth: 320, marginBottom: 16 }}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Table<Row>
        size="middle"
        bordered
        loading={loading}
        columns={columns}
        dataSource={filtered}
        rowKey={(r) => config.pk.map((k) => String(r[k])).join('|')}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} bản ghi` }}
        scroll={{ x: 'max-content' }}
      />
      <ResourceForm
        config={config}
        open={open}
        editing={editing}
        saving={saving}
        onCancel={() => setOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  )
}
