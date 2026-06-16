import React from 'react';
import { classNames } from '@/utils';

export type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> & {
  label?: string;
  error?: string;
  value: string;
  onChange?: (value: string) => void;
  className?: string;
};

const Input: React.FC<InputProps> = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  label,
  className = '',
  ...rest
}) => {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={classNames('form-input', error ? 'error' : '', className)}
        {...rest}
      />
      {error && <div className="form-error">{error}</div>}
    </div>
  );
};

export { Input };
export default Input;