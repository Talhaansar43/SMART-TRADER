/**
 * Empty State Component - Shows when there's no data to display
 * Provides contextual message and action
 */

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: 'stocks' | 'portfolio' | 'trades' | 'search' | 'alert';
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const icons = {
  stocks: '📊',
  portfolio: '💼',
  trades: '🛒',
  search: '🔍',
  alert: '⚠️',
};

export function EmptyState({
  title,
  description,
  icon = 'alert',
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="text-6xl mb-4">{icons[icon]}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-center max-w-md mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
