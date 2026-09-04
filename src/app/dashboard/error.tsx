"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold">Dashboard failed to load</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "The server hit an error while loading tickets."}
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
