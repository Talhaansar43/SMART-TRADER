/**
 * File Purpose: Reusable form field component with validation
 * Last Updated: July 30, 2026
 * Dependencies: react-hook-form, lucide-react
 * Related Files: components/trades/place-order-form.tsx
 */

'use client';

import { ReactNode } from 'react';
import { FieldError } from 'react-hook-form';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  placeholder?: string;
  error?: FieldError;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  type?: 'text' | 'email' | 'number' | 'password' | 'date' | 'time';
  disabled?: boolean;
  required?: boolean;
  children?: ReactNode;
  variant?: 'input' | 'select' | 'textarea';
  helperText?: string;
  successMessage?: string;
  isValid?: boolean;
  className?: string;
  inputClassName?: string;
}

export function FormField({
  label,
  placeholder,
  error,
  value,
  onChange,
  onBlur,
  type = 'text',
  disabled = false,
  required = false,
  children,
  variant = 'input',
  helperText,
  successMessage,
  isValid = false,
  className = '',
  inputClassName = '',
}: FormFieldProps) {
  const hasError = !!error;
  const showSuccess = isValid && !hasError && successMessage;

  const baseInputClasses = `
    w-full px-4 py-2 rounded-lg border-2 transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500
    text-base font-medium
  `;

  const inputStateClasses = hasError
    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50'
    : showSuccess
      ? 'border-green-300 focus:border-green-500 focus:ring-green-200 bg-green-50'
      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200 bg-white hover:border-slate-400';

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <label className="block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Input/Select/Textarea */}
      <div className="relative">
        {variant === 'input' && (
          <input
            type={type}
            placeholder={placeholder}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            className={`${baseInputClasses} ${inputStateClasses} ${inputClassName}`}
          />
        )}

        {variant === 'select' && (
          <select
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            className={`${baseInputClasses} ${inputStateClasses} ${inputClassName}`}
          >
            <option value="">{placeholder || 'Select an option'}</option>
            {children}
          </select>
        )}

        {variant === 'textarea' && (
          <textarea
            placeholder={placeholder}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            rows={4}
            className={`${baseInputClasses} ${inputStateClasses} ${inputClassName} resize-none`}
          />
        )}

        {/* Status Icon */}
        {hasError && (
          <AlertCircle className="absolute right-3 top-3 h-5 w-5 text-red-500 flex-shrink-0" />
        )}
        {showSuccess && (
          <CheckCircle className="absolute right-3 top-3 h-5 w-5 text-green-500 flex-shrink-0" />
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error.message}</span>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className="flex items-start gap-2 text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200">
          <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Helper Text */}
      {helperText && !hasError && !showSuccess && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
}

export default FormField;
