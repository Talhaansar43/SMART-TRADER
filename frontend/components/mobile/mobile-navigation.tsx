/**
 * MobileNavigation Component
 * Touch-friendly navigation for mobile devices
 * Includes hamburger menu with proper accessibility
 *
 * @example
 * ```tsx
 * <MobileNavigation>
 *   <Link href="/dashboard">Dashboard</Link>
 *   <Link href="/market">Market</Link>
 * </MobileNavigation>
 * ```
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

interface MobileNavigationProps {
  children: React.ReactNode;
  branding?: React.ReactNode;
  className?: string;
}

export const MobileNavigation = ({
  children,
  branding,
  className = '',
}: MobileNavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav
      className={`lg:hidden sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 ${className}`}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-between h-16 px-4">
        {/* Branding */}
        {branding && <div className="flex-1">{branding}</div>}

        {/* Hamburger Menu Button */}
        <button
          ref={buttonRef}
          onClick={toggleMenu}
          className={`
            ml-auto p-2 rounded-lg
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            transition-colors duration-200
            hover:bg-gray-100 dark:hover:bg-gray-800
          `}
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? (
            <X size={24} className="text-gray-700 dark:text-gray-300" />
          ) : (
            <Menu size={24} className="text-gray-700 dark:text-gray-300" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          id="mobile-menu"
          className="
            border-t border-gray-200 dark:border-gray-800
            bg-gray-50 dark:bg-gray-800
            overflow-hidden animate-in slide-in-from-top-2 duration-200
          "
          role="region"
          aria-label="Mobile menu"
        >
          <div className="px-4 py-2 space-y-1">
            {React.Children.map(children, (child, index) => (
              <div
                key={index}
                onClick={() => setIsOpen(false)}
                className="py-2"
              >
                {child}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

/**
 * MobileMenuLink - Touch-friendly menu item
 */
interface MobileMenuLinkProps {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

export const MobileMenuLink = ({
  href,
  icon,
  children,
  active = false,
  className = '',
}: MobileMenuLinkProps) => {
  return (
    <a
      href={href}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg
        font-medium text-base
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        transition-colors duration-200
        ${
          active
            ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }
        ${className}
      `}
      role="menuitem"
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </a>
  );
};

export default MobileNavigation;
