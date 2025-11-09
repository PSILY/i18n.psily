import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Sparkles, ArrowUp, Archive, Globe, Loader2 } from "lucide-react";
import type { Language } from "@shared/schema";

export default function LanguagesPage() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState<string | null>(null);
  const [selectedNamespace, setSelectedNamespace] = useState<string>("");
  const [newLanguage, setNewLanguage] = useState({
    locale: "",
    name: "",
    nativeName: "",
  });
  const { toast } = useToast();

  const { data: languages, isLoading } = useQuery<Language[]>({
    queryKey: ["/api/admin/languages"],
  });

  const { data: namespaces } = useQuery<string[]>({
    queryKey: ["/api/admin/namespaces"],
  });

  const createMutation = useMutation({
    mutationFn: async (language: typeof newLanguage) => {
      return await apiRequest("POST", "/api/admin/languages", {
        ...language,
        status: "draft",
        completionPercent: 0,
        displayOrder: (languages?.length || 0) + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/languages"] });
      setAddDialogOpen(false);
      setNewLanguage({ locale: "", name: "", nativeName: "" });
      toast({
        title: "Success",
        description: "Language created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create language",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ locale, status }: { locale: string; status: string }) => {
      return await apiRequest("PATCH", `/api/admin/languages/${locale}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/languages"] });
      toast({
        title: "Success",
        description: "Language status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update language status",
        variant: "destructive",
      });
    },
  });

  const aiTranslateMutation = useMutation({
    mutationFn: async ({
      targetLocale,
      namespace,
    }: {
      targetLocale: string;
      namespace: string;
    }) => {
      return await apiRequest("POST", "/api/admin/translations/ai-translate", {
        targetLocale,
        namespace,
        contextSize: 3,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/translations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/languages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      setAiDialogOpen(null);
      setSelectedNamespace("");
      toast({
        title: "AI Translation Complete",
        description: `Created ${data.created} translations. ${data.failed} failed.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "AI translation failed",
        variant: "destructive",
      });
    },
  });

  const handleCreateLanguage = () => {
    if (!newLanguage.locale || !newLanguage.name || !newLanguage.nativeName) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newLanguage);
  };

  const handleAiTranslate = (locale: string) => {
    if (!selectedNamespace) {
      toast({
        title: "Validation Error",
        description: "Please select a namespace",
        variant: "destructive",
      });
      return;
    }
    aiTranslateMutation.mutate({
      targetLocale: locale,
      namespace: selectedNamespace,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "draft":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "archived":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
      default:
        return "bg-secondary";
    }
  };

  const getCompletionColor = (percent: number) => {
    if (percent >= 95) return "text-green-600 dark:text-green-400";
    if (percent >= 70) return "text-blue-600 dark:text-blue-400";
    if (percent >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Languages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage translation languages and their status
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-language">
              <Plus className="w-4 h-4 mr-2" />
              Add Language
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Language</DialogTitle>
              <DialogDescription>
                Create a new language for translation. It will start in draft mode.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="locale">Locale Code</Label>
                <Input
                  id="locale"
                  placeholder="e.g., fr, es, it"
                  value={newLanguage.locale}
                  onChange={(e) =>
                    setNewLanguage({ ...newLanguage, locale: e.target.value })
                  }
                  data-testid="input-locale"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">English Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., French"
                  value={newLanguage.name}
                  onChange={(e) => setNewLanguage({ ...newLanguage, name: e.target.value })}
                  data-testid="input-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nativeName">Native Name</Label>
                <Input
                  id="nativeName"
                  placeholder="e.g., Français"
                  value={newLanguage.nativeName}
                  onChange={(e) =>
                    setNewLanguage({ ...newLanguage, nativeName: e.target.value })
                  }
                  data-testid="input-native-name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                data-testid="button-cancel-add"
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateLanguage}
                data-testid="button-save-language"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Add Language
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-16 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !languages || languages.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-4">
            <Globe className="w-12 h-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">No languages yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add your first language to get started
              </p>
            </div>
            <Button
              onClick={() => setAddDialogOpen(true)}
              data-testid="button-add-first-language"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Language
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {languages
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((language) => (
              <Card
                key={language.locale}
                className="hover-elevate"
                data-testid={`card-language-${language.locale}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{language.nativeName}</h3>
                      <p className="text-sm text-muted-foreground">{language.name}</p>
                    </div>
                    <Badge className={getStatusColor(language.status)} variant="outline">
                      {language.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Completion</span>
                      <span
                        className={`font-semibold ${getCompletionColor(language.completionPercent)}`}
                      >
                        {language.completionPercent}%
                      </span>
                    </div>
                    <Progress value={language.completionPercent} className="h-2" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <code className="font-mono bg-muted px-2 py-0.5 rounded">
                      {language.locale}
                    </code>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 pt-3 border-t border-card-border">
                  {language.status === "draft" && (
                    <>
                      <Dialog
                        open={aiDialogOpen === language.locale}
                        onOpenChange={(open) =>
                          setAiDialogOpen(open ? language.locale : null)
                        }
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            data-testid={`button-ai-translate-${language.locale}`}
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Translate
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>AI Translate to {language.nativeName}</DialogTitle>
                            <DialogDescription>
                              Generate translations from English using AI. All translations will
                              be marked as unreviewed.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Namespace</Label>
                              <Select
                                value={selectedNamespace}
                                onValueChange={setSelectedNamespace}
                              >
                                <SelectTrigger data-testid="select-ai-namespace">
                                  <SelectValue placeholder="Select namespace" />
                                </SelectTrigger>
                                <SelectContent>
                                  {namespaces?.map((ns) => (
                                    <SelectItem key={ns} value={ns}>
                                      {ns}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
                              <p className="text-xs text-amber-700 dark:text-amber-400">
                                This will create AI-generated translations for all English keys in
                                the selected namespace. Review them carefully before promoting to
                                live.
                              </p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setAiDialogOpen(null);
                                setSelectedNamespace("");
                              }}
                              data-testid="button-cancel-ai"
                              disabled={aiTranslateMutation.isPending}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handleAiTranslate(language.locale)}
                              data-testid="button-start-ai-translate"
                              disabled={aiTranslateMutation.isPending}
                            >
                              {aiTranslateMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Translating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  Start Translation
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      {language.completionPercent >= 95 && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            updateStatusMutation.mutate({
                              locale: language.locale,
                              status: "live",
                            })
                          }
                          data-testid={`button-promote-${language.locale}`}
                          disabled={updateStatusMutation.isPending}
                        >
                          <ArrowUp className="w-3 h-3 mr-1" />
                          Promote to Live
                        </Button>
                      )}
                    </>
                  )}
                  {language.status === "live" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          locale: language.locale,
                          status: "archived",
                        })
                      }
                      data-testid={`button-archive-${language.locale}`}
                      disabled={updateStatusMutation.isPending}
                    >
                      <Archive className="w-3 h-3 mr-1" />
                      Archive
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
