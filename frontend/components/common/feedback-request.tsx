/**
 * File Purpose: In-app feedback request component
 * Last Updated: July 30, 2026
 * Dependencies: lucide-react
 * Related Files: Used after major actions or operations
 */

'use client';

import { ThumbsUp, ThumbsDown, X, MessageSquare } from 'lucide-react';
import { useState } from 'react';

export type FeedbackType = 'positive' | 'negative' | null;

interface FeedbackRequestProps {
  message?: string;
  question?: string;
  onPositive?: () => void;
  onNegative?: () => void;
  onFeedbackSubmit?: (feedback: FeedbackType, comment?: string) => void;
  onClose?: () => void;
  showCommentField?: boolean;
  autoCloseAfter?: number;
}

export function FeedbackRequest({
  message = 'How was your experience?',
  question = 'Tell us what we could improve',
  onPositive,
  onNegative,
  onFeedbackSubmit,
  onClose,
  showCommentField = false,
  autoCloseAfter,
}: FeedbackRequestProps) {
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (type: FeedbackType) => {
    setFeedback(type);
    if (type === 'positive') {
      onPositive?.();
    } else if (type === 'negative') {
      onNegative?.();
    }

    if (!showCommentField || type === 'positive') {
      // Auto-submit positive feedback or close if no comment field
      setIsSubmitting(true);
      onFeedbackSubmit?.(type, comment);
      setTimeout(() => {
        onClose?.();
      }, 1500);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    onFeedbackSubmit?.(feedback, comment);
    setTimeout(() => {
      onClose?.();
    }, 1500);
  };

  return (
    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-lg animate-slide-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{message}</h3>
          {feedback && <p className="text-sm text-slate-600 mt-1">{question}</p>}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Feedback Buttons */}
      {!feedback ? (
        <div className="flex gap-3">
          <button
            onClick={() => handleFeedback('positive')}
            className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 font-medium rounded-lg transition-colors flex-1 justify-center"
          >
            <ThumbsUp className="h-5 w-5" />
            Yes, great!
          </button>
          <button
            onClick={() => handleFeedback('negative')}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 font-medium rounded-lg transition-colors flex-1 justify-center"
          >
            <ThumbsDown className="h-5 w-5" />
            Not really
          </button>
        </div>
      ) : feedback === 'negative' && showCommentField ? (
        /* Comment Section for Negative Feedback */
        <div className="space-y-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Help us improve. What could we do better?"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-400 font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium rounded-lg transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      ) : (
        /* Positive Feedback / Submitted State */
        <div className="text-center py-4">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-green-100 rounded-full">
              <ThumbsUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-slate-600">
            {isSubmitting ? 'Thank you for your feedback!' : 'Thank you!'}
          </p>
        </div>
      )}
    </div>
  );
}

export default FeedbackRequest;
