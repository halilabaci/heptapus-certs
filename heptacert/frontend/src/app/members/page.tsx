"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Users, Search, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface DirectoryMember {
  public_id: string;
  display_name: string;
  headline?: string;
  location?: string;
  avatar_url?: string;
  bio?: string;
  event_count: number;
  is_connected: boolean;
}

export default function MembersDirectoryPage() {
  const { lang } = useI18n();
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLocation, setFilterLocation] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "active" | "events">("active");

  const copy = useMemo(() => lang === "tr" ? {
    title: "Üyeler",
    subtitle: "Topluluktaki profesyonellerle bağlantı kurun",
    loading: "Üyeler yükleniyor...",
    error: "Üyeler yüklenemedi",
    searchPlaceholder: "Ad veya başlık ara...",
    empty: "Üye bulunamadı",
    connect: "Bağlantı Kuruldu",
    connectRequest: "Bağlantı Iste",
    events: "Etkinlik",
    viewProfile: "Profili Gör",
    allLocations: "Tüm Konumlar",
    sortByName: "Ada Göre",
    sortByActive: "Aktif",
    sortByEvents: "Etkinliklere Göre",
  } : {
    title: "Members",
    subtitle: "Connect with professionals in the community",
    loading: "Loading members...",
    error: "Failed to load members",
    searchPlaceholder: "Search by name or title...",
    empty: "No members found",
    connect: "Connected",
    connectRequest: "Send Request",
    events: "Events",
    viewProfile: "View Profile",
    allLocations: "All Locations",
    sortByName: "By Name",
    sortByActive: "Active",
    sortByEvents: "By Events",
  }, [lang]);

  const sortLabelMap = {
    name: copy.sortByName,
    active: copy.sortByActive,
    events: copy.sortByEvents,
  };

  useEffect(() => {
    const loadMembers = async () => {
      try {
        // Mock data - replace with actual API call
        const mockMembers: DirectoryMember[] = [
          {
            public_id: "member-1",
            display_name: "Ayşe Kurtaran",
            headline: "Veri Bilimci @ DeepMind",
            location: "İstanbul, Türkiye",
            avatar_url: "https://i.pravatar.cc/400?img=5",
            bio: "Machine learning ve veri analizi uzmanı",
            event_count: 8,
            is_connected: true,
          },
          {
            public_id: "member-2",
            display_name: "Mehmet Özdemir",
            headline: "Yazılım Mimarı @ Microsoft",
            location: "Ankara, Türkiye",
            avatar_url: "https://i.pravatar.cc/400?img=2",
            bio: "Cloud ve infrastructure üzerine çalışıyor",
            event_count: 12,
            is_connected: false,
          },
          {
            public_id: "member-3",
            display_name: "Zeynep Aydın",
            headline: "Ürün Müdürü @ Airbnb",
            location: "Berlin, Almanya",
            avatar_url: "https://i.pravatar.cc/400?img=7",
            bio: "UX/UI ve product strategy",
            event_count: 6,
            is_connected: false,
          },
          {
            public_id: "member-4",
            display_name: "İbrahim Şahin",
            headline: "CEO @ StartupXYZ",
            location: "İstanbul, Türkiye",
            avatar_url: "https://i.pravatar.cc/400?img=3",
            bio: "Girişimcilik ve teknoloji meraklısı",
            event_count: 15,
            is_connected: true,
          },
        ];

        setMembers(mockMembers);
      } catch (err) {
        setError(err instanceof Error ? err.message : copy.error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [copy.error]);

  const locations = useMemo(
    () => [...new Set(members.map((m) => m.location).filter(Boolean))],
    [members]
  );

  const filteredAndSortedMembers = useMemo(() => {
    let filtered = members;

    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = members.filter(
        (m) =>
          m.display_name.toLowerCase().includes(term) ||
          m.headline?.toLowerCase().includes(term)
      );
    }

    // Filter by location
    if (filterLocation) {
      filtered = filtered.filter((m) => m.location === filterLocation);
    }

    // Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.display_name.localeCompare(b.display_name);
        case "active":
          return b.event_count - a.event_count; // Active = more events
        case "events":
          return b.event_count - a.event_count;
        default:
          return 0;
      }
    });
  }, [members, searchTerm, filterLocation, sortBy]);

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-12 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-500 inline-flex items-center gap-2">
          <Users className="h-3.5 w-3.5" />
          {copy.title}
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">{copy.title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{copy.subtitle}</p>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 space-y-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
          placeholder={copy.searchPlaceholder}
          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <div className="flex flex-wrap gap-2">
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.currentTarget.value)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="">{copy.allLocations}</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <div className="flex gap-1 ml-auto">
            {(["name", "active", "events"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  sortBy === option
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                {sortLabelMap[option]}
              </button>
            ))}
          </div>
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

      {/* Empty */}
      {!loading && filteredAndSortedMembers.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-sm text-slate-500">
          {copy.empty}
        </div>
      )}

      {/* Members Grid */}
      {!loading && filteredAndSortedMembers.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedMembers.map((member) => (
            <div
              key={member.public_id}
              className="group rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-slate-300"
            >
              {/* Avatar */}
              <div className="mb-4 flex justify-center">
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.display_name}
                    className="h-16 w-16 rounded-full object-cover border-2 border-slate-200"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-slate-200" />
                )}
              </div>

              {/* Name & Headline */}
              <h3 className="text-center text-lg font-bold text-slate-900">
                {member.display_name}
              </h3>
              {member.headline && (
                <p className="mt-1 text-center text-sm text-slate-600">
                  {member.headline}
                </p>
              )}

              {/* Location */}
              {member.location && (
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {member.location}
                </div>
              )}

              {/* Bio */}
              {member.bio && (
                <p className="mt-3 text-center text-sm text-slate-600 line-clamp-2">
                  {member.bio}
                </p>
              )}

              {/* Events */}
              <div className="mt-4 text-center text-sm font-semibold text-slate-700">
                {member.event_count} {copy.events}
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/members/${member.public_id}`}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-center text-xs font-semibold text-slate-700 hover:border-slate-300 transition"
                >
                  {copy.viewProfile}
                </Link>
                <button
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                    member.is_connected
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {member.is_connected ? copy.connect : copy.connectRequest}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
