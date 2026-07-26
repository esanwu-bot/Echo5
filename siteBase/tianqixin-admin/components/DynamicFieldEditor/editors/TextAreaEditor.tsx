import React from 'react';
import { Input } from 'antd';

const { TextArea } = Input;

interface TextAreaEditorProps {
  value: any;
  onChange: (value: any) => void;
  readonly?: boolean;
}

const TextAreaEditor: React.FC<TextAreaEditorProps> = ({ value, onChange, readonly }) => {
  let stringValue = '';
  if (value !== null && value !== undefined) {
    stringValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  }
  
  return (
    <TextArea
      value={stringValue}
      onChange={(e) => onChange(e.target.value)}
      disabled={readonly}
      rows={4}
      showCount
    />
  );
};

export default TextAreaEditor;
