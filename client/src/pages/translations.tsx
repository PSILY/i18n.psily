import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, CheckCircle2, Circle, Edit2, Save, X } from "lucide-react";
import type { Translation, Language, TranslationFilters } from "@shared/schema";

export default function TranslationsPage() {
  const [filters, setFilters] = useState<TranslationFilters>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editReviewed, setEditReviewed] = useState(false);
  const { toast } = useToast();

  const { data: languages, isLoading: languagesLoading } = useQuery<Language[]>({
    queryKey: ["/api/admin/languages"],
  });

  const { data: namespaces, isLoading: namespacesLoading } = useQuery<string[]>({
    queryKey: ["/api/admin/namespaces"],
  });

  const { data: translations, isLoading: translationsLoading } = useQuery<Translation[]>({
    queryKey: ["/api/admin/translations", filters],
  });

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

  const handleEdit = (translation: Translation) => {
    setEditingKey(`${translation.key}-${translation.locale}-${translation.namespace}`);
    setEditText(translation.text);
    setEditReviewed(translation.reviewed);
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditText("");
    setEditReviewed(false);
  };

  const handleSave = (translation: Translation) => {
    updateMutation.mutate({
      key: translation.key,
      locale: translation.locale,
      namespace: translation.namespace,
      updates: {
        text: editText,
        reviewed: editReviewed,
      },
    });
    handleCancel();
  };

  const handleToggleReviewed = (translation: Translation) => {
    updateMutation.mutate({
      key: translation.key,
      locale: translation.locale,
      namespace: translation.namespace,
      updates: {
        reviewed: !translation.reviewed,
      },
    });
  };

  const isEditing = (translation: Translation) =>
    editingKey === `${translation.key}-${translation.locale}-${translation.namespace}`;

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
                  namespaces?.map((ns) => (
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

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-card-border bg-muted/30">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Key
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Locale
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Namespace
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Text
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Status
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {translationsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3" colSpan={6}>
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ))
              ) : !translations || translations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No translations found</p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your filters or add new translations
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                translations.map((translation) => (
                  <tr
                    key={`${translation.key}-${translation.locale}-${translation.namespace}`}
                    className="hover-elevate"
                    data-testid={`row-translation-${translation.key}`}
                  >
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-foreground">
                        {translation.key}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs font-mono">
                        {translation.locale}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {translation.namespace}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      {isEditing(translation) ? (
                        <div className="space-y-2">
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="text-sm"
                            data-testid={`input-edit-${translation.key}`}
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`reviewed-${translation.key}`}
                              checked={editReviewed}
                              onCheckedChange={(checked) => setEditReviewed(checked as boolean)}
                              data-testid={`checkbox-reviewed-${translation.key}`}
                            />
                            <label
                              htmlFor={`reviewed-${translation.key}`}
                              className="text-xs text-muted-foreground cursor-pointer"
                            >
                              Mark as reviewed
                            </label>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground truncate">
                          {translation.text}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing(translation) ? null : translation.reviewed ? (
                        <Badge
                          className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 cursor-pointer hover-elevate"
                          onClick={() => handleToggleReviewed(translation)}
                          data-testid={`badge-reviewed-${translation.key}`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Reviewed
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="gap-1 cursor-pointer hover-elevate"
                          onClick={() => handleToggleReviewed(translation)}
                          data-testid={`badge-draft-${translation.key}`}
                        >
                          <Circle className="w-3 h-3" />
                          Draft
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing(translation) ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSave(translation)}
                              data-testid={`button-save-${translation.key}`}
                              className="h-7 px-2"
                              disabled={updateMutation.isPending}
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancel}
                              data-testid={`button-cancel-${translation.key}`}
                              className="h-7 px-2"
                              disabled={updateMutation.isPending}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(translation)}
                            data-testid={`button-edit-${translation.key}`}
                            className="h-7 px-2"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
