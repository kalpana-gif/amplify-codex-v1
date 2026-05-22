"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { confirmSignUp, signIn, signUp, signInWithRedirect } from "aws-amplify/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
        Create account
      </p>
      <h1 className="mt-4 text-3xl font-semibold text-slate-950">Register</h1>
      <p className="mt-2 text-sm text-slate-600">
        {isGoogleAuthConfigured
          ? "Start with email and password, then verify your inbox."
          : "Create an account with email and password, then verify your inbox."}
      </p>

      {!awaitingConfirmation ? (
        <form
          className="mt-8 space-y-5"
          onSubmit={registerForm.handleSubmit(async (values) => {
            try {
              await signUp({
                username: values.email.toLowerCase(),
                password: values.password,
                options: {
                  userAttributes: {
                    email: values.email.toLowerCase(),
                    name: values.name,
                    preferred_username: values.email.toLowerCase(),
                  },
                },
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
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Full Name</span>
            <Input {...registerForm.register("name")} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <Input type="email" {...registerForm.register("email")} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <Input type="password" {...registerForm.register("password")} />
          </label>
          <Button type="submit" className="w-full">
            Create Account
          </Button>
        </form>
      ) : (
        <form
          className="mt-8 space-y-5"
          onSubmit={confirmForm.handleSubmit(async (values) => {
            try {
              await confirmSignUp({
                username: email,
                confirmationCode: values.code,
              });
              await signIn({
                username: email,
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
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">
              Verification Code
            </span>
            <Input {...confirmForm.register("code")} />
          </label>
          <Button type="submit" className="w-full">
            Verify Account
          </Button>
        </form>
      )}

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
        Already registered?{" "}
        <Link href="/login" className="font-medium text-[var(--color-accent)]">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
