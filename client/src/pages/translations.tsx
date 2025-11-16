import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useNamespaceSelector } from "@/hooks/use-namespace-selector";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, CheckCircle2, Circle, Languages } from "lucide-react";
import type { Translation, Language, TranslationFilters } from "@shared/schema";

interface TranslationsByKey {
  [key: string]: {
    key: string;
    namespace: string;
    english: string;
    translations: Translation[];
  };
}

export default function TranslationsPage() {
  const [filters, setFilters] = useState<TranslationFilters>({});
  const [editingValues, setEditingValues] = useState<{
    [id: string]: { text: string; reviewed: boolean };
  }>({});
  const { toast } = useToast();

  // Use shared namespace selector hook (without auto-selection for "All Namespaces" support)
  const { namespaces, namespacesLoading } = useNamespaceSelector({ autoSelect: false });

  const { data: languages, isLoading: languagesLoading } = useQuery<Language[]>({
    queryKey: ["/api/admin/languages"],
  });

  const { data: translations, isLoading: translationsLoading } = useQuery<Translation[]>({
    queryKey: ["/api/admin/translations", filters],
  });

  // Group translations by namespace + key (include ALL languages including English)
  const translationsByKey: TranslationsByKey = {};
  if (translations) {
    translations.forEach((t) => {
      const compositeKey = `${t.namespace}::${t.key}`;
      if (!translationsByKey[compositeKey]) {
        translationsByKey[compositeKey] = {
          key: t.key,
          namespace: t.namespace,
          english: "",
          translations: [],
        };
      }
      // Include ALL translations (including English)
      translationsByKey[compositeKey].translations.push(t);
    });
  }

  const groupedKeys = Object.values(translationsByKey);

  // Track pending saves for debouncing
  const [pendingSaves, setPendingSaves] = useState<{
    [id: string]: { translation: Translation; newText: string };
  }>({});

  // Initialize editing values when translations load (include ALL languages)
  useEffect(() => {
    if (translations) {
      const initialValues: typeof editingValues = {};
      translations.forEach((t) => {
        const id = `${t.key}-${t.locale}-${t.namespace}`;
        initialValues[id] = { text: t.text, reviewed: t.reviewed };
      });
      setEditingValues(initialValues);
    }
  }, [translations]);

  // Debounced autosave effect - saves 1 second after user stops typing
  useEffect(() => {
    if (Object.keys(pendingSaves).length === 0) return;

    const timeoutId = setTimeout(() => {
      // Save all pending changes
      Object.entries(pendingSaves).forEach(([id, { translation, newText }]) => {
        updateMutation.mutate({
          key: translation.key,
          locale: translation.locale,
          namespace: translation.namespace,
          updates: {
            text: newText,
          },
        });
      });
      setPendingSaves({});
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [pendingSaves]);

  const updateMutation = useMutation({
    mutationFn: async ({
      key,
      locale,
      namespace,
      updates,
    }: {
      key: string;
      locale: string;
      namespace: string;
      updates: Partial<Translation>;
    }) => {
      return await apiRequest(
        "PATCH",
        `/api/admin/translations/${encodeURIComponent(key)}/${locale}/${namespace}`,
        updates
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/translations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/languages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({
        title: "Success",
        description: "Translation updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update translation",
        variant: "destructive",
      });
    },
  });

  const handleTextChange = (id: string, text: string, translation: Translation) => {
    // Update local editing state immediately
    setEditingValues((prev) => ({
      ...prev,
      [id]: { ...prev[id], text },
    }));

    // Schedule debounced save if text actually changed from original
    if (text !== translation.text) {
      setPendingSaves((prev) => ({
        ...prev,
        [id]: { translation, newText: text },
      }));
    } else {
      // Remove from pending saves if text reverted to original
      setPendingSaves((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleReviewedToggle = (translation: Translation) => {
    const id = `${translation.key}-${translation.locale}-${translation.namespace}`;
    const currentValue = editingValues[id];
    if (!currentValue) return;

    const newReviewed = !currentValue.reviewed;
    setEditingValues((prev) => ({
      ...prev,
      [id]: { ...prev[id], reviewed: newReviewed },
    }));

    // Immediately save the reviewed status
    updateMutation.mutate({
      key: translation.key,
      locale: translation.locale,
      namespace: translation.namespace,
      updates: {
        reviewed: newReviewed,
      },
    });
  };

  const handleBlur = (translation: Translation) => {
    const id = `${translation.key}-${translation.locale}-${translation.namespace}`;
    
    // If there's a pending save for this field, save it immediately on blur
    if (pendingSaves[id]) {
      updateMutation.mutate({
        key: translation.key,
        locale: translation.locale,
        namespace: translation.namespace,
        updates: {
          text: pendingSaves[id].newText,
        },
      });
      
      // Remove from pending saves
      setPendingSaves((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Translations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage translations across all namespaces and languages
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search keys or text..."
                value={filters.search || ""}
                onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
                className="pl-9"
                data-testid="input-search"
              />
            </div>

            <Select
              value={filters.namespace || "all"}
              onValueChange={(value) =>
                setFilters({ ...filters, namespace: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger data-testid="select-namespace">
                <SelectValue placeholder="All Namespaces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Namespaces</SelectItem>
                {namespacesLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading...
                  </SelectItem>
                ) : (
                  namespaces.map((ns) => (
                    <SelectItem key={ns} value={ns}>
                      {ns}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select
              value={filters.locale || "all"}
              onValueChange={(value) =>
                setFilters({ ...filters, locale: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger data-testid="select-locale">
                <SelectValue placeholder="All Languages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {languagesLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading...
                  </SelectItem>
                ) : (
                  languages?.map((lang) => (
                    <SelectItem key={lang.locale} value={lang.locale}>
                      {lang.nativeName} ({lang.locale})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select
              value={
                filters.reviewed === undefined
                  ? "all"
                  : filters.reviewed
                  ? "reviewed"
                  : "unreviewed"
              }
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  reviewed: value === "all" ? undefined : value === "reviewed",
                })
              }
            >
              <SelectTrigger data-testid="select-review-status">
                <SelectValue placeholder="Review Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="unreviewed">Unreviewed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(filters.namespace || filters.locale || filters.reviewed !== undefined || filters.search) && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {Object.values(filters).filter(Boolean).length} active filter(s)
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({})}
                data-testid="button-clear-filters"
                className="h-7 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        {translationsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-24 w-full" />
            </Card>
          ))
        ) : !groupedKeys || groupedKeys.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center gap-2">
              <Search className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No translations found</p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your filters or add new translations
              </p>
            </div>
          </Card>
        ) : (
          groupedKeys.map((group) => (
            <Card key={`${group.key}-${group.namespace}`} className="p-6" data-testid={`card-translation-${group.key}`}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Key + Namespace */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Translation Key</Label>
                    <code className="block text-sm font-mono text-foreground mt-1">
                      {group.key}
                    </code>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Namespace</Label>
                    <p className="text-sm text-foreground mt-1">{group.namespace}</p>
                  </div>
                </div>

                {/* Column 2: ALL Languages (including English) */}
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">Translations</Label>
                  {group.translations.length === 0 ? (
                    <div className="p-6 bg-muted/30 rounded-md flex items-center justify-center">
                      <p className="text-xs text-muted-foreground italic">No translations yet</p>
                    </div>
                  ) : (
                    // Sort: English first, then alphabetically by locale
                    group.translations
                      .sort((a, b) => {
                        if (a.locale === "en") return -1;
                        if (b.locale === "en") return 1;
                        return a.locale.localeCompare(b.locale);
                      })
                      .map((t) => {
                        const id = `${t.key}-${t.locale}-${t.namespace}`;
                        const currentValue = editingValues[id];
                        const language = languages?.find((l) => l.locale === t.locale);

                        return (
                          <div key={id} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs font-mono">
                                {t.locale}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {language?.nativeName || t.locale}
                              </span>
                            </div>
                            <Textarea
                              value={currentValue?.text || ""}
                              onChange={(e) => handleTextChange(id, e.target.value, t)}
                              onBlur={() => handleBlur(t)}
                              className="text-sm min-h-[60px] resize-none"
                              data-testid={`input-translation-${t.key}-${t.locale}`}
                              placeholder="Enter translation..."
                            />
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Column 3: Review Status for ALL Languages */}
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">Review Status</Label>
                  {group.translations.length === 0 ? (
                    <div className="p-6 bg-muted/30 rounded-md flex items-center justify-center">
                      <Languages className="w-6 h-6 text-muted-foreground" />
                    </div>
                  ) : (
                    // Sort: English first, then alphabetically by locale (matching column 2)
                    group.translations
                      .sort((a, b) => {
                        if (a.locale === "en") return -1;
                        if (b.locale === "en") return 1;
                        return a.locale.localeCompare(b.locale);
                      })
                      .map((t) => {
                        const id = `${t.key}-${t.locale}-${t.namespace}`;
                        const currentValue = editingValues[id];
                        const isReviewed = currentValue?.reviewed || false;

                        return (
                          <div key={id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                            <span className="text-xs font-mono text-muted-foreground">{t.locale}</span>
                            <Badge
                              className={
                                isReviewed
                                  ? "gap-1 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 cursor-pointer hover-elevate"
                                  : "gap-1 cursor-pointer hover-elevate"
                              }
                              variant={isReviewed ? "default" : "secondary"}
                              onClick={() => handleReviewedToggle(t)}
                              data-testid={`badge-reviewed-${t.key}-${t.locale}`}
                            >
                              {isReviewed ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  Reviewed
                                </>
                              ) : (
                                <>
                                  <Circle className="w-3 h-3" />
                                  Draft
                                </>
                              )}
                            </Badge>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
