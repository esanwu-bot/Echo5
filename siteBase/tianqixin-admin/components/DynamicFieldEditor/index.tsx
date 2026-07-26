import React from 'react';
import { Input, Button, Space } from 'antd';
import JsonArrayEditor from '../JsonArrayEditor';

const { TextArea } = Input;

interface DynamicFieldEditorProps {
  value?: any;
  onChange?: (value: any) => void;
  fieldName?: string;
  fieldType?: string;
  readonly?: boolean;
  placeholder?: string;
}

const DynamicFieldEditor: React.FC<DynamicFieldEditorProps> = ({
  value,
  onChange,
  fieldName,
  fieldType,
  readonly = false,
  placeholder
}) => {
  // If value is an object, treat it as complex type regardless of fieldType
  const isSimpleType = (fieldType === 'input' || fieldType === 'text' || fieldType === 'number' || fieldType === 'textarea') && (typeof value !== 'object' || value === null);

  let displayValue = '';
  try {
    if (value === null || value === undefined) {
      displayValue = '';
    } else if (typeof value === 'object') {
      displayValue = JSON.stringify(value, null, 2);
    } else {
      displayValue = String(value);
    }
  } catch (e) {
    displayValue = '';
  }

  const handleChange = (newValue: string) => {
    if (!onChange) return;

    if (isSimpleType && fieldType !== 'textarea') {
      onChange(newValue);
    } else {
      try {
        const parsed = JSON.parse(newValue);
        onChange(parsed);
      } catch {
        onChange(newValue);
      }
    }
  };

  if (isSimpleType && fieldType !== 'textarea') {
    return (
      <Input
        value={displayValue}
        onChange={(e) => handleChange(e.target.value)}
        disabled={readonly}
        placeholder={placeholder}
      />
    );
  }

  const [mode, setMode] = React.useState<'visual' | 'code'>('visual');

  const isArray = Array.isArray(value) || (typeof value === 'string' && value.trim().startsWith('['));

  if (isArray && mode === 'visual') {
    let arrayValue = value;
    if (typeof value === 'string') {
      try {
        arrayValue = JSON.parse(value);
      } catch {
        arrayValue = [];
      }
    }

    return (
      <div style={{ border: '1px solid #d9d9d9', padding: 16, borderRadius: 6 }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="small" onClick={() => setMode('code')}>切换到代码模式</Button>
        </div>
        <JsonArrayEditor
          value={arrayValue as any[]}
          onChange={(newVal) => {
            if (onChange) onChange(newVal);
          }}
        />
      </div>
    );
  }

  return (
    <div>
      {isArray && (
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="small" onClick={() => setMode('visual')}>切换到可视化模式</Button>
        </div>
      )}
      <TextArea
        value={displayValue}
        onChange={(e) => handleChange(e.target.value)}
        disabled={readonly}
        rows={isSimpleType ? 4 : 10}
        style={{ fontFamily: isSimpleType ? 'inherit' : 'monospace' }}
        placeholder={placeholder}
      />
    </div>
  );
};

export default DynamicFieldEditor;
