import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, errorMessage } from '../api/client';

export type FieldSpec = {
  name: string;
  label: string;
  kind: 'text' | 'email' | 'number' | 'date' | 'textarea' | 'select';
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
};

type Props = {
  title: string;
  fields: FieldSpec[];
  initial: Record<string, string>;
  submitLabel: string;
  onSave: (values: Record<string, string>) => Promise<void>;
  onClose: () => void;
  validate?: (values: Record<string, string>) => Record<string, string>;
};

// Native dialog: it traps focus, closes on Escape, and returns focus to the button that opened it.
export function FormDialog({ title, fields, initial, submitLabel, onSave, onClose, validate }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  function set(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function checkRequired(): Record<string, string> {
    const found: Record<string, string> = {};
    for (const field of fields) {
      const value = (values[field.name] ?? '').trim();
      if (field.required && value === '') found[field.name] = `${field.label} is required.`;
      if (field.kind === 'email' && value !== '' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
        found[field.name] = 'Enter an email address, such as name@example.com.';
      }
      if (field.kind === 'number' && value !== '') {
        const number = Number(value);
        if (Number.isNaN(number)) found[field.name] = `${field.label} must be a number.`;
        else if (field.min !== undefined && number < field.min) found[field.name] = `${field.label} must be ${field.min} or more.`;
        else if (field.max !== undefined && number > field.max) found[field.name] = `${field.label} must be ${field.max} or less.`;
      }
    }
    return { ...found, ...(validate ? validate(values) : {}) };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = checkRequired();
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await onSave(values);
      onClose();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : errorMessage(error));
      setSaving(false);
    }
  }

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" onCancel={onClose}>
      <form onSubmit={submit} noValidate>
        <h2 id="dialog-title">{title}</h2>
        {fields.map((field) => {
          const id = `field-${field.name}`;
          const error = errors[field.name];
          const common = {
            id,
            name: field.name,
            value: values[field.name] ?? '',
            'aria-invalid': error ? true : undefined,
            'aria-describedby': error ? `${id}-error` : undefined,
            onChange: (event: { target: { value: string } }) => set(field.name, event.target.value),
          };
          return (
            <div className="field" key={field.name}>
              <label htmlFor={id}>
                {field.label}
                {field.required && <span aria-hidden="true"> *</span>}
              </label>
              {field.kind === 'textarea' ? (
                <textarea {...common} rows={3} />
              ) : field.kind === 'select' ? (
                <select {...common}>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  {...common}
                  type={field.kind}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                />
              )}
              {field.hint && !error && <p className="hint">{field.hint}</p>}
              {error && (
                <p className="field-error" id={`${id}-error`}>
                  {error}
                </p>
              )}
            </div>
          );
        })}
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary" disabled={saving}>
            {saving ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
