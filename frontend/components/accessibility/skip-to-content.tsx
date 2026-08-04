/**
 * SkipToContent Component
 * Accessibility-first link for keyboard navigation
 * Allows users to skip repetitive navigation elements
 *
 * @example
 * ```tsx
 * <SkipToContent />
 * ```
 */

'use client';

interface SkipToContentProps {
  targetId?: string;
  label?: string;
  className?: string;
}

export const SkipToContent = ({
  targetId = 'main-content',
  label = 'Skip to main content',
  className = '',
}: SkipToContentProps) => {
  const handleClick = () => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={`
        absolute -top-12 left-4 z-50
        bg-blue-600 text-white
        px-4 py-2 rounded
        font-medium text-sm
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        hover:bg-blue-700
        focus-visible:top-0 transition-all duration-200
        ${className}
      `}
      aria-label={label}
    >
      {label}
    </a>
  );
};

export default SkipToContent;
