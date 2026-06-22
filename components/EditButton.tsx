import { useState } from 'react';

interface Props {
  initialValue: string;
  onSave: (value: string) => void;
  multiline?: boolean;
  label?: string;
}

export function EditButton({ initialValue, onSave, multiline = false, label }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue);

  const handleSave = () => {
    onSave(value);
    setEditing(false);
  };

  const handleCancel = () => {
    setValue(initialValue);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
        ✏️ Edit
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {label && <label className="input-label">{label}</label>}
      {multiline ? (
        <textarea
          className="input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
        />
      ) : (
        <input
          className="input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
        <button className="btn btn-secondary btn-sm" onClick={handleCancel}>Cancel</button>
      </div>
    </div>
  );
}
