import { LockKeyhole } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthTier } from "@/lib/constants";

export default function LoginPage({
  searchParams
}: {
  searchParams: { tier?: AuthTier; next?: string; error?: string };
}) {
  const tier = searchParams.tier === "admin" ? "admin" : "brother";
  const next = searchParams.next ?? (tier === "admin" ? "/pnms" : "/rate");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-primary" />
            {tier === "admin" ? "Admin access" : "Brother access"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="tier" value={tier} />
            <input type="hidden" name="next" value={next} />
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                aria-invalid={searchParams.error ? true : undefined}
                aria-describedby={searchParams.error ? "password-error" : undefined}
              />
            </div>
            {searchParams.error ? (
              <p id="password-error" role="alert" className="text-sm font-medium text-destructive">
                That password did not match.
              </p>
            ) : null}
            <Button type="submit" className="w-full">Continue</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
