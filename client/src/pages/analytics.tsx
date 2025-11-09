import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Languages,
  FileText,
  CheckCircle2,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";
import type { AnalyticsData } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
  });

  const statCards = [
    {
      title: "Total Keys",
      value: analytics?.totalKeys || 0,
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Languages",
      value: analytics?.totalLanguages || 0,
      icon: Languages,
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      title: "Avg Completion",
      value: `${analytics?.averageCompletion || 0}%`,
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
    },
    {
      title: "Reviewed",
      value: `${analytics?.reviewedPercent || 0}%`,
      icon: CheckCircle2,
      color: "text-orange-600 dark:text-orange-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Translation coverage and progress across all projects
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completion by Namespace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            ) : !analytics?.namespaceStats || analytics.namespaceStats.length === 0 ? (
              <div className="py-8 text-center">
                <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No namespace data yet</p>
              </div>
            ) : (
              analytics.namespaceStats.map((ns) => (
                <div key={ns.namespace} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{ns.namespace}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {ns.reviewedKeys}/{ns.totalKeys} reviewed
                      </span>
                      <span className="font-semibold text-primary">
                        {ns.completionPercent}%
                      </span>
                    </div>
                  </div>
                  <Progress value={ns.completionPercent} className="h-2" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently Updated</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !analytics?.recentTranslations || analytics.recentTranslations.length === 0 ? (
              <div className="py-8 text-center">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent updates</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.recentTranslations.slice(0, 8).map((translation, idx) => (
                  <div
                    key={`${translation.key}-${translation.locale}-${translation.namespace}-${idx}`}
                    className="flex items-start justify-between gap-3 p-2 rounded-md hover-elevate"
                    data-testid={`row-recent-${idx}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-foreground truncate">
                          {translation.key}
                        </code>
                        <Badge variant="outline" className="text-xs font-mono shrink-0">
                          {translation.locale}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {translation.namespace}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(translation.updatedAt), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Untranslated Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : !analytics?.untranslatedKeys || analytics.untranslatedKeys.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">All keys translated!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Great work! All translation keys have been covered.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.untranslatedKeys.map((item) => (
                <div key={item.namespace} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-foreground">
                      {item.namespace}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {item.keys.length} missing
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-6">
                    {item.keys.slice(0, 10).map((key) => (
                      <code
                        key={key}
                        className="text-xs font-mono bg-muted px-2 py-1 rounded"
                      >
                        {key}
                      </code>
                    ))}
                    {item.keys.length > 10 && (
                      <span className="text-xs text-muted-foreground px-2 py-1">
                        +{item.keys.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
