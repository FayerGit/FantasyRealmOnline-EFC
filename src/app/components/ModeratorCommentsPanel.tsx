import React, { useState, useEffect } from 'react';
import { commentsAPI } from '../services/commentsAPI';
import { StarRating } from './StarRating';
import { ConfirmModal } from './ConfirmModal';

interface PendingComment {
  id: number;
  author: string;
  character_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export const ModeratorCommentsPanel: React.FC = () => {
  const [comments, setComments] = useState<PendingComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState<{ [key: number]: string }>({});
  const [showRejectForm, setShowRejectForm] = useState<number | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);

  useEffect(() => {
    fetchPendingComments();
  }, []);

  const fetchPendingComments = async () => {
    setLoading(true);
    const result = await commentsAPI.getPendingComments();
    
    if (result.error) {
      setError(result.error);
    } else {
      setComments(result.comments || []);
    }
    setLoading(false);
  };

  const handleApprove = async (commentId: number) => {
    setProcessingId(commentId);
    const result = await commentsAPI.approveComment(commentId);
    
    if (result.error) {
      setError(result.error);
    } else {
      setComments(comments.filter(c => c.id !== commentId));
    }
    setProcessingId(null);
  };

  const handleReject = async (commentId: number) => {
    const reason = rejectionReason[commentId];
    if (!reason || reason.trim().length === 0) {
      setError('Rejection reason is required');
      return;
    }

    setProcessingId(commentId);
    const result = await commentsAPI.rejectComment(commentId, reason);
    
    if (result.error) {
      setError(result.error);
    } else {
      setComments(comments.filter(c => c.id !== commentId));
      setShowRejectForm(null);
      setRejectionReason({});
    }
    setProcessingId(null);
  };

  const handleDelete = async (commentId: number) => {
    setCommentToDelete(commentId);
  };

  const confirmDelete = async () => {
    if (commentToDelete === null) return;

    setProcessingId(commentToDelete);
    const result = await commentsAPI.deleteComment(commentToDelete);
    
    if (result.error) {
      setError(result.error);
    } else {
      setComments(comments.filter(c => c.id !== commentToDelete));
    }
    setProcessingId(null);
    setCommentToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <p className="text-gray-500">Loading pending comments...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <ConfirmModal
        isOpen={commentToDelete !== null}
        title="Supprimer le commentaire"
        message="Es-tu sûr de vouloir supprimer ce commentaire ? Cette action est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={confirmDelete}
        onCancel={() => setCommentToDelete(null)}
      />

      <h2 className="text-2xl font-bold text-gray-800 mb-6">Pending Comments Review</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {comments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No pending comments to review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{comment.author}</p>
                  <p className="text-sm text-gray-600">
                    Commented on: <span className="font-medium">{comment.character_name}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(comment.created_at).toLocaleString()}
                  </p>
                </div>
                <StarRating rating={comment.rating} readOnly size="small" />
              </div>

              <div className="bg-white p-3 rounded mb-3 border border-gray-200">
                <p className="text-gray-700">{comment.comment}</p>
              </div>

              {showRejectForm === comment.id ? (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    value={rejectionReason[comment.id] || ''}
                    onChange={(e) =>
                      setRejectionReason({
                        ...rejectionReason,
                        [comment.id]: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    rows={3}
                    placeholder="Why is this comment inappropriate or off-topic?"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleReject(comment.id)}
                      disabled={processingId === comment.id}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm"
                    >
                      {processingId === comment.id ? 'Processing...' : 'Confirm Reject'}
                    </button>
                    <button
                      onClick={() => setShowRejectForm(null)}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(comment.id)}
                    disabled={processingId === comment.id}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium transition"
                  >
                    {processingId === comment.id ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => setShowRejectForm(comment.id)}
                    disabled={processingId === comment.id}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium transition"
                  >
                    {processingId === comment.id ? 'Rejecting...' : 'Reject'}
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={processingId === comment.id}
                    className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium transition"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700">
        <p className="font-semibold mb-2">Moderation Guidelines</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Approve comments that are relevant, respectful, and constructive</li>
          <li>Reject spam, inappropriate, or off-topic comments</li>
          <li>Provide clear reasons when rejecting comments</li>
          <li>Keep the community friendly and safe</li>
        </ul>
      </div>
    </div>
  );
};

export default ModeratorCommentsPanel;
