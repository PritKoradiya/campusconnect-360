import { Star, Edit3, MessageSquarePlus, CheckCircle2, Clock } from 'lucide-react';

const RATING_LABELS = {
  1: 'Very Poor',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Excellent'
};

const formatFeedbackDate = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '';
  }
};

export default function ComplaintFeedbackDisplay({
  complaint,
  feedback,
  loading = false,
  isStudent = false,
  onOpenFeedbackModal
}) {
  if (!complaint) return null;

  const isResolved = complaint.status === 'Resolved';
  if (!isResolved) return null;

  // Case 1: Feedback has already been submitted
  if (feedback) {
    const rating = feedback.rating || 0;
    const resStatus = feedback.resolutionStatus || 'Yes';
    const comment = feedback.comment;
    const dateFormatted = formatFeedbackDate(feedback.createdAt || feedback.updatedAt);

    return (
      <div className="feedback-display-card submitted">
        <div className="feedback-display-header">
          <div className="feedback-display-title-group">
            <span className="feedback-icon-bubble success">
              <CheckCircle2 size={16} />
            </span>
            <div>
              <h3 className="feedback-display-title">Student Satisfaction Feedback</h3>
              {dateFormatted && (
                <span className="feedback-display-sub">
                  <Clock size={11} />
                  <span>{dateFormatted}</span>
                </span>
              )}
            </div>
          </div>

          {isStudent && onOpenFeedbackModal && (
            <button
              type="button"
              className="feedback-edit-btn"
              onClick={onOpenFeedbackModal}
              title="Edit your submitted feedback"
            >
              <Edit3 size={13} />
              <span>Edit Feedback</span>
            </button>
          )}
        </div>

        {/* Rating and Resolution Status Row */}
        <div className="feedback-metrics-row">
          <div className="feedback-star-display">
            <div className="feedback-stars-static" aria-label={`Rating: ${rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={18}
                  className={`feedback-star-static ${s <= rating ? 'filled' : 'empty'}`}
                />
              ))}
            </div>
            <span className="feedback-rating-score">
              <strong>{rating} / 5</strong>
              <span className="feedback-rating-word">({RATING_LABELS[rating] || 'Rated'})</span>
            </span>
          </div>

          <div className="feedback-res-tag-wrapper">
            <span className="feedback-res-tag-label">Issue Resolved:</span>
            <span
              className={`feedback-res-badge ${
                resStatus === 'Yes'
                  ? 'status-yes'
                  : resStatus === 'Partially'
                  ? 'status-partial'
                  : 'status-no'
              }`}
            >
              {resStatus === 'Yes' ? 'Yes, Resolved' : resStatus === 'Partially' ? 'Partially Resolved' : 'Not Resolved'}
            </span>
          </div>
        </div>

        {/* Comment block */}
        {comment ? (
          <div className="feedback-comment-box">
            <p className="feedback-comment-text">"{comment}"</p>
          </div>
        ) : (
          <p className="feedback-no-comment">No additional comment provided.</p>
        )}
      </div>
    );
  }

  // Case 2: No feedback yet, complaint is resolved
  if (isStudent) {
    return (
      <div className="feedback-display-card pending-action">
        <div className="feedback-callout-content">
          <span className="feedback-callout-icon">
            <MessageSquarePlus size={22} />
          </span>
          <div>
            <h4 className="feedback-callout-title">Rate Resolution Experience</h4>
            <p className="feedback-callout-desc">
              This complaint has been marked as Resolved. Let the campus department know how satisfied you were with the resolution.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="feedback-give-btn"
          onClick={onOpenFeedbackModal}
          disabled={loading}
        >
          <Star size={15} />
          <span>Give Feedback</span>
        </button>
      </div>
    );
  }

  // Case 3: Admin or Department viewing resolved complaint without feedback
  return (
    <div className="feedback-display-card admin-empty">
      <div className="feedback-empty-note">
        <Star size={16} />
        <span>No student feedback submitted for this resolved complaint yet.</span>
      </div>
    </div>
  );
}
