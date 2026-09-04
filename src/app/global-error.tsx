"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-3 px-4 text-center font-sans">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-neutral-600">
          {error.message || "A client-side exception occurred."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
