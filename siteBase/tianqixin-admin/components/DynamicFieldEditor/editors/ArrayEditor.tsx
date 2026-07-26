import React from 'react';
import { Input, Button, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

interface ArrayEditorProps {
  value: any;
  onChange: (value: any) => void;
  readonly?: boolean;
}

const ArrayEditor: React.FC<ArrayEditorProps> = ({ value, onChange, readonly }) => {
  const items = Array.isArray(value) ? value : [];
  
  const handleAdd = () => {
    onChange([...items, '']);
  };
  
  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };
  
  const handleChange = (index: number, newValue: string) => {
    const newItems = [...items];
    newItems[index] = newValue;
    onChange(newItems);
  };
  
  return (
    <div>
      {items.map((item, index) => {
        let displayValue = '';
        try {
          displayValue = typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item || '');
        } catch (e) {
          displayValue = '[Error]';
        }
        return (
          <Space key={index} style={{ display: 'flex', marginBottom: 8, width: '100%' }}>
            <Input
              value={displayValue}
              onChange={(e) => handleChange(index, e.target.value)}
              disabled={readonly}
              style={{ flex: 1 }}
            />
            {!readonly && (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemove(index)}
              />
            )}
          </Space>
        );
      })}
      {!readonly && (
        <Button type="dashed" onClick={handleAdd} icon={<PlusOutlined />} block>
          Add Item
        </Button>
      )}
    </div>
  );
};

export default ArrayEditor;
