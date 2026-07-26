import React from 'react';
import { Collapse, Input } from 'antd';

const { Panel } = Collapse;

interface NestedObjectEditorProps {
  value: any;
  onChange: (value: any) => void;
  readonly?: boolean;
}

const NestedObjectEditor: React.FC<NestedObjectEditorProps> = ({ value, onChange, readonly }) => {
  const obj = typeof value === 'object' && value !== null ? value : {};
  
  const handleFieldChange = (key: string, newValue: any) => {
    onChange({ ...obj, [key]: newValue });
  };
  
  const renderValue = (val: any) => {
    if (typeof val === 'object' && val !== null) {
      return JSON.stringify(val, null, 2);
    }
    return String(val);
  };
  
  return (
    <Collapse>
      {Object.entries(obj).map(([key, val]) => (
        <Panel header={key} key={key}>
          <Input.TextArea
            value={renderValue(val)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleFieldChange(key, parsed);
              } catch {
                handleFieldChange(key, e.target.value);
              }
            }}
            disabled={readonly}
            rows={6}
            style={{ fontFamily: 'monospace' }}
          />
        </Panel>
      ))}
    </Collapse>
  );
};

export default NestedObjectEditor;
