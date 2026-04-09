"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, TrendingUp, Users, Search } from "lucide-react";
import {
  listPublicFeed,
  getPublicMemberMe,
  getPublicMemberToken,
  likeCommunityPost,
  unlikeCommunityPost,
  type CommunityPost,
  type PublicMemberMe,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import PostCard from "@/components/CommunityFeed/PostCard";

interface ScoredPost extends CommunityPost {
  score: number;
  engagement: number;
}

function calculateEngagementScore(post: CommunityPost): number {
  // Algorithm: upvotes contribute positively, encourage interaction
  // Posts with high engagement bubble up to the top
  const likeWeight = post.like_count * 2; // Each like counts as 2 points
  const commentWeight = post.comment_count * 1.5; // Each comment counts as 1.5 points
  const recencyBonus = Math.max(0, 10 - daysSince(post.created_at)); // Newer posts get bonus
  
  return likeWeight + commentWeight + recencyBonus;
}

function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export default function DiscoveryPage() {
  const { lang } = useI18n();
  const [posts, setPosts] = useState<ScoredPost[]>([]);
  const [viewer, setViewer] = useState<PublicMemberMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"trending" | "recent" | "popular">("trending");

  const copy = useMemo(() => lang === "tr" ? {
    title: "Keşfet",
    subtitle: "Topluluktaki en ilginç gönderileri ve aktif üyeleri bulun",
    loading: "Gönderiler yükleniyor...",
    error: "Gönderiler yüklenemedi",
    empty: "Henüz gönderi yok",
    searchPlaceholder: "Gönderi veya üye ara...",
    trending: "Trend",
    recent: "Yeni",
    popular: "Popüler",
    engagement: "Etkileşim",
    views: "Görüntüleme",
    noResults: "Aramanızla eşleşen gönderi bulunamadı",
  } : {
    title: "Discover",
    subtitle: "Find the most interesting posts and active members in the community",
    loading: "Loading posts...",
    error: "Failed to load posts",
    empty: "No posts yet",
    searchPlaceholder: "Search posts or members...",
    trending: "Trending",
    recent: "Recent",
    popular: "Popular",
    engagement: "Engagement",
    views: "Views",
    noResults: "No posts found matching your search",
  }, [lang]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listPublicFeed({ limit: 100 }),
      getPublicMemberToken() ? getPublicMemberMe().catch(() => null) : Promise.resolve(null),
    ])
      .then(([items, viewerData]) => {
        // Score and sort posts
        const scored = items.map((post) => ({
          ...post,
          score: calculateEngagementScore(post),
          engagement: post.like_count + post.comment_count,
        }));

        setPosts(scored);
        setViewer(viewerData);
      })
      .catch((err: any) => setError(err?.message || copy.error))
      .finally(() => setLoading(false));
  }, [copy.error]);

  const filteredAndSortedPosts = useMemo(() => {
    let filtered = posts;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = posts.filter(
        (post) =>
          post.body.toLowerCase().includes(term) ||
          post.author_name.toLowerCase().includes(term) ||
          (post.organization_name?.toLowerCase().includes(term) ?? false)
      );
    }

    // Sort by selected criteria
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "trending":
          return b.score - a.score; // Highest engagement score first
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // Newest first
        case "popular":
          return b.like_count - a.like_count; // Most likes first
        default:
          return 0;
      }
    });
  }, [posts, searchTerm, sortBy]);

  async function handleToggleLike(post: ScoredPost) {
    if (!viewer) {
      window.location.href = "/login?mode=member";
      return;
    }
    setBusyPostId(post.public_id);
    try {
      if (post.liked_by_me) {
        await unlikeCommunityPost(post.public_id);
        setPosts((current) =>
          current.map((item) =>
            item.public_id === post.public_id
              ? {
                  ...item,
                  liked_by_me: false,
                  like_count: Math.max(0, item.like_count - 1),
                  score: calculateEngagementScore({
                    ...item,
                    like_count: Math.max(0, item.like_count - 1),
                  }),
                  engagement: item.like_count - 1 + item.comment_count,
                }
              : item
          )
        );
      } else {
        await likeCommunityPost(post.public_id);
        setPosts((current) =>
          current.map((item) =>
            item.public_id === post.public_id
              ? {
                  ...item,
                  liked_by_me: true,
                  like_count: item.like_count + 1,
                  score: calculateEngagementScore({
                    ...item,
                    like_count: item.like_count + 1,
                  }),
                  engagement: item.like_count + 1 + item.comment_count,
                }
              : item
          )
        );
      }
    } catch (err: any) {
      setError(err?.message || copy.error);
    } finally {
      setBusyPostId(null);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-12 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-500 inline-flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5" />
          {copy.title}
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">{copy.title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{copy.subtitle}</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            placeholder={copy.searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Sort Buttons */}
        <div className="flex flex-wrap gap-2">
          {(["trending", "recent", "popular"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                sortBy === option
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {copy[option]}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {copy.loading}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredAndSortedPosts.length === 0 && (
        <div className="mt-10 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-sm text-slate-500">
          {searchTerm ? copy.noResults : copy.empty}
        </div>
      )}

      {/* Posts Grid */}
      {!loading && filteredAndSortedPosts.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedPosts.map((post) => (
            <div
              key={post.public_id}
              className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-slate-300"
            >
              {/* Header */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                    {post.organization_name || "Üye"}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {post.author_name}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-black text-blue-600">
                    {formatNumber(post.score)}
                  </div>
                  <p className="text-xs text-slate-500">{copy.engagement}</p>
                </div>
              </div>

              {/* Content */}
              <p className="mb-4 line-clamp-3 text-sm leading-6 text-slate-700">
                {post.body}
              </p>

              {/* Engagement Stats */}
              <div className="mb-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-xs">
                <div className="flex items-center gap-1 text-slate-600">
                  <span className="font-semibold text-blue-600">👍 {formatNumber(post.like_count)}</span>
                  <span>beğeni</span>
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <span className="font-semibold text-emerald-600">💬 {formatNumber(post.comment_count)}</span>
                  <span>yorum</span>
                </div>
              </div>

              {/* CTA Button */}
              {viewer && (
                <button
                  onClick={() => void handleToggleLike(post)}
                  disabled={busyPostId === post.public_id}
                  className={`w-full rounded-lg py-2 text-sm font-semibold transition ${
                    post.liked_by_me
                      ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      : "border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                  } disabled:opacity-50`}
                >
                  {post.liked_by_me ? "👍 Beğeni Aldı" : "👍 Beğen"}
                </button>
              )}
              {!viewer && (
                <Link
                  href="/login?mode=member"
                  className="block rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  Giriş Yap
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
