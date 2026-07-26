import React from 'react';
import { Card, Button, Space, Input, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';

const { Panel } = Collapse;

interface ObjectArrayEditorProps {
  value: any;
  onChange: (value: any) => void;
  readonly?: boolean;
}

const ObjectArrayEditor: React.FC<ObjectArrayEditorProps> = ({ value, onChange, readonly }) => {
  const items = Array.isArray(value) ? value : [];
  
  const handleAdd = () => {
    const template = items.length > 0 ? Object.keys(items[0]).reduce((acc, key) => ({ ...acc, [key]: '' }), {}) : {};
    onChange([...items, template]);
  };
  
  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };
  
  const handleDuplicate = (index: number) => {
    onChange([...items, { ...items[index] }]);
  };
  
  const handleFieldChange = (index: number, field: string, newValue: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: newValue };
    onChange(newItems);
  };
  
  const getItemTitle = (item: any, index: number) => {
    const titleValue = item.title || item.name || item.label;
    return `Item ${index + 1}${titleValue ? `: ${titleValue}` : ''}`;
  };
  
  return (
    <div>
      <Collapse>
        {items.map((item, index) => (
          <Panel
            header={getItemTitle(item, index)}
            key={index}
            extra={
              !readonly && (
                <Space onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => handleDuplicate(index)}
                  />
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemove(index)}
                  />
                </Space>
              )
            }
          >
            {Object.entries(item).map(([key, val]) => {
              const displayValue = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val || '');
              return (
                <div key={key} style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{key}</label>
                  <Input.TextArea
                    value={displayValue}
                    onChange={(e) => handleFieldChange(index, key, e.target.value)}
                    disabled={readonly}
                    rows={2}
                  />
                </div>
              );
            })}
          </Panel>
        ))}
      </Collapse>
      {!readonly && (
        <Button
          type="dashed"
          onClick={handleAdd}
          icon={<PlusOutlined />}
          block
          style={{ marginTop: 8 }}
        >
          Add Object
        </Button>
      )}
    </div>
  );
};

export default ObjectArrayEditor;
