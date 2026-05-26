import {
  BarChart3,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { AuthFlipStage } from "@/components/auth/auth-flip-stage";
import { BrandMark } from "@/components/branding/brand-mark";
import { BRANDING } from "@/config/branding.mjs";

const authHighlights = [
  {
    label: "Budget Guardrails",
    text: "Approved, spent, and remaining stay aligned.",
    icon: WalletCards,
  },
  {
    label: "Approvals",
    text: "Clear ownership across admins and editors.",
    icon: ShieldCheck,
  },
  {
    label: "Reporting",
    text: "Clean event history and export-ready reporting.",
    icon: BarChart3,
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden px-4 py-4 sm:px-6 sm:py-10 lg:py-2 xl:py-7">
      <span className="pointer-events-none absolute left-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,rgba(46,117,182,0.14),transparent_70%)] sm:h-72 sm:w-72" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(22,49,79,0.12),transparent_72%)] sm:h-80 sm:w-80" />

      <div className="grid w-full max-w-7xl gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(26rem,29rem)] lg:items-stretch xl:grid-cols-[minmax(0,1fr)_minmax(28rem,31rem)]">
        <div className="relative hidden overflow-hidden rounded-[2rem] border border-slate-800/30 bg-[linear-gradient(165deg,#081221_0%,#102742_48%,#1e3a5f_100%)] p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.2)] lg:flex lg:flex-col xl:rounded-[2.3rem] xl:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(46,117,182,0.22),transparent_30%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-center gap-3 xl:gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/16 bg-white/10 text-base font-semibold tracking-[0.2em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-sm xl:h-12 xl:w-12 xl:rounded-[1.15rem]">
                <BrandMark className="h-5 w-5 xl:h-[1.35rem] xl:w-[1.35rem]" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.26em] text-blue-200/90">
                  {BRANDING.organizationName}
                </p>
                <p className="mt-1 text-sm font-medium text-white/88">
                  {BRANDING.fullName}
                </p>
              </div>
            </div>

            <div className="mt-7 max-w-xl xl:mt-8">
              <h1 className="text-[2.65rem] font-semibold leading-[1.02] tracking-tight xl:text-[3.4rem]">
                Budget clarity for every event.
              </h1>
              <p className="mt-3 max-w-lg text-[0.94rem] leading-6 text-blue-50/84 xl:text-[0.98rem] xl:leading-7">
                Run planning, approvals, spend tracking, and reporting from one clean workspace.
              </p>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-2.5 xl:mt-8 xl:gap-3">
              {authHighlights.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="group relative isolate min-h-[10.4rem] overflow-visible"
                  >
                    <span className="pointer-events-none absolute inset-y-4 left-[20%] w-[60%] rounded-[1.2rem] bg-[linear-gradient(135deg,rgba(46,117,182,0.42),rgba(22,49,79,0.72))] opacity-95 blur-2xl transition duration-500 group-hover:left-[14%] group-hover:w-[72%] group-hover:blur-[30px]" />
                    <span className="pointer-events-none absolute inset-y-1 left-[18%] w-[58%] rounded-[1.2rem] bg-[linear-gradient(135deg,rgba(46,117,182,0.95),rgba(22,49,79,0.98))] opacity-90 shadow-[0_18px_40px_rgba(9,23,44,0.26)] transition duration-500 [transform:skewX(-12deg)] group-hover:left-[13%] group-hover:w-[68%] group-hover:[transform:skewX(0deg)_scaleX(1.06)]" />

                    <div className="relative flex h-full min-h-[10.4rem] flex-col rounded-[1.25rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.07))] px-3 py-3 text-white shadow-[0_14px_36px_rgba(8,18,33,0.16)] backdrop-blur-xl transition duration-300 group-hover:-translate-y-1 group-hover:border-white/18 group-hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.08))] xl:rounded-[1.4rem] xl:px-3.5 xl:py-3.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[0.95rem] bg-white/12 text-blue-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-white">{item.label}</p>
                        <p className="mt-1 text-[12px] leading-5 text-blue-50/78">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-stretch justify-center">
          <div className="w-full max-w-xl lg:flex lg:flex-col xl:max-w-[31rem]">
            <div className="mb-3 rounded-[1.7rem] border border-white/70 bg-white/88 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-md sm:mb-4 sm:rounded-[2rem] sm:p-5 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] text-sm font-semibold tracking-[0.18em] text-white shadow-[0_14px_28px_rgba(30,58,95,0.22)] sm:h-12 sm:w-12 sm:rounded-[1.1rem]">
                  <BrandMark className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] uppercase tracking-[0.2em] text-slate-500 sm:text-[11px] sm:tracking-[0.22em]">
                    {BRANDING.organizationName}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-950 sm:mt-1 sm:text-base">
                    {BRANDING.fullName}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:mt-4 sm:leading-7">
                Budget control, approvals, tracking, and reporting in one clean workspace.
              </p>
            </div>

            <div className="lg:flex-1">
              <AuthFlipStage>{children}</AuthFlipStage>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
