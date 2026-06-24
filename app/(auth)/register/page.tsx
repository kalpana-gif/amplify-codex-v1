"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
  confirmEmailSignUp,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  startGoogleAuthRedirect,
} from "@/lib/amplify-auth-actions";
import { isGoogleAuthConfigured } from "@/lib/amplify-client";

const registerSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const confirmSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit verification code."),
});

type RegisterValues = z.infer<typeof registerSchema>;
type ConfirmValues = z.infer<typeof confirmSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const confirmForm = useForm<ConfirmValues>({
    resolver: zodResolver(confirmSchema),
    defaultValues: {
      code: "",
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

  const isRegisterSubmitting = registerForm.formState.isSubmitting;

  return (
    <AuthFormShell
      badge={
        <>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] text-xs font-semibold tracking-[0.18em] text-white shadow-[0_10px_22px_rgba(30,58,95,0.18)]">
            <BrandMark className="h-4.5 w-4.5" />
          </span>
          <span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {awaitingConfirmation ? "Verify account" : "Create account"}
            </span>
            <span className="block text-sm font-semibold leading-tight text-slate-800">
              {awaitingConfirmation ? "Finish setup" : "Secure workspace setup"}
            </span>
          </span>
        </>
      }
      description={
        awaitingConfirmation
          ? "Enter the verification code sent to your inbox to activate your account and continue."
          : isGoogleAuthConfigured
            ? "Create your account with email and password, or continue with Google."
            : "Create your account to access budgets, approvals, and reporting."
      }
      footer={
        <p className="text-sm text-slate-600">
          Already registered?{" "}
          <AuthRouteLink
            href="/login"
            className="font-semibold text-[var(--color-primary)] transition hover:text-[var(--color-accent)]"
            intent="to-login"
          >
            Sign in
          </AuthRouteLink>
        </p>
      }
      helper={
        awaitingConfirmation ? (
          <div className="rounded-[1.15rem] border border-slate-200/80 bg-slate-50/90 px-3 py-2.5 sm:px-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_10%,white)] text-[var(--color-primary)]">
                <BadgeCheck className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">Verification pending</p>
                <p className="text-sm text-slate-600">
                  We sent a 6-digit code to <span className="font-medium text-slate-800">{email}</span>.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-[1.15rem] border border-slate-200/80 bg-slate-50/90 px-3 py-2.5 sm:px-3.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_10%,white)] text-[var(--color-primary)]">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">Protected sign-up</p>
              <p className="text-sm text-slate-600">
                Use your work email to create access for your event workspace.
              </p>
            </div>
          </div>
        )
      }
      title={awaitingConfirmation ? "Verify your account" : "Create your workspace"}
    >
      {!awaitingConfirmation ? (
        <form
          className="flex min-h-[18.5rem] flex-col"
          onSubmit={registerForm.handleSubmit(async (values) => {
            try {
              await signUpWithEmailPassword({
                email: values.email,
                password: values.password,
                name: values.name,
              });

              setEmail(values.email.toLowerCase());
              setPassword(values.password);
              setAwaitingConfirmation(true);
              toast.success("Verification code sent.");
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Unable to register.",
              );
            }
          })}
        >
          <div className="space-y-0.5">
            <AuthField
              error={registerForm.formState.errors.name?.message}
              label="Full Name"
            >
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  autoComplete="name"
                  className="h-11 rounded-2xl border-slate-200/80 bg-white/90 pl-11 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:h-12"
                  placeholder="Enter your full name"
                  {...registerForm.register("name")}
                />
              </div>
            </AuthField>

            <AuthField
              error={registerForm.formState.errors.email?.message}
              label="Email"
            >
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  autoComplete="email"
                  className="h-11 rounded-2xl border-slate-200/80 bg-white/90 pl-11 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:h-12"
                  placeholder="name@company.com"
                  type="email"
                  {...registerForm.register("email")}
                />
              </div>
            </AuthField>

            <AuthField
              error={registerForm.formState.errors.password?.message}
              hint="Min 8 chars"
              label="Password"
            >
              <PasswordInput
                autoComplete="new-password"
                placeholder="Create a secure password"
                {...registerForm.register("password")}
              />
            </AuthField>
          </div>

          <Button
            aria-busy={isRegisterSubmitting}
            className={cn(
              "mt-auto h-11 w-full justify-start rounded-[1.15rem] px-4 pr-14 text-sm font-semibold tracking-[0.02em] sm:h-12 sm:px-5 sm:pr-16",
              isRegisterSubmitting &&
                "disabled:cursor-progress disabled:border-[rgba(30,58,95,0.14)] disabled:bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] disabled:text-white disabled:opacity-100 disabled:shadow-[0_18px_38px_rgba(30,58,95,0.2)]",
            )}
            disabled={isRegisterSubmitting}
            variant="auth"
            type="submit"
          >
            <span
              className={cn(
                "relative z-10 pr-10 text-white transition-[color,transform] duration-300",
                isRegisterSubmitting
                  ? "tracking-[0.06em] text-white/95"
                  : "group-hover:translate-x-0.5 group-hover:text-slate-950",
              )}
            >
              {isRegisterSubmitting ? "Creating account" : "Create Account"}
            </span>
            <span
              className={cn(
                "pointer-events-none absolute inset-y-1 right-1 flex items-center justify-center rounded-[0.95rem] bg-white/95 text-[var(--color-accent)] shadow-[0_8px_18px_rgba(15,23,42,0.18)] transition-all duration-300 ease-out",
                isRegisterSubmitting
                  ? "w-11"
                  : "w-9 group-hover:w-[calc(100%-0.5rem)] group-active:scale-[0.98]",
              )}
            >
              {isRegisterSubmitting ? (
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
      ) : (
        <form
          className="space-y-0.5"
          onSubmit={confirmForm.handleSubmit(async (values) => {
            try {
              await confirmEmailSignUp({
                email,
                code: values.code,
              });
              await signInWithEmailPassword({
                email,
                password,
              });
              toast.success("Account verified.");
              router.replace("/events");
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Verification failed.",
              );
            }
          })}
        >
          <div className="mb-4 flex items-center gap-3 sm:mb-5">
            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white sm:h-9 sm:min-w-9">
              1
            </span>
            <div className="h-px flex-1 bg-slate-200" />
            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] text-xs font-semibold text-white shadow-[0_10px_22px_rgba(30,58,95,0.18)] sm:h-9 sm:min-w-9">
              2
            </span>
          </div>

          <AuthField
            error={confirmForm.formState.errors.code?.message}
            hint="6 digits"
            label="Verification Code"
          >
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                autoComplete="one-time-code"
                className="h-11 rounded-2xl border-slate-200/80 bg-white/90 pl-11 tracking-[0.25em] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:h-12"
                placeholder="123456"
                {...confirmForm.register("code")}
              />
            </div>
          </AuthField>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Button
              className="h-11 rounded-2xl sm:h-12 sm:flex-1"
              disabled={confirmForm.formState.isSubmitting}
              type="submit"
            >
              {confirmForm.formState.isSubmitting ? "Verifying..." : "Verify Account"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              className="h-14 rounded-2xl sm:h-12 sm:w-auto"
              variant="secondary"
              onClick={() => setAwaitingConfirmation(false)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Change details
            </Button>
          </div>
        </form>
      )}

      {isGoogleAuthConfigured && !awaitingConfirmation ? (
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
