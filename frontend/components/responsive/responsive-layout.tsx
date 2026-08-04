/**
 * ResponsiveLayout Component
 * Adapts layout for different screen sizes
 * Mobile-first responsive design approach
 *
 * @example
 * ```tsx
 * <ResponsiveLayout>
 *   <ResponsiveGrid columns={{ default: 1, md: 2, lg: 3 }}>
 *     <Card>Item 1</Card>
 *     <Card>Item 2</Card>
 *   </ResponsiveGrid>
 * </ResponsiveLayout>
 * ```
 */

'use client';

import React, { ReactNode } from 'react';

interface ResponsiveGridProps {
  children: ReactNode;
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * ResponsiveGrid - Auto-responsive grid layout
 */
export const ResponsiveGrid = ({
  children,
  columns = { default: 1, md: 2, lg: 3 },
  gap = 'md',
  className = '',
}: ResponsiveGridProps) => {
  const gapClass = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const gridColsClass = `
    ${columns.default ? 'grid-cols-1' : 'grid-cols-1'}
    ${columns.sm ? 'sm:grid-cols-' + columns.sm : ''}
    ${columns.md ? 'md:grid-cols-' + columns.md : 'md:grid-cols-2'}
    ${columns.lg ? 'lg:grid-cols-' + columns.lg : 'lg:grid-cols-3'}
    ${columns.xl ? 'xl:grid-cols-' + columns.xl : ''}
  `;

  return (
    <div
      className={`
        grid
        ${gapClass[gap]}
        ${className}
      `}
      role="region"
      aria-label="Content grid"
    >
      {React.Children.map(children, (child, index) => (
        <div key={index} className="w-full">
          {child}
        </div>
      ))}
    </div>
  );
};

/**
 * HideOn - Hide element on specific breakpoints
 */
interface HideOnProps {
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  children: ReactNode;
  className?: string;
}

export const HideOn = ({
  breakpoint,
  children,
  className = '',
}: HideOnProps) => {
  const hideClass = {
    mobile: 'hidden md:block',
    tablet: 'hidden lg:block md:hidden',
    desktop: 'hidden lg:hidden',
  };

  return <div className={`${hideClass[breakpoint]} ${className}`}>{children}</div>;
};

/**
 * ShowOn - Show element only on specific breakpoints
 */
interface ShowOnProps {
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  children: ReactNode;
  className?: string;
}

export const ShowOn = ({
  breakpoint,
  children,
  className = '',
}: ShowOnProps) => {
  const showClass = {
    mobile: 'block md:hidden',
    tablet: 'hidden md:block lg:hidden',
    desktop: 'hidden lg:block',
  };

  return <div className={`${showClass[breakpoint]} ${className}`}>{children}</div>;
};

/**
 * ResponsiveContainer - Container with responsive padding
 */
interface ResponsiveContainerProps {
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export const ResponsiveContainer = ({
  children,
  padding = 'md',
  maxWidth = 'lg',
  className = '',
}: ResponsiveContainerProps) => {
  const paddingClass = {
    sm: 'px-4 py-4 md:px-6',
    md: 'px-4 py-6 md:px-8 lg:px-12',
    lg: 'px-6 py-8 md:px-12 lg:px-16',
  };

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full',
  };

  return (
    <div
      className={`
        w-full mx-auto
        ${paddingClass[padding]}
        ${maxWidthClass[maxWidth]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/**
 * ResponsiveStack - Vertical stack that becomes horizontal on larger screens
 */
interface ResponsiveStackProps {
  children: ReactNode;
  direction?: 'vertical' | 'horizontal';
  gap?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end';
  breakpoint?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ResponsiveStack = ({
  children,
  direction = 'vertical',
  gap = 'md',
  align = 'start',
  breakpoint = 'md',
  className = '',
}: ResponsiveStackProps) => {
  const gapClass = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const alignClass = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
  };

  const breakpointResponsive = {
    sm: `flex-col sm:flex-row`,
    md: `flex-col md:flex-row`,
    lg: `flex-col lg:flex-row`,
  };

  const directionClass = direction === 'horizontal' 
    ? breakpointResponsive[breakpoint]
    : 'flex-col';

  return (
    <div
      className={`
        flex
        ${directionClass}
        ${gapClass[gap]}
        ${alignClass[align]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/**
 * AspectRatioBox - Maintains aspect ratio responsive box
 */
interface AspectRatioBoxProps {
  ratio: '16/9' | '4/3' | '1/1' | '9/16';
  children: ReactNode;
  className?: string;
}

export const AspectRatioBox = ({
  ratio,
  children,
  className = '',
}: AspectRatioBoxProps) => {
  const ratioClass = {
    '16/9': 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '1/1': 'aspect-square',
    '9/16': 'aspect-[9/16]',
  };

  return (
    <div
      className={`
        w-full
        ${ratioClass[ratio]}
        overflow-hidden rounded-lg
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default ResponsiveGrid;
