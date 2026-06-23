"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shipflow/ui";

import { trpc } from "@/lib/trpc";

export default function HomePage() {
  const greeting = trpc.greeting.useQuery(undefined, {
    enabled: false,
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">ShipFlow AI - Coming Soon</CardTitle>
          <CardDescription>
            AI-powered shipping and logistics workflows
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Button onClick={() => greeting.refetch()} disabled={greeting.isFetching}>
            {greeting.isFetching ? "Loading..." : "Fetch Greeting"}
          </Button>
          {greeting.data && (
            <p className="text-sm text-muted-foreground">{greeting.data.text}</p>
          )}
          {greeting.error && (
            <p className="text-sm text-destructive">{greeting.error.message}</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
