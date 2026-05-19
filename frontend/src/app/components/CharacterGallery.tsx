import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { characterAPI } from '../services/characterAPI';
import { StarRating } from './StarRating';
import { commentsAPI } from '../services/commentsAPI';
import { authAPI } from '../services/authAPI';
import { ConfirmModal } from './ConfirmModal';
import { CharacterPreview } from './CharacterPreview';

interface PublishedCharacter {
  id: number;
  name: string;
  gender: string;
  body_type: string;
  body_color: string;
  hair_style: string;
  hair_color: string;
  eye_type: string;
  eye_color: string;
  mouth_type: string;
  head_clothing: string;
  top_clothing: string;
  legs_clothing: string;
  shoes_clothing: string;
  helmet: string;
  chestplate: string;
  leggings: string;
  boots: string;
  left_glove: string;
  right_glove: string;
  left_hand: string;
  right_hand: string;
  accessory_neck: string;
  accessory_finger: string;
  accessory_wrist: string;
  accessory_waist: string;
  published_at: string;
  created_at: string;
  creator: string;
  average_rating: string | number;
  comment_count: number;
}

interface Comment {
  id: number;
  username: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface CharacterDetailProps {
  character: PublishedCharacter;
  onClose: () => void;
  canDelete: boolean;
  onDeleteCharacter: (character: PublishedCharacter) => Promise<void>;
}

const CharacterDetail: React.FC<CharacterDetailProps> = ({ character, onClose, canDelete, onDeleteCharacter }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [character.id]);

  const fetchComments = async () => {
    setLoading(true);
    const result = await commentsAPI.getCharacterComments(character.id);
    
    if (result.error) {
      setError(result.error);
    } else {
      setComments(result.comments || []);
      const rating = result.average_rating ? parseFloat(result.average_rating) : 0;
      setAverageRating(rating);
    }
    setLoading(false);
  };

  const handleSubmitComment = async () => {
    if (userRating === 0 || !commentText.trim()) {
      setError('Please select a rating and write a comment');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    const result = await commentsAPI.submitComment({
      characterId: character.id,
      rating: userRating,
      comment: commentText
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccessMessage('Comment submitted and is pending moderation');
      setUserRating(0);
      setCommentText('');
      
      await fetchComments();
    }

    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    await onDeleteCharacter(character);
    setShowDeleteConfirm(false);
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-[10000]">
      <div className="bg-[#0a0a0a] border border-white/20 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0a0a0a] border-b border-white/20 p-6 flex justify-between items-center">
          <h2 className="text-3xl font-['Cinzel'] font-bold text-white tracking-wider">{character.name}</h2>
          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="border border-red-500/40 px-3 py-1.5 text-xs text-red-400/90 hover:bg-red-500/10 hover:border-red-500/60 transition-all"
              >
                Delete Character
              </button>
            )}
            <button
              onClick={onClose}
              className="text-2xl text-white/60 hover:text-white/100 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Character Info */}
          <div className="border border-white/20 p-4 space-y-4 bg-[#121212]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <p className="text-white/80 text-sm">By <span className="font-semibold text-white/100">{character.creator}</span></p>
                <p className="text-white/60 text-sm">Published: {new Date(character.published_at).toLocaleDateString()}</p>

                <div className="pt-4 border-t border-white/20">
                  <p className="text-white/80 text-sm mb-2">Character Rating</p>
                  <div className="flex items-center gap-3">
                    <StarRating rating={Math.round(averageRating)} readOnly size="medium" />
                    <span className="text-white/60 text-sm">{averageRating.toFixed(1)} • {character.comment_count} reviews</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPreviewExpanded(true)}
                className="w-48 shrink-0 border border-white/20 bg-[#0a0a0a] p-2 text-left hover:border-white/40 transition-colors"
              >
                <div className="aspect-square border border-white/20 bg-[#0a0a0a] overflow-hidden">
                  <CharacterPreview character={character} recolorScale={0.25} className="w-full h-full" />
                </div>
                <p className="text-[10px] text-white/50 text-center mt-2 uppercase tracking-wider">Preview (Click to enlarge)</p>
              </button>
            </div>

            <div className="pt-4 border-t border-white/20 grid grid-cols-2 gap-6 text-xs text-white/80">
              <div className="space-y-2">
                <p className="font-semibold text-white/100 font-['Cinzel'] tracking-wider uppercase">Appearance</p>
                <p>Gender: {character.gender}</p>
                <p>Body: {character.body_type} ({character.body_color})</p>
                <p>Hair: {character.hair_style} ({character.hair_color})</p>
                <p>Eyes: {character.eye_type} ({character.eye_color})</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-white/100 font-['Cinzel'] tracking-wider uppercase">Clothing</p>
                <p>Head: {character.head_clothing || 'None'}</p>
                <p>Top: {character.top_clothing || 'None'}</p>
                <p>Legs: {character.legs_clothing || 'None'}</p>
                <p>Shoes: {character.shoes_clothing || 'None'}</p>
              </div>
            </div>
          </div>

          {/* Comment Form */}
          <div className="border border-white/20 p-4 bg-[#121212] space-y-3">
            <p className="font-semibold text-white/100 font-['Cinzel'] tracking-wider uppercase text-sm">Leave a Review</p>
            
            {error && (
              <div className="border border-red-500/50 bg-red-500/10 p-3 text-red-400 text-xs rounded">
                {error}
              </div>
            )}
            
            {successMessage && (
              <div className="border border-green-500/50 bg-green-500/10 p-3 text-green-400 text-xs rounded">
                {successMessage}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-white/80 text-xs block">Your Rating</label>
              <div className="flex gap-2">
                <StarRating rating={userRating} onRate={setUserRating} size="large" />
                <span className="text-white/60 text-xs ml-2">{userRating > 0 ? `${userRating}/5` : 'Select rating'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-white/80 text-xs block">Comment (1-1000 characters)</label>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={1000}
                placeholder="Write your review..."
                className="w-full bg-[#0a0a0a] border border-white/20 text-white/80 p-3 text-xs rounded focus:border-white/40 focus:outline-none transition-colors placeholder-white/40"
                rows={3}
              />
              <p className="text-white/40 text-xs text-right">{commentText.length}/1000</p>
            </div>

            <button
              onClick={handleSubmitComment}
              disabled={isSubmitting}
              className="w-full border border-white/20 hover:border-white/40 bg-[#0a0a0a] hover:bg-white/5 text-white/80 hover:text-white py-2 px-4 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>

          {/* Comments List */}
          <div className="border border-white/20 p-4 bg-[#121212] space-y-3">
            <p className="font-semibold text-white/100 font-['Cinzel'] tracking-wider uppercase text-sm">Reviews ({comments.length})</p>
            
            {loading ? (
              <p className="text-white/40 text-xs">Loading reviews...</p>
            ) : comments.length === 0 ? (
              <p className="text-white/40 text-xs">No approved reviews yet. Be the first!</p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="border border-white/10 p-3 bg-[#0a0a0a] rounded text-xs">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-white/100">{comment.username}</p>
                      <div className="flex items-center gap-1">
                        <StarRating rating={comment.rating} readOnly size="small" />
                      </div>
                    </div>
                    <p className="text-white/80 text-xs">{comment.comment}</p>
                    <p className="text-white/40 text-xs mt-2">{new Date(comment.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isPreviewExpanded && (
        <div className="fixed inset-0 z-[10001] bg-black/50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl border border-white/20 bg-[#0a0a0a] p-4">
            <button
              type="button"
              onClick={() => setIsPreviewExpanded(false)}
              className="absolute top-2 right-3 text-2xl text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
            <div className="aspect-square border border-white/20 bg-[#0a0a0a] overflow-hidden">
              <CharacterPreview character={character} recolorScale={0.5} className="w-full h-full" />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Supprimer le personnage"
        message={`Es-tu sûr de vouloir supprimer "${character.name}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
};

export const CharacterGallery: React.FC = () => {
  const [characters, setCharacters] = useState<PublishedCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<PublishedCharacter | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedRating, setSelectedRating] = useState('');
  const [actionError, setActionError] = useState('');

  const user = authAPI.getUser();
  const canDeleteFromGallery = user?.role === 'admin' || user?.role === 'employee';

  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    setLoading(true);
    setActionError('');
    console.log('Fetching published characters...');
    const result = await characterAPI.getPublishedCharacters();
    
    console.log('API Result:', result);
    
    if (result.error) {
      console.error('Error fetching characters:', result.error);
      setError(result.error);
    } else {
      console.log('Characters loaded:', result.characters);
      setCharacters(result.characters || []);
    }
    setLoading(false);
  };

  const handleDeleteCharacterFromGallery = async (character: PublishedCharacter) => {
    const result = await characterAPI.deleteCharacter(character.id);
    if (result.error) {
      setActionError(result.error);
      return;
    }

    setSelectedCharacter(null);
    await fetchCharacters();
  };

  const filteredCharacters = characters.filter(char => {
    if (searchTerm && !char.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedGender && char.gender !== selectedGender) return false;
    if (selectedRating) {
      const rating = typeof char.average_rating === 'string' 
        ? parseFloat(char.average_rating) 
        : char.average_rating;
      const minRating = parseInt(selectedRating);
      if (Math.floor(rating) !== minRating) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0a0a0a]">
        <p className="text-white/60 text-sm">Loading gallery...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0a0a0a]">
        <p className="text-red-400 text-sm">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-6 px-4 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {actionError && (
          <div className="border border-red-500/30 p-3 text-sm text-red-400/90 bg-red-500/5">
            {actionError}
          </div>
        )}

        {/* Search Bar */}
        <div className="border border-white/20 p-3 bg-[#121212]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search characters..."
            className="w-full bg-[#1a1a1a] border border-white/20 p-2 text-white/80 text-sm focus:border-white/40 focus:outline-none transition-colors placeholder-white/40 rounded"
          />
        </div>

        {/* Filters */}
        <div className="border border-white/20 p-4 space-y-2 bg-[#121212]">
          <div className="border-b border-white/20 pb-2 text-xs text-white/90 font-['Cinzel'] tracking-wider uppercase">Filters</div>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => setSelectedGender('')}
              className={`border px-3 py-1 text-xs transition-all cursor-pointer ${
                selectedGender === ''
                  ? 'border-white/40 bg-white/5 text-white'
                  : 'border-white/20 text-white/80 hover:bg-white/5 hover:border-white/40'
              }`}
            >
              All Genders
            </button>
            {['male', 'female', 'other'].map(gender => (
              <button
                key={gender}
                onClick={() => setSelectedGender(selectedGender === gender ? '' : gender)}
                className={`border px-3 py-1 text-xs transition-all cursor-pointer capitalize ${
                  selectedGender === gender
                    ? 'border-white/40 bg-white/5 text-white'
                    : 'border-white/20 text-white/80 hover:bg-white/5 hover:border-white/40'
                }`}
              >
                {gender}
              </button>
            ))}
          </div>
        </div>

        {/* Character Grid */}
        {filteredCharacters.length === 0 ? (
          <div className="border border-white/20 p-12 text-center bg-[#121212] rounded">
            <p className="text-white/40 text-sm">No characters match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredCharacters.map((character) => {
              const rating = typeof character.average_rating === 'string' 
                ? parseFloat(character.average_rating) 
                : character.average_rating;
              
              return (
                <div
                  key={character.id}
                  onClick={() => setSelectedCharacter(character)}
                  className="border border-white/20 hover:border-white/40 hover:bg-[#181818] bg-[#121212] cursor-pointer transition-all duration-300 group"
                >
                  {/* Character Image Placeholder */}
                  <div className="border-b border-white/20 aspect-square bg-[#0a0a0a] overflow-hidden group-hover:border-white/40 transition-colors">
                    <CharacterPreview character={character} recolorScale={0.18} className="w-full h-full" />
                  </div>

                  {/* Character Info */}
                  <div className="p-3 text-center space-y-2">
                    <h3 className="text-sm font-['Cinzel'] font-bold text-white tracking-wide">{character.name}</h3>
                    <div className="flex justify-center">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-xs ${
                              star <= Math.round(rating)
                                ? 'text-yellow-400'
                                : 'text-white/20'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-white/60">Rating: {rating.toFixed(1)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Character Detail Modal */}
      {selectedCharacter && (
        <CharacterDetail
          character={selectedCharacter}
          onClose={() => setSelectedCharacter(null)}
          canDelete={canDeleteFromGallery}
          onDeleteCharacter={handleDeleteCharacterFromGallery}
        />
      )}
    </div>
  );
};

export default CharacterGallery;
