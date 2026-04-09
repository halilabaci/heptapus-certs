import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ReplyFormProps {
  parentAuthor?: string;
  onSubmit: (body: string) => Promise<void>;
  onCancel: () => void;
  placeholder?: string;
  isSubmitting?: boolean;
}

export default function ReplyForm({
  parentAuthor,
  onSubmit,
  onCancel,
  placeholder = 'Bir yanıt gir...',
  isSubmitting = false,
}: ReplyFormProps) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setError('Lütfen bir yanıt yazın');
      return;
    }

    try {
      setError(null);
      await onSubmit(body.trim());
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yanıt gönderilemedi');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-slate-200 bg-white p-3">
      {/* Reply to indicator */}
      {parentAuthor && (
        <p className="mb-2 text-xs text-slate-600">
          <span className="font-semibold">{parentAuthor}</span> adlı kullanıcıya yanıt
        </p>
      )}

      {/* Textarea */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        disabled={isSubmitting}
        rows={3}
        className="w-full rounded border border-slate-200 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
      />

      {/* Error */}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {/* Actions */}
      <div className="mt-3 flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          İptal
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !body.trim()}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:bg-slate-300"
        >
          {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
        </button>
      </div>
    </form>
  );
}
