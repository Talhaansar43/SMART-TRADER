/**
 * TouchFriendlyForm Component
 * Mobile-optimized form inputs with larger touch targets
 * WCAG 2.1 AA compliant (minimum 44x44px touch targets)
 *
 * @example
 * ```tsx
 * <TouchFriendlyInput
 *   label="Email"
 *   type="email"
 *   placeholder="your@email.com"
 * />
 * ```
 */

'use client';

import React from 'react';

interface TouchFriendlyInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'large';
  className?: string;
}

/**
 * TouchFriendlyInput - Mobile-optimized text input
 */
export const TouchFriendlyInput = React.forwardRef<
  HTMLInputElement,
  TouchFriendlyInputProps
>(
  (
    {
      label,
      error,
      helperText,
      icon,
      variant = 'default',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const heightClass = variant === 'large' ? 'h-14' : 'h-12';

    return (
      <div className="w-full mb-4">
        {label && (
          <label
            htmlFor={inputId}
            className={`
              block mb-2 font-medium text-base
              text-gray-700 dark:text-gray-300
              ${error ? 'text-red-600 dark:text-red-400' : ''}
            `}
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 flex-shrink-0">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`
              w-full ${heightClass}
              px-4 ${icon ? 'pl-12' : 'pl-4'}
              rounded-lg border-2 font-base
              text-base text-gray-900 dark:text-white
              placeholder:text-gray-500 dark:placeholder:text-gray-400
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
              disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500
              transition-colors duration-200
              ${
                error
                  ? 'border-red-500 dark:border-red-400'
                  : 'border-gray-300 dark:border-gray-600'
              }
              ${!error && 'hover:border-gray-400 dark:hover:border-gray-500'}
              ${className}
            `}
            aria-describedby={
              error || helperText
                ? `${inputId}-description`
                : undefined
            }
            aria-invalid={error ? 'true' : 'false'}
            {...props}
          />
        </div>

        {(error || helperText) && (
          <p
            id={`${inputId}-description`}
            className={`
              mt-2 text-sm font-medium
              ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}
            `}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

TouchFriendlyInput.displayName = 'TouchFriendlyInput';

/**
 * TouchFriendlySelect - Mobile-optimized select dropdown
 */
interface TouchFriendlySelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'large';
  className?: string;
}

export const TouchFriendlySelect = React.forwardRef<
  HTMLSelectElement,
  TouchFriendlySelectProps
>(
  (
    {
      label,
      options,
      error,
      helperText,
      variant = 'default',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const heightClass = variant === 'large' ? 'h-14' : 'h-12';

    return (
      <div className="w-full mb-4">
        {label && (
          <label
            htmlFor={selectId}
            className={`
              block mb-2 font-medium text-base
              text-gray-700 dark:text-gray-300
              ${error ? 'text-red-600 dark:text-red-400' : ''}
            `}
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          className={`
            w-full ${heightClass}
            px-4 rounded-lg border-2 font-base
            text-base text-gray-900 dark:text-white
            bg-white dark:bg-gray-800
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
            disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500
            transition-colors duration-200
            ${
              error
                ? 'border-red-500 dark:border-red-400'
                : 'border-gray-300 dark:border-gray-600'
            }
            ${!error && 'hover:border-gray-400 dark:hover:border-gray-500'}
            ${className}
          `}
          aria-describedby={
            error || helperText ? `${selectId}-description` : undefined
          }
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        >
          <option value="">Select an option</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {(error || helperText) && (
          <p
            id={`${selectId}-description`}
            className={`
              mt-2 text-sm font-medium
              ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}
            `}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

TouchFriendlySelect.displayName = 'TouchFriendlySelect';

/**
 * TouchFriendlyButton - Mobile-optimized button
 */
interface TouchFriendlyButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'default' | 'large';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const TouchFriendlyButton = React.forwardRef<
  HTMLButtonElement,
  TouchFriendlyButtonProps
>(
  (
    {
      variant = 'primary',
      size = 'default',
      fullWidth = true,
      icon,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const sizeClass = size === 'large' ? 'h-14 text-base' : 'h-12 text-sm';
    const widthClass = fullWidth ? 'w-full' : '';

    const variantStyles = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
    };

    return (
      <button
        ref={ref}
        className={`
          ${sizeClass} ${widthClass}
          px-6 rounded-lg font-medium
          flex items-center justify-center gap-2
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
          ${variantStyles[variant]}
          ${className}
        `}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
      </button>
    );
  }
);

TouchFriendlyButton.displayName = 'TouchFriendlyButton';

export default TouchFriendlyInput;
