import React from 'react';
import { Input } from 'antd';

interface TextEditorProps {
  value: any;
  onChange: (value: any) => void;
  readonly?: boolean;
}

const TextEditor: React.FC<TextEditorProps> = ({ value, onChange, readonly }) => {
  let stringValue = '';
  if (value !== null && value !== undefined) {
    stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
  
  const isNumber = typeof value === 'number' || (!isNaN(Number(value)) && value !== '' && typeof value !== 'object');
  
  return (
    <Input
      value={stringValue}
      onChange={(e) => {
        const newValue = e.target.value;
        onChange(isNumber && newValue ? Number(newValue) : newValue);
      }}
      disabled={readonly}
      type={isNumber ? 'number' : 'text'}
    />
  );
};

export default TextEditor;
