"use client";

import {
  useEffect,
  useRef,
  useState,
  startTransition,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  ChevronDown,
  LogOut,
  Menu,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "aws-amplify/auth";
import { AuthButtonLoader } from "@/components/auth/auth-button-loader";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { BRANDING } from "@/config/branding.mjs";
import { getCurrentUserProfile } from "@/lib/graphql/events";

export function Header({
  sidebarCollapsed,
  onOpenSidebar,
  onToggleSidebarCollapse,
}: {
  sidebarCollapsed: boolean;
  onOpenSidebar: () => void;
  onToggleSidebarCollapse: () => void;
}) {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startTransition(() => {
      void getCurrentUserProfile().then((profile) => {
        setUserName(profile?.name ?? "Guest");
      });
    });
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  const initials = (userName ?? "Guest")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "G";

  const openSignOutModal = (event?: ReactMouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    setProfileMenuOpen(false);
    setSignOutOpen(true);
  };

  return (
    <>
      <header className="relative z-30 flex min-h-20 items-center justify-between overflow-visible rounded-[1.75rem] border border-slate-200/80 bg-white/82 px-4 py-3 shadow-[var(--shadow-panel)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 md:hidden"
            onClick={onOpenSidebar}
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            className="hidden rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 md:inline-flex"
            onClick={onToggleSidebarCollapse}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              {BRANDING.fullName}
            </p>
            {userName ? (
              <h2 className="text-xl font-semibold text-slate-950">{userName}</h2>
            ) : (
              <Skeleton className="mt-2 h-6 w-32 rounded-full border-white/0" />
            )}
          </div>
        </div>

        <div
          className="relative z-40 flex items-center border-l border-slate-200/80 pl-3"
          ref={profileMenuRef}
        >
          <button
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
            className="group flex items-center gap-2.5 rounded-[1.25rem] border border-transparent bg-white/0 px-2.5 py-1.5 text-left transition hover:border-slate-200/80 hover:bg-slate-50/90"
            onClick={() => setProfileMenuOpen((current) => !current)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] text-xs font-semibold tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(30,58,95,0.22)]">
              {initials}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                Account
              </p>
              <p className="truncate text-sm font-semibold text-slate-950">
                {userName}
              </p>
            </div>
            <ChevronDown
              className={`hidden h-4 w-4 text-slate-400 transition group-hover:text-slate-600 sm:block ${
                profileMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {profileMenuOpen ? (
            <div
              className="absolute right-0 top-[calc(100%+0.75rem)] z-[90] w-[min(18rem,calc(100vw-2rem))] overflow-visible rounded-[1.5rem] border border-slate-200/90 bg-white/96 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl"
              role="menu"
            >
              <div className="absolute right-6 top-0 h-3.5 w-3.5 -translate-y-1/2 rotate-45 rounded-[3px] border-l border-t border-slate-200/90 bg-white" />

              <div className="rounded-[1.15rem] border border-slate-200/80 bg-slate-50/80 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] text-xs font-semibold tracking-[0.12em] text-white">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                      Signed In
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {userName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-2 rounded-[1.15rem] border border-slate-200/80 bg-white p-1.5">
                <button
                  className="flex w-full items-center gap-3 rounded-[0.95rem] px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                  role="menuitem"
                  onClick={openSignOutModal}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <LogOut className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">Sign Out</span>
                    <span className="block text-xs text-slate-500">End session</span>
                  </span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <Modal
        className="max-w-md"
        description="You will be returned to the login screen and will need to authenticate again to continue."
        open={signOutOpen}
        title="Sign out of your account?"
        onClose={() => {
          if (!isSigningOut) {
            setSignOutOpen(false);
          }
        }}
      >
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] text-base font-semibold tracking-[0.2em] text-white shadow-[0_14px_34px_rgba(30,58,95,0.32)]">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Signed in as
                </p>
                <p className="truncate text-base font-semibold text-slate-950">
                  {userName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              onClick={() => setSignOutOpen(false)}
            >
              Stay signed in
            </Button>
            <Button
              className="w-full sm:w-auto"
              variant="danger"
              disabled={isSigningOut}
              onClick={() => {
                setIsSigningOut(true);
                void signOut().finally(() => router.replace("/login"));
              }}
            >
              {isSigningOut ? (
                <>
                  <AuthButtonLoader
                    className="mr-3 scale-[0.78]"
                    style={
                      {
                        "--auth-loader-primary": "rgba(255,255,255,0.96)",
                        "--auth-loader-accent": "rgba(255,255,255,0.82)",
                        "--auth-loader-secondary": "rgba(255,255,255,0.72)",
                        "--auth-loader-tertiary": "rgba(255,255,255,0.6)",
                      } as CSSProperties
                    }
                  />
                  Signing out
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
