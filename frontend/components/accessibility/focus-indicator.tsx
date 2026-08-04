/**
 * FocusIndicator Component
 * Enhanced focus ring for better keyboard navigation visibility
 * WCAG 2.1 AA Level compliance for focus indicators
 *
 * @example
 * ```tsx
 * <FocusIndicator element="button">
 *   Click me
 * </FocusIndicator>
 * ```
 */

'use client';

import React, { ReactNode, ElementType } from 'react';

interface FocusIndicatorProps {
  element?: ElementType;
  children: ReactNode;
  variant?: 'default' | 'strong' | 'subtle';
  color?: 'blue' | 'purple' | 'green';
  className?: string;
  [key: string]: any;
}

const variantStyles = {
  default: 'ring-2 ring-offset-2 ring-blue-500',
  strong: 'ring-4 ring-offset-2 ring-blue-600',
  subtle: 'ring-1 ring-offset-1 ring-blue-400',
};

const colorStyles = {
  blue: 'focus-visible:ring-blue-500',
  purple: 'focus-visible:ring-purple-500',
  green: 'focus-visible:ring-green-500',
};

export const FocusIndicator = ({
  element: Element = 'div',
  children,
  variant = 'default',
  color = 'blue',
  className = '',
  ...props
}: FocusIndicatorProps) => {
  const focusClass = `
    focus-visible:outline-none
    focus-visible:${variantStyles[variant]}
    ${colorStyles[color]}
    transition-all duration-150
  `;

  return (
    <Element
      className={`${focusClass} ${className}`}
      {...props}
    >
      {children}
    </Element>
  );
};

/**
 * Wrapper for interactive elements with enhanced focus management
 */
export const AccessibleButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'default' | 'strong' | 'subtle';
  }
>(({ variant = 'default', className = '', children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={`
        focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
        rounded transition-all duration-150
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
});

AccessibleButton.displayName = 'AccessibleButton';

/**
 * Wrapper for interactive links with enhanced focus management
 */
export const AccessibleLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className = '', children, ...props }, ref) => {
  return (
    <a
      ref={ref}
      className={`
        focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
        rounded transition-all duration-150
        ${className}
      `}
      {...props}
    >
      {children}
    </a>
  );
});

AccessibleLink.displayName = 'AccessibleLink';

export default FocusIndicator;
