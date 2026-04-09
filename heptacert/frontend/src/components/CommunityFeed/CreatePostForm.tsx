import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface CreatePostFormProps {
  onSubmit: (body: string) => Promise<void>;
  placeholder?: string;
  userAvatar?: string;
  isSubmitting?: boolean;
  maxLength?: number;
}

export default function CreatePostForm({
  onSubmit,
  placeholder = 'Topluluğa bir şey yaz...',
  userAvatar,
  isSubmitting = false,
  maxLength = 500,
}: CreatePostFormProps) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const charCount = body.length;
  const isOverLimit = charCount > maxLength;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setError('Lütfen bir gönderi yazın');
      return;
    }
    if (isOverLimit) {
      setError(`Gönderi ${maxLength} karakteri aşamaz`);
      return;
    }

    try {
      setError(null);
      await onSubmit(body.trim());
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gönderi gönderilemedi');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        {userAvatar && (
          <img
            src={userAvatar}
            alt="Profil"
            className="h-10 w-10 rounded-full object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.currentTarget.value.slice(0, maxLength))}
            placeholder={placeholder}
            disabled={isSubmitting}
            rows={3}
            className="w-full rounded border border-slate-200 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
          />

          {/* Character counter */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
            <p
              className={`text-xs ${
                isOverLimit ? 'text-red-600 font-semibold' : 'text-slate-500'
              }`}
            >
              {charCount} / {maxLength}
            </p>
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setBody('')}
              disabled={isSubmitting || !body.trim()}
              className="rounded px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Temizle
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !body.trim() || isOverLimit}
              className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-slate-300"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
