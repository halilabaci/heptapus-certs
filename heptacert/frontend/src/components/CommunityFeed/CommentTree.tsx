import React from 'react';
import CommentCard from './CommentCard';

export interface CommentData {
  id: string;
  body: string;
  authorName: string;
  authorAvatar?: string;
  timestamp: string;
  upvoteCount: number;
  downvoteCount: number;
  userVote?: 'upvote' | 'downvote' | null;
  parentCommentId?: string | null;
  replies?: CommentData[];
  depth?: number;
}

interface CommentTreeProps {
  comments: CommentData[];
  maxDepth?: number;
  onUpvote: (commentId: string) => void;
  onDownvote: (commentId: string) => void;
  onReply: (commentId: string, parentCommentId?: string) => void;
  isLoading?: boolean;
}

export default function CommentTree({
  comments,
  maxDepth = 3,
  onUpvote,
  onDownvote,
  onReply,
  isLoading = false,
}: CommentTreeProps) {
  const renderComment = (comment: CommentData, depth: number = 0) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const canShowReplies = depth < maxDepth;

    return (
      <div
        key={comment.id}
        className={depth > 0 ? 'ml-8 mt-3 border-l-2 border-slate-200 pl-4' : ''}
      >
        <CommentCard
          commentId={comment.id}
          body={comment.body}
          authorName={comment.authorName}
          authorAvatar={comment.authorAvatar}
          timestamp={comment.timestamp}
          upvoteCount={comment.upvoteCount}
          downvoteCount={comment.downvoteCount}
          userVote={comment.userVote}
          depth={depth}
          onUpvote={() => onUpvote(comment.id)}
          onDownvote={() => onDownvote(comment.id)}
          onReply={() => onReply(comment.id, comment.id)}
          isLoading={isLoading}
        />

        {/* Nested Replies */}
        {hasReplies && canShowReplies && (
          <div className="mt-3">
            {comment.replies!.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}

        {/* Show "Load more replies" if depth limit reached */}
        {hasReplies && !canShowReplies && (
          <p className="mt-2 text-xs text-slate-500">
            ({comment.replies!.length} {comment.replies!.length === 1 ? 'yanıt' : 'yanıt'} gizlendi)
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <p className="text-sm text-slate-500">Henüz yorum yok</p>
      ) : (
        comments.map((comment) => renderComment(comment))
      )}
    </div>
  );
}
