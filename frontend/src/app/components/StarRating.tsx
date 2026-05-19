import React, { useState } from 'react';

interface StarRatingProps {
  rating: number; // Current rating (can be 0)
  onRate?: (rating: number) => void; // Callback quand l'utilisateur selectionne une note
  readOnly?: boolean; // Si vrai, affiche seulement la note
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRate,
  readOnly = false,
  size = 'medium',
  disabled = false,
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6',
  };

  const handleClick = (newRating: number) => {
    if (!readOnly && !disabled && onRate) {
      onRate(newRating);
    }
  };

  const handleMouseEnter = (starRating: number) => {
    if (!readOnly && !disabled) {
      setHoverRating(starRating);
    }
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          onMouseEnter={() => handleMouseEnter(star)}
          onMouseLeave={handleMouseLeave}
          disabled={disabled || readOnly}
          className={`${sizeClasses[size]} transition-colors cursor-pointer ${
            readOnly || disabled ? 'cursor-default' : 'hover:text-yellow-400'
          } ${
            star <= displayRating
              ? 'text-yellow-400'
              : 'text-gray-300'
          }`}
        >
          <svg
            className="w-full h-full fill-current"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        </button>
      ))}
    </div>
  );
};

interface RatingDisplayProps {
  averageRating: number;
  totalComments: number;
  size?: 'small' | 'medium' | 'large';
}

export const RatingDisplay: React.FC<RatingDisplayProps> = ({
  averageRating,
  totalComments,
  size = 'medium',
}) => {
  return (
    <div className="flex items-center gap-2">
      <StarRating rating={Math.round(averageRating)} readOnly size={size} />
      <div className="text-sm text-gray-500">
        <span className="font-semibold text-gray-700">{averageRating.toFixed(1)}</span>
        <span> ({totalComments} {totalComments === 1 ? 'review' : 'reviews'})</span>
      </div>
    </div>
  );
};
