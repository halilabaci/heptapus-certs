import React from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';

interface PostCardProps {
  postId: string;
  authorName: string;
  authorAvatar?: string;
  timestamp: string;
  body: string;
  commentCount: number;
  upvoteCount: number;
  downvoteCount: number;
  userVote?: 'upvote' | 'downvote' | null;
  onUpvote: () => void;
  onDownvote: () => void;
  onReply: () => void;
  onCommentClick: () => void;
  isLoading?: boolean;
}

export default function PostCard({
  postId,
  authorName,
  authorAvatar,
  timestamp,
  body,
  commentCount,
  upvoteCount,
  downvoteCount,
  userVote,
  onUpvote,
  onDownvote,
  onReply,
  onCommentClick,
  isLoading = false,
}: PostCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {authorAvatar && (
          <img
            src={authorAvatar}
            alt={authorName}
            className="h-10 w-10 rounded-full object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{authorName}</p>
          <p className="text-xs text-slate-500">{timestamp}</p>
        </div>
      </div>

      {/* Body */}
      <div className="mb-4 text-sm text-slate-700 whitespace-pre-wrap break-words">
        {body}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
        {/* Voting */}
        <div className="flex items-center gap-2">
          <button
            onClick={onUpvote}
            disabled={isLoading}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
              userVote === 'upvote'
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ThumbsUp className="h-4 w-4" />
            <span>{upvoteCount}</span>
          </button>
          <button
            onClick={onDownvote}
            disabled={isLoading}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
              userVote === 'downvote'
                ? 'bg-red-100 text-red-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ThumbsDown className="h-4 w-4" />
            <span>{downvoteCount}</span>
          </button>
        </div>

        {/* Comments */}
        <button
          onClick={onCommentClick}
          className="ml-auto flex items-center gap-2 rounded px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-100"
        >
          <MessageSquare className="h-4 w-4" />
          <span>{commentCount}</span>
        </button>
      </div>
    </div>
  );
}
