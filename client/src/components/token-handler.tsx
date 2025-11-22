import { useEffect, useState } from "react";
import { extractHandoffFromUrl, redeemHandoffCode, isAuthenticated, redirectToLogin } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface TokenHandlerProps {
  children: React.ReactNode;
}

export function TokenHandler({ children }: TokenHandlerProps) {
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuthentication() {
      try {
        // Check if there's a handoff code in the URL
        const handoffCode = extractHandoffFromUrl();

        if (handoffCode) {
          // Redeem the handoff code for a JWT token
          const result = await redeemHandoffCode(handoffCode);

          if (!result.success) {
            setError(result.error || "Failed to authenticate");
            setIsValidating(false);
            return;
          }
        }

        // Check authentication status
        const authenticated = isAuthenticated();

        if (!authenticated && !import.meta.env.DEV) {
          // In production, redirect to psilyou.com if not authenticated
          redirectToLogin();
          return;
        }

        // Validation complete
        setIsValidating(false);
      } catch (err: any) {
        setError(err.message || "Unexpected authentication error");
        setIsValidating(false);
      }
    }

    handleAuthentication();
  }, []);

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="p-8 max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Failed</AlertTitle>
            <AlertDescription className="mt-2">
              {error}
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => redirectToLogin()} data-testid="button-retry-login">
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

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
