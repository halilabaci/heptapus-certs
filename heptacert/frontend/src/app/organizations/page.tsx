"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Globe, Search, Users, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { listPublicOrganizations, type PublicOrganizationListItem } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function PublicOrganizationsPage() {
  const { lang } = useI18n();
  const [items, setItems] = useState<PublicOrganizationListItem[]>([]);
  const [filtered, setFiltered] = useState<PublicOrganizationListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(() => lang === "tr" ? {
    eyebrow: "Topluluk Dizini",
    title: "Toplulukları Keşfet",
    subtitle: "Üniversite kulüplerini, bağımsız toplulukları ve kurumları inceleyin. Etkinliklerini kaçırmamak için takip edin.",
    searchPlaceholder: "Topluluk adı veya websitesi ile ara...",
    empty: "Aramanızla eşleşen bir topluluk bulunamadı.",
    error: "Topluluklar yüklenirken bir hata oluştu.",
    followers: "Takipçi",
    events: "Etkinlik",
    details: "İncele",
  } : {
    eyebrow: "Community Directory",
    title: "Discover Communities",
    subtitle: "Explore university clubs, independent communities, and institutions. Follow them to stay updated on their events.",
    searchPlaceholder: "Search by community name or website...",
    empty: "No communities found matching your search.",
    error: "Failed to load communities.",
    followers: "Followers",
    events: "Events",
    details: "View",
  }, [lang]);

  useEffect(() => {
    setLoading(true);
    listPublicOrganizations()
      .then((data) => {
        setItems(data);
        setFiltered(data);
      })
      .catch((err: any) => setError(err?.message || copy.error))
      .finally(() => setLoading(false));
  }, [copy.error]);

  useEffect(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      setFiltered(items);
      return;
    }
    setFiltered(
      items.filter((item) =>
        [item.org_name, item.bio, item.website_url].some((value) =>
          String(value || "").toLowerCase().includes(term)
        )
      )
    );
  }, [items, search]);

  // Framer Motion list animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-gray-950 px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero Section */}
      <section className="mx-auto max-w-3xl text-center mb-12">
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider shadow-sm mb-6"
        >
          <Building2 className="h-3.5 w-3.5" />
          {copy.eyebrow}
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-4"
        >
          {copy.title}
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
        >
          {copy.subtitle}
        </motion.p>
      </section>

      {/* Search Bar */}
      <section className="mx-auto max-w-2xl mb-16">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
          className="relative group"
        >
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={copy.searchPlaceholder}
            className="block w-full pl-11 pr-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm sm:text-base outline-none"
          />
        </motion.div>
      </section>

      {/* Content Grid */}
      <section className="mx-auto max-w-6xl">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[280px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30 p-6 text-center text-sm font-medium text-red-700 dark:text-red-400">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 bg-transparent py-20 text-center">
            <Building2 className="h-10 w-10 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{copy.empty}</p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((item) => (
              <motion.div key={item.public_id} variants={itemVariants}>
                <Link 
                  href={`/organizations/${item.public_id}`}
                  className="group flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all overflow-hidden relative"
                >
                  {/* Subtle Brand Color Accent Top Border */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-1 opacity-80" 
                    style={{ backgroundColor: item.brand_color || '#3b82f6' }}
                  />

                  <div className="p-6 flex flex-col flex-grow">
                    {/* Header: Logo & Name */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="h-14 w-14 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                        {item.brand_logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={item.brand_logo} 
                            alt={item.org_name} 
                            className="h-full w-full object-cover" 
                          />
                        ) : (
                          <span className="text-xl font-bold text-gray-400">
                            {item.org_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-1 pt-1">
                        <h2 className="text-base font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {item.org_name}
                        </h2>
                        {item.website_url && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <Globe className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{item.website_url.replace(/^https?:\/\//, '')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed flex-grow">
                      {item.bio || "Bu topluluğun henüz bir açıklaması bulunmuyor."}
                    </p>

                    {/* Footer Stats & CTA */}
                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                          <Users className="h-3.5 w-3.5 text-gray-400" />
                          <span>{item.follower_count} <span className="hidden sm:inline">{copy.followers}</span></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          <span>{item.event_count} <span className="hidden sm:inline">{copy.events}</span></span>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1 text-xs font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {copy.details}
                        <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}