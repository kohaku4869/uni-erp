import { useEffect, useState } from 'react'
import { DatePicker, Form, Input, InputNumber, Modal, Select, Switch } from 'antd'
import dayjs from 'dayjs'
import { listRows, type Row } from './api'
import type { FieldConfig, FieldRef, ResourceConfig } from './resources'

interface RefSelectProps {
  refConfig: FieldRef
  value?: string
  onChange?: (v: string) => void
  disabled?: boolean
  allowClear?: boolean
}

/** Select whose options are loaded from the referenced (foreign-key) resource. */
export function RefSelect({ refConfig, value, onChange, disabled, allowClear }: RefSelectProps) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const { resource, valueField, labelField } = refConfig

  useEffect(() => {
    let alive = true
    listRows(resource)
      .then((rows) => {
        if (!alive) return
        setOptions(
          rows.map((r) => {
            const v = String(r[valueField])
            const name = labelField ? r[labelField] : undefined
            return { value: v, label: name ? `${v} - ${String(name)}` : v }
          }),
        )
      })
      .catch(() => alive && setOptions([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [resource, valueField, labelField])

  return (
    <Select
      showSearch={{ optionFilterProp: 'label' }}
      options={options}
      loading={loading}
      value={value}
      onChange={onChange}
      disabled={disabled}
      allowClear={allowClear}
      placeholder="Chọn..."
    />
  )
}

function toFormValues(config: ResourceConfig, row: Row | null): Row {
  const out: Row = {}
  for (const f of config.fields) {
    const v = row?.[f.name]
    if (f.type === 'bool') out[f.name] = row ? Boolean(v) : true
    else if (v === null || v === undefined) out[f.name] = undefined
    else if (f.type === 'date' || f.type === 'datetime') out[f.name] = dayjs(v as string)
    else out[f.name] = v
  }
  return out
}

function toPayload(config: ResourceConfig, values: Row, isEdit: boolean): Row {
  const out: Row = {}
  for (const f of config.fields) {
    if (isEdit && config.pk.includes(f.name)) continue
    const v = values[f.name]
    if (v === undefined || v === null || v === '') {
      // empty optional field: null on edit (clears it), omitted on create for datetime so the DB default applies
      if (isEdit || f.type !== 'datetime') out[f.name] = f.type === 'bool' ? false : null
    } else if (f.type === 'date') out[f.name] = (v as dayjs.Dayjs).format('YYYY-MM-DD')
    else if (f.type === 'datetime') out[f.name] = (v as dayjs.Dayjs).format('YYYY-MM-DDTHH:mm:ss')
    else out[f.name] = v
  }
  return out
}

function renderInput(f: FieldConfig, disabled: boolean) {
  if (f.ref) return <RefSelect refConfig={f.ref} disabled={disabled} allowClear={!f.required} />
  const style = { width: '100%' }
  switch (f.type) {
    case 'int':
      return <InputNumber style={style} precision={0} min={f.min} max={f.max} disabled={disabled} />
    case 'float':
      return <InputNumber style={style} min={f.min} max={f.max} step={f.step ?? 1} disabled={disabled} />
    case 'date':
      return <DatePicker style={style} format="DD/MM/YYYY" disabled={disabled} />
    case 'datetime':
      return <DatePicker showTime style={style} format="DD/MM/YYYY HH:mm:ss" disabled={disabled} />
    case 'bool':
      return <Switch checkedChildren="Có" unCheckedChildren="Không" disabled={disabled} />
    default:
      return <Input disabled={disabled} />
  }
}

interface Props {
  config: ResourceConfig
  open: boolean
  editing: Row | null
  saving: boolean
  onCancel: () => void
  onSubmit: (values: Row, isEdit: boolean) => void
}

export default function ResourceForm({ config, open, editing, saving, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm()
  const isEdit = editing !== null

  useEffect(() => {
    if (open) {
      form.resetFields()
      form.setFieldsValue(toFormValues(config, editing))
    }
  }, [open, editing, config, form])

  return (
    <Modal
      title={`${isEdit ? 'Sửa' : 'Thêm mới'} ${config.label.toLowerCase()}`}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Lưu"
      cancelText="Hủy"
      confirmLoading={saving}
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => onSubmit(toPayload(config, v as Row, isEdit), isEdit)}
      >
        {config.fields.map((f) => (
          <Form.Item
            key={f.name}
            name={f.name}
            label={f.label}
            valuePropName={f.type === 'bool' ? 'checked' : 'value'}
            rules={f.required ? [{ required: true, message: `Vui lòng nhập ${f.label.toLowerCase()}` }] : []}
          >
            {renderInput(f, isEdit && config.pk.includes(f.name))}
          </Form.Item>
        ))}
      </Form>
    </Modal>
  )
}
