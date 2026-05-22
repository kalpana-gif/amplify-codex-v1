"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { signIn, signInWithRedirect } from "aws-amplify/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isGoogleAuthConfigured } from "@/lib/amplify-client";

const schema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/events";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleGoogleSignIn = async () => {
    if (!isGoogleAuthConfigured) {
      toast.error(
        "Google sign-in is not configured yet. Use email and password for now.",
      );
      return;
    }

    try {
      await signInWithRedirect({ provider: "Google" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to start Google sign-in.",
      );
    }
  };

  return (
    <Card className="p-8">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
        Welcome back
      </p>
      <h1 className="mt-4 text-3xl font-semibold text-slate-950">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">
        {isGoogleAuthConfigured
          ? "Use your email and password or continue with Google."
          : "Use your email and password to access your workspace."}
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            const result = await signIn({
              username: values.email.toLowerCase(),
              password: values.password,
            });

            if (result.isSignedIn) {
              toast.success("Signed in.");
              router.replace(redirect);
              return;
            }

            toast.error("Additional auth steps are required for this account.");
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Unable to sign in.",
            );
          }
        })}
      >
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <Input type="email" {...form.register("email")} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <Input type="password" {...form.register("password")} />
        </label>
        <Button type="submit" className="w-full">
          Sign In
        </Button>
      </form>

      {isGoogleAuthConfigured ? (
        <>
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Or
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              void handleGoogleSignIn();
            }}
          >
            Continue with Google
          </Button>
        </>
      ) : null}

      <p className="mt-6 text-sm text-slate-600">
        Need an account?{" "}
        <Link href="/register" className="font-medium text-[var(--color-accent)]">
          Register
        </Link>
      </p>
    </Card>
  );
}
