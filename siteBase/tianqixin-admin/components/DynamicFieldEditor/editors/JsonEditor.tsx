import React, { useState } from 'react';
import { Input, Alert } from 'antd';

const { TextArea } = Input;

interface JsonEditorProps {
  value: any;
  onChange: (value: any) => void;
  readonly?: boolean;
}

const JsonEditor: React.FC<JsonEditorProps> = ({ value, onChange, readonly }) => {
  const [error, setError] = useState<string>('');
  const jsonString = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  
  const handleChange = (newValue: string) => {
    try {
      const parsed = JSON.parse(newValue);
      setError('');
      onChange(parsed);
    } catch (e) {
      setError('Invalid JSON format');
      onChange(newValue);
    }
  };
  
  return (
    <div>
      {error && <Alert message={error} type="error" style={{ marginBottom: 8 }} />}
      <TextArea
        value={jsonString}
        onChange={(e) => handleChange(e.target.value)}
        disabled={readonly}
        rows={10}
        style={{ fontFamily: 'monospace' }}
      />
    </div>
  );
};

export default JsonEditor;
