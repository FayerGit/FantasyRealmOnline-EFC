import React, { useState, useEffect } from 'react';
import { characterAPI } from '../services/characterAPI';

interface Character {
  id: number;
  name: string;
  status: string;
  is_published?: boolean;
}

interface PublishButtonProps {
  character: Character;
  onPublishChange?: (isPublished: boolean) => void;
}

export const PublishButton: React.FC<PublishButtonProps> = ({ character, onPublishChange }) => {
  const [isPublished, setIsPublished] = useState(character.is_published || false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Afficher seulement si le personnage est approuvé
  if (character.status !== 'approved') {
    return null;
  }

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handleTogglePublish = async () => {
    setIsLoading(true);
    setError('');

    try {
      let result;
      if (isPublished) {
        result = await characterAPI.unpublishCharacter(character.id);
      } else {
        result = await characterAPI.publishCharacter(character.id);
      }

      if (result.error) {
        setError(result.error);
      } else {
        const newPublishedState = !isPublished;
        setIsPublished(newPublishedState);
        setShowSuccess(true);
        onPublishChange?.(newPublishedState);
      }
    } catch (err) {
      setError('Failed to update publication status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleTogglePublish}
        disabled={isLoading}
        className="w-full border border-white/20 hover:border-white/40 bg-[#0a0a0a] hover:bg-white/5 text-white/80 hover:text-white py-2 px-4 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium"
      >
        {isLoading
          ? 'Loading...'
          : isPublished
          ? 'Remove from Gallery'
          : 'Publish to Gallery'}
      </button>
      
      {error && (
        <p className="text-sm text-red-400 bg-red-950/30 p-2 rounded border border-red-900/30">
          {error}
        </p>
      )}
      
      {showSuccess && (
        <p className="text-sm text-green-400 bg-green-950/30 p-2 rounded border border-green-900/30 animate-in fade-in">
          {isPublished ? 'Your character is now visible in the public gallery' : 'Character removed from gallery'}
        </p>
      )}
    </div>
  );
};

export default PublishButton;
