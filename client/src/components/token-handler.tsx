import { useEffect, useState } from "react";
import { extractTokenFromUrl, isAuthenticated, redirectToLogin } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface TokenHandlerProps {
  children: React.ReactNode;
}

export function TokenHandler({ children }: TokenHandlerProps) {
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    // Extract token from URL if present
    extractTokenFromUrl();

    // Check authentication status
    const authenticated = isAuthenticated();

    if (!authenticated && !import.meta.env.DEV) {
      // In production, redirect to admin.psilyou.com if not authenticated
      redirectToLogin();
      return;
    }

    // Validation complete
    setIsValidating(false);
  }, []);

  // Show loading state while validating
  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-auth" />
            <p className="text-sm text-muted-foreground">Validating authentication...</p>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
