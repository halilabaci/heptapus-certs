import React from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface CommentCardProps {
  commentId: string;
  body: string;
  authorName: string;
  authorAvatar?: string;
  timestamp: string;
  upvoteCount: number;
  downvoteCount: number;
  userVote?: 'upvote' | 'downvote' | null;
  depth?: number;
  onUpvote: () => void;
  onDownvote: () => void;
  onReply: () => void;
  isLoading?: boolean;
}

export default function CommentCard({
  commentId,
  body,
  authorName,
  authorAvatar,
  timestamp,
  upvoteCount,
  downvoteCount,
  userVote,
  depth = 0,
  onUpvote,
  onDownvote,
  onReply,
  isLoading = false,
}: CommentCardProps) {
  return (
    <div className="rounded-md border border-slate-150 bg-slate-50 p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {authorAvatar && (
          <img
            src={authorAvatar}
            alt={authorName}
            className="h-8 w-8 rounded-full object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-900">{authorName}</p>
          <p className="text-xs text-slate-500">{timestamp}</p>
        </div>
      </div>

      {/* Body */}
      <p className="mb-3 text-sm text-slate-700 whitespace-pre-wrap break-words">
        {body}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Voting */}
        <button
          onClick={onUpvote}
          disabled={isLoading}
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition ${
            userVote === 'upvote'
              ? 'bg-blue-100 text-blue-700'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
          title="Upvote"
        >
          <ThumbsUp className="h-3 w-3" />
          <span>{upvoteCount}</span>
        </button>

        <button
          onClick={onDownvote}
          disabled={isLoading}
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition ${
            userVote === 'downvote'
              ? 'bg-red-100 text-red-700'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
          title="Downvote"
        >
          <ThumbsDown className="h-3 w-3" />
          <span>{downvoteCount}</span>
        </button>

        {/* Reply - only allow up to 3 levels */}
        {depth < 2 && (
          <button
            onClick={onReply}
            disabled={isLoading}
            className="ml-auto text-xs text-slate-600 transition hover:text-slate-900 hover:font-semibold"
          >
            Yanıtla
          </button>
        )}
      </div>
    </div>
  );
}
