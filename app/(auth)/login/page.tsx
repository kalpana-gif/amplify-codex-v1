"use client";

import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { AuthButtonLoader } from "@/components/auth/auth-button-loader";
import { AuthField } from "@/components/auth/auth-field";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AuthRouteLink } from "@/components/auth/auth-route-link";
import { BrandMark } from "@/components/branding/brand-mark";
import { PasswordInput } from "@/components/auth/password-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  signInWithEmailPassword,
  startGoogleAuthRedirect,
} from "@/lib/amplify-auth-actions";
import { isGoogleAuthConfigured } from "@/lib/amplify-client";
import { syncCurrentUserDirectoryProfile } from "@/lib/graphql/events";

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
      await startGoogleAuthRedirect();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to start Google sign-in.",
      );
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <AuthFormShell
      badge={
        <>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] text-xs font-semibold tracking-[0.18em] text-white shadow-[0_10px_22px_rgba(30,58,95,0.18)]">
            <BrandMark className="h-4.5 w-4.5" />
          </span>
          <span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Welcome back
            </span>
            <span className="block text-sm font-semibold leading-tight text-slate-800">
              Secure workspace access
            </span>
          </span>
        </>
      }
      description={
        isGoogleAuthConfigured
          ? "Use your email and password, or continue with Google to enter your workspace."
          : "Use your email and password to access budgets, approvals, and reporting."
      }
      footer={
        <p className="text-sm text-slate-600">
          Need an account?{" "}
          <AuthRouteLink
            href="/register"
            className="font-semibold text-[var(--color-primary)] transition hover:text-[var(--color-accent)]"
            intent="to-register"
          >
            Register
          </AuthRouteLink>
        </p>
      }
      helper={
        <div className="flex items-center gap-3 rounded-[1.15rem] border border-slate-200/80 bg-slate-50/90 px-3 py-2.5 sm:px-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_10%,white)] text-[var(--color-primary)]">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">Protected sign-in</p>
            <p className="text-sm text-slate-600">
              Access is limited to authorized event teams.
            </p>
          </div>
        </div>
      }
      title="Sign in to your workspace"
    >
      <form
        className="flex min-h-[18.5rem] flex-col"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            const result = await signInWithEmailPassword({
              email: values.email,
              password: values.password,
            });

            if (result.isSignedIn) {
              await syncCurrentUserDirectoryProfile();
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
        <div className="space-y-0.5">
          <AuthField
            error={form.formState.errors.email?.message}
            label="Email"
          >
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                autoComplete="email"
                className="h-11 rounded-2xl border-slate-200/80 bg-white/90 pl-11 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:h-12"
                placeholder="name@company.com"
                type="email"
                {...form.register("email")}
              />
            </div>
          </AuthField>

          <AuthField
            error={form.formState.errors.password?.message}
            label="Password"
          >
            <PasswordInput
              autoComplete="current-password"
              placeholder="Enter your password"
              {...form.register("password")}
            />
          </AuthField>

          <div
            aria-hidden="true"
            className="pointer-events-none block space-y-2 opacity-0 select-none"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-700">Full Name</span>
            </span>
            <div className="h-11 rounded-2xl border border-slate-200/80 bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:h-12" />
            <span className="block min-h-4 text-[11px] text-transparent sm:text-xs">
              .
            </span>
          </div>
        </div>

        <Button
          aria-busy={isSubmitting}
          className={cn(
            "mt-auto h-11 w-full justify-start rounded-[1.15rem] px-4 pr-14 text-sm font-semibold tracking-[0.02em] sm:h-12 sm:px-5 sm:pr-16",
            isSubmitting &&
              "disabled:cursor-progress disabled:border-[rgba(30,58,95,0.14)] disabled:bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] disabled:text-white disabled:opacity-100 disabled:shadow-[0_18px_38px_rgba(30,58,95,0.2)]",
          )}
          disabled={isSubmitting}
          variant="auth"
          type="submit"
        >
          <span
            className={cn(
              "relative z-10 pr-10 text-white transition-[color,transform] duration-300",
              isSubmitting
                ? "tracking-[0.06em] text-white/95"
                : "group-hover:translate-x-0.5 group-hover:text-slate-950",
            )}
          >
            {isSubmitting ? "Signing in" : "Sign In"}
          </span>
          <span
            className={cn(
              "pointer-events-none absolute inset-y-1 right-1 flex items-center justify-center rounded-[0.95rem] bg-white/95 text-[var(--color-accent)] shadow-[0_8px_18px_rgba(15,23,42,0.18)] transition-all duration-300 ease-out",
              isSubmitting
                ? "w-11"
                : "w-9 group-hover:w-[calc(100%-0.5rem)] group-active:scale-[0.98]",
            )}
          >
            {isSubmitting ? (
              <AuthButtonLoader className="scale-95" />
            ) : (
              <ArrowRight
                aria-hidden="true"
                className="h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            )}
          </span>
        </Button>
      </form>

      {isGoogleAuthConfigured ? (
        <>
          <div className="my-5 flex items-center gap-3 sm:my-6">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Or continue with
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Button
            className="h-11 w-full rounded-2xl border-slate-200/90 text-sm font-semibold sm:h-12"
            variant="secondary"
            onClick={() => {
              void handleGoogleSignIn();
            }}
          >
            Continue with Google
          </Button>
        </>
      ) : null}
    </AuthFormShell>
  );
}
