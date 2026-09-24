import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, CheckCircle2, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';

const RATING_LABELS = {
  1: 'Very Poor',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Excellent'
};

const RESOLUTION_OPTIONS = [
  { value: 'Yes', label: 'Yes, fully resolved', shortLabel: 'Yes' },
  { value: 'Partially', label: 'Partially resolved', shortLabel: 'Partially' },
  { value: 'No', label: 'No, not resolved', shortLabel: 'No' }
];

export default function ComplaintFeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  complaintTitle = '',
  initialFeedback = null,
  loading = false,
  error = ''
}) {
  const [rating, setRating] = useState(initialFeedback?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [resolutionStatus, setResolutionStatus] = useState(initialFeedback?.resolutionStatus || 'Yes');
  const [comment, setComment] = useState(initialFeedback?.comment || '');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (initialFeedback) {
      setRating(initialFeedback.rating || 0);
      setResolutionStatus(initialFeedback.resolutionStatus || 'Yes');
      setComment(initialFeedback.comment || '');
    } else {
      setRating(0);
      setResolutionStatus('Yes');
      setComment('');
    }
    setValidationError('');
  }, [initialFeedback, isOpen]);

  if (!isOpen) return null;

  const currentRatingDisplay = hoverRating || rating;
  const isEditing = Boolean(initialFeedback);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setValidationError('Please select a star rating between 1 and 5.');
      return;
    }
    if (!resolutionStatus) {
      setValidationError('Please answer whether your issue was resolved.');
      return;
    }

    setValidationError('');
    onSubmit({
      rating,
      resolutionStatus,
      comment: comment.trim()
    });
  };

  return (
    <AnimatePresence>
      <div className="track-modal-backdrop" style={{ zIndex: 1100 }}>
        <motion.div
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="track-modal-card feedback-modal-card"
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{ maxWidth: '540px' }}
        >
          {/* Header */}
          <div className="track-modal-heading">
            <div>
              <p className="dashboard-kicker">Resolution Feedback</p>
              <h2>{isEditing ? 'Edit Feedback' : 'Rate Resolution Experience'}</h2>
            </div>
            <button
              className="track-close-button"
              disabled={loading}
              onClick={onClose}
              type="button"
              aria-label="Close feedback modal"
            >
              <X size={19} />
            </button>
          </div>

          {complaintTitle && (
            <div className="feedback-complaint-ref">
              <span className="feedback-ref-label">Complaint:</span>
              <strong className="feedback-ref-title">"{complaintTitle}"</strong>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="feedback-modal-form">
            {/* 1. Star Rating Control */}
            <div className="feedback-form-group">
              <label className="feedback-label">
                How was your resolution experience? <span className="feedback-required">*</span>
              </label>

              <div
                className="feedback-stars-row"
                onMouseLeave={() => setHoverRating(0)}
                role="radiogroup"
                aria-label="Star rating from 1 to 5"
              >
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const isFilled = starVal <= (hoverRating || rating);
                  return (
                    <button
                      key={starVal}
                      type="button"
                      role="radio"
                      aria-checked={rating === starVal}
                      aria-label={`${starVal} star${starVal > 1 ? 's' : ''} - ${RATING_LABELS[starVal]}`}
                      className={`feedback-star-btn ${isFilled ? 'filled' : ''}`}
                      onMouseEnter={() => setHoverRating(starVal)}
                      onClick={() => setRating(starVal)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setRating(starVal);
                        }
                      }}
                    >
                      <Star size={32} />
                    </button>
                  );
                })}
              </div>

              <div className="feedback-rating-hint">
                {currentRatingDisplay ? (
                  <span className="feedback-rating-active-text">
                    <strong>{currentRatingDisplay} / 5</strong> — {RATING_LABELS[currentRatingDisplay]}
                  </span>
                ) : (
                  <span className="feedback-rating-placeholder">Click to select 1 (Very Poor) to 5 (Excellent)</span>
                )}
              </div>
            </div>

            {/* 2. Resolution Status Question */}
            <div className="feedback-form-group">
              <label className="feedback-label">
                Was your issue resolved? <span className="feedback-required">*</span>
              </label>

              <div className="feedback-resolution-pills" role="radiogroup">
                {RESOLUTION_OPTIONS.map((opt) => {
                  const isSelected = resolutionStatus === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`feedback-res-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => setResolutionStatus(opt.value)}
                    >
                      <span>{opt.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
              <p className="feedback-res-note">
                Your response is informational and records your satisfaction experience.
              </p>
            </div>

            {/* 3. Additional Comments */}
            <div className="feedback-form-group">
              <label className="feedback-label" htmlFor="feedback-comment">
                Additional Comments <span className="feedback-optional">(Optional)</span>
              </label>
              <textarea
                id="feedback-comment"
                className="feedback-textarea"
                rows={4}
                maxLength={1000}
                placeholder="Share any thoughts on the resolution speed, quality, or department communication..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="feedback-char-count">
                {comment.length} / 1000 characters
              </div>
            </div>

            {/* Error alerts */}
            {(validationError || error) && (
              <div className="feedback-error-banner">
                <AlertCircle size={17} />
                <span>{validationError || error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="feedback-modal-actions">
              <button
                type="button"
                className="feedback-cancel-btn"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="feedback-submit-btn"
                disabled={loading || rating === 0}
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{isEditing ? 'Update Feedback' : 'Submit Feedback'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
