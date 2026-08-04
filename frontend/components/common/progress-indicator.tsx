/**
 * File Purpose: Progress indicator for multi-step processes
 * Last Updated: July 30, 2026
 * Dependencies: lucide-react
 * Related Files: components/trades/place-order-form.tsx
 */

'use client';

import { Check, Circle, AlertCircle } from 'lucide-react';

export type StepStatus = 'completed' | 'active' | 'pending' | 'error';

export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  status: StepStatus;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep?: number;
  variant?: 'linear' | 'circular';
  showDescriptions?: boolean;
  className?: string;
}

export function ProgressIndicator({
  steps,
  currentStep = 0,
  variant = 'linear',
  showDescriptions = false,
  className = '',
}: ProgressIndicatorProps) {
  if (variant === 'circular') {
    return (
      <div className={`flex items-center justify-center gap-8 ${className}`}>
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isActive = index === currentStep;
          const isError = step.status === 'error';

          return (
            <div key={step.id} className="flex flex-col items-center">
              <div
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  border-2 transition-all duration-300
                  ${
                    isCompleted
                      ? 'bg-green-100 border-green-500'
                      : isActive
                        ? 'bg-blue-100 border-blue-500 ring-4 ring-blue-200'
                        : isError
                          ? 'bg-red-100 border-red-500'
                          : 'bg-slate-100 border-slate-300'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="h-6 w-6 text-green-600" />
                ) : isError ? (
                  <AlertCircle className="h-6 w-6 text-red-600" />
                ) : (
                  <span
                    className={`text-sm font-semibold ${
                      isActive ? 'text-blue-600' : 'text-slate-600'
                    }`}
                  >
                    {index + 1}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm font-medium text-slate-900">{step.label}</p>
              {showDescriptions && step.description && (
                <p className="text-xs text-slate-500 mt-1 text-center max-w-[100px]">
                  {step.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Linear variant (default)
  return (
    <div className={className}>
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isActive = index === currentStep;
          const isError = step.status === 'error';
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="relative flex-shrink-0">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    border-2 transition-all duration-300
                    ${
                      isCompleted
                        ? 'bg-green-100 border-green-500'
                        : isActive
                          ? 'bg-blue-100 border-blue-500 ring-4 ring-blue-200'
                          : isError
                            ? 'bg-red-100 border-red-500'
                            : 'bg-slate-100 border-slate-300'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : isError ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <span
                      className={`text-xs font-bold ${
                        isActive ? 'text-blue-600' : 'text-slate-600'
                      }`}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Step Label */}
                <div className="absolute -bottom-8 left-0 right-0 text-center">
                  <p className="text-xs font-medium text-slate-900">{step.label}</p>
                  {showDescriptions && step.description && (
                    <p className="text-xs text-slate-500">{step.description}</p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={`
                    h-1 flex-1 mx-2 rounded transition-colors duration-300
                    ${isCompleted ? 'bg-green-400' : 'bg-slate-300'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Spacing for labels */}
      {steps.length > 0 && <div className="h-12" />}
    </div>
  );
}

export default ProgressIndicator;
