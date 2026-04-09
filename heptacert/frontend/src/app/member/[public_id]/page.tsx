"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Globe,
  Briefcase,
  Users,
  Loader2,
} from "lucide-react";
import {
  getPublicMemberProfile,
  listPublicFeed,
  getPublicMemberMe,
  getPublicMemberToken,
  type PublicMemberProfile,
  type CommunityPost,
  type PublicMemberMe,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

interface RecommendedMember {
  public_id: string;
  display_name: string;
  headline?: string;
  location?: string;
  avatar_url?: string;
  event_count: number;
}

function getRecommendedMembers(
  allPosts: CommunityPost[],
  currentMemberId: string,
  viewerId: string | undefined
): RecommendedMember[] {
  // Extract unique members from posts (excluding current member and viewer)
  const memberMap = new Map<string, RecommendedMember>();

  allPosts.forEach((post) => {
    if (
      post.author_type === "member" &&
      post.author_public_id &&
      post.author_public_id !== currentMemberId &&
      post.author_public_id !== viewerId
    ) {
      if (!memberMap.has(post.author_public_id)) {
        memberMap.set(post.author_public_id, {
          public_id: post.author_public_id,
          display_name: post.author_name,
          avatar_url: post.author_avatar_url || undefined,
          headline: "Active Member",
          event_count: 0,
        });
      }
    }
  });

  return Array.from(memberMap.values()).slice(0, 6);
}

export default function PublicMemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = Array.isArray(params?.public_id)
    ? params.public_id[0]
    : params?.public_id;
  const { lang } = useI18n();

  const [member, setMember] = useState<PublicMemberProfile | null>(null);
  const [recommended, setRecommended] = useState<RecommendedMember[]>([]);
  const [viewer, setViewer] = useState<PublicMemberMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            back: "Geri Dön",
            loading: "Profil yükleniyor...",
            error: "Profil yüklenemedi",
            recommended: "Önerilen Kişiler",
            noRecommendations: "Henüz kimse önerilmiyor",
            events: "Etkinlik",
            joined: "Katılması",
            location: "Konum",
            visitWebsite: "Web Sitesini Ziyaret Et",
            viewProfile: "Profili Gör",
          }
        : {
            back: "Back",
            loading: "Loading profile...",
            error: "Failed to load profile",
            recommended: "Recommended People",
            noRecommendations: "No recommendations yet",
            events: "Events",
            joined: "Joined",
            location: "Location",
            visitWebsite: "Visit Website",
            viewProfile: "View Profile",
          },
    [lang]
  );

  useEffect(() => {
    if (!memberId) {
      setLoading(false);
      setError(copy.error);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      getPublicMemberProfile(memberId),
      listPublicFeed({ limit: 50 }),
      getPublicMemberToken() ? getPublicMemberMe().catch(() => null) : Promise.resolve(null),
    ])
      .then(([memberData, postsData, viewerData]) => {
        setMember(memberData);
        setViewer(viewerData);
        const recommended = getRecommendedMembers(
          postsData,
          memberId,
          viewerData?.public_id
        );
        setRecommended(recommended);
      })
      .catch((err: any) => setError(err?.message || copy.error))
      .finally(() => setLoading(false));
  }, [memberId, copy.error, lang]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">{copy.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{copy.error}</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200 px-6 py-4">
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold transition"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Profile Section */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden mb-12">
          {/* Cover */}
          <div className="h-40 bg-gradient-to-r from-purple-500 to-blue-500" />

          {/* Profile Info */}
          <div className="px-8 pb-8">
            <div className="flex flex-col sm:flex-row gap-6 -mt-20 mb-6">
              {/* Avatar */}
              {member.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.avatar_url}
                  alt={member.display_name}
                  className="h-40 w-40 rounded-2xl object-cover shadow-xl ring-4 ring-white"
                />
              ) : (
                <div className="h-40 w-40 rounded-2xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center shadow-xl ring-4 ring-white">
                  <span className="text-5xl font-bold text-white">
                    {member.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 pt-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {member.display_name}
                </h1>

                {member.headline && (
                  <p className="text-lg text-gray-600 mb-4 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-purple-600" />
                    {member.headline}
                  </p>
                )}

                {member.location && (
                  <p className="text-gray-600 mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {member.location}
                  </p>
                )}

                {member.bio && (
                  <p className="text-gray-700 mb-4">{member.bio}</p>
                )}

                {/* Stats */}
                <div className="flex gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {member.event_count}
                    </div>
                    <div className="text-sm text-gray-600">{copy.events}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {member.comment_count}
                    </div>
                    <div className="text-sm text-gray-600">Yorum</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  {member.website_url && (
                    <a
                      href={member.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                    >
                      <Globe className="h-4 w-4" />
                      {copy.visitWebsite}
                    </a>
                  )}
                  <a
                    href={`mailto:${member.display_name}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                  >
                    <Mail className="h-4 w-4" />
                    İletişim
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Members */}
        {recommended.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {copy.recommended}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommended.map((rec) => (
                <div
                  key={rec.public_id}
                  className="bg-white rounded-2xl shadow-md hover:shadow-lg transition overflow-hidden group"
                >
                  {/* Avatar */}
                  <div className="relative h-40 bg-gradient-to-br from-purple-400 to-blue-400 overflow-hidden">
                    {rec.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rec.avatar_url}
                        alt={rec.display_name}
                        className="h-full w-full object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="text-5xl font-bold text-white opacity-30">
                          {rec.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-1">
                      {rec.display_name}
                    </h3>

                    {rec.headline && (
                      <p className="text-xs text-gray-600 mb-2">{rec.headline}</p>
                    )}

                    {rec.location && (
                      <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {rec.location}
                      </p>
                    )}

                    {/* Events */}
                    <div className="flex items-center gap-1 text-xs text-gray-600 mb-4">
                      <Users className="h-3 w-3" /> {rec.event_count}{" "}
                      {copy.events}
                    </div>

                    {/* CTA */}
                    <Link
                      href={`/member/${rec.public_id}`}
                      className="block w-full text-center px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition font-semibold text-sm"
                    >
                      {copy.viewProfile}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
