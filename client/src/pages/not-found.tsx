import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4 px-4">
        <FileQuestion className="w-16 h-16 text-muted-foreground mx-auto" />
        <h1 className="text-4xl font-semibold text-foreground">404</h1>
        <p className="text-muted-foreground">Page not found</p>
        <Button asChild data-testid="button-back-home">
          <Link href="/">Go back home</Link>
        </Button>
      </div>
    </div>
  );
}
