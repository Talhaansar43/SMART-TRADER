/**
 * HeadingHierarchy Component
 * Ensures proper heading hierarchy for accessibility
 * Maintains semantic structure for screen readers
 *
 * @example
 * ```tsx
 * <Heading level={1}>Main Title</Heading>
 * <Heading level={2}>Section</Heading>
 * <Heading level={3} srOnly>Hidden but read by screen readers</Heading>
 * ```
 */

'use client';

import React, { ReactNode } from 'react';

interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
  variant?: 'default' | 'small' | 'large';
  srOnly?: boolean;
  id?: string;
  className?: string;
}

const levelTags = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
  5: 'h5',
  6: 'h6',
} as const;

const variantStyles = {
  default: {
    1: 'text-4xl',
    2: 'text-3xl',
    3: 'text-2xl',
    4: 'text-xl',
    5: 'text-lg',
    6: 'text-base',
  },
  small: {
    1: 'text-3xl',
    2: 'text-2xl',
    3: 'text-xl',
    4: 'text-lg',
    5: 'text-base',
    6: 'text-sm',
  },
  large: {
    1: 'text-5xl',
    2: 'text-4xl',
    3: 'text-3xl',
    4: 'text-2xl',
    5: 'text-xl',
    6: 'text-lg',
  },
};

export const Heading = ({
  level = 1,
  children,
  variant = 'default',
  srOnly = false,
  id,
  className = '',
}: HeadingProps) => {
  const Tag = levelTags[level] as any;
  const sizeClass = variantStyles[variant][level];

  return (
    <Tag
      id={id}
      className={`
        ${sizeClass}
        font-bold font-sans
        text-gray-900 dark:text-white
        ${srOnly ? 'sr-only' : ''}
        ${className}
      `}
    >
      {children}
    </Tag>
  );
};

/**
 * PageHeading - Main page title with proper semantics
 */
export const PageHeading = ({
  children,
  srOnly = false,
  id,
  className = '',
}: Omit<HeadingProps, 'level' | 'variant'>) => {
  return (
    <Heading
      level={1}
      variant="large"
      srOnly={srOnly}
      id={id}
      className={`mb-6 ${className}`}
    >
      {children}
    </Heading>
  );
};

/**
 * SectionHeading - Section title
 */
export const SectionHeading = ({
  children,
  srOnly = false,
  id,
  className = '',
}: Omit<HeadingProps, 'level' | 'variant'>) => {
  return (
    <Heading
      level={2}
      variant="default"
      srOnly={srOnly}
      id={id}
      className={`mb-4 mt-6 ${className}`}
    >
      {children}
    </Heading>
  );
};

/**
 * SubsectionHeading - Subsection title
 */
export const SubsectionHeading = ({
  children,
  srOnly = false,
  id,
  className = '',
}: Omit<HeadingProps, 'level' | 'variant'>) => {
  return (
    <Heading
      level={3}
      variant="small"
      srOnly={srOnly}
      id={id}
      className={`mb-3 ${className}`}
    >
      {children}
    </Heading>
  );
};

export default Heading;
