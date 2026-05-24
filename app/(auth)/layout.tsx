import { BRANDING } from "@/config/branding.mjs";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden overflow-hidden rounded-[2.5rem] border border-slate-800/40 bg-[linear-gradient(160deg,#0b1220_0%,#102742_46%,#1e3a5f_100%)] p-10 text-white shadow-[var(--shadow-panel-strong)] lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(46,117,182,0.28),transparent_34%)]" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.28em] text-blue-200">
              {BRANDING.fullName}
            </p>
            <h1 className="mt-6 max-w-xl text-5xl font-semibold tracking-tight">
              Budget authority, execution control, and reporting in one place.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-blue-100">
              Coordinate event delivery with a fixed budget ceiling, live spend
              visibility, accountable team activity, and history that stays useful
              long after the event closes.
            </p>
            <div className="mt-10 grid gap-4">
              {[
                ["Budget Control", "Track approved, planned, spent, and remaining without losing the ceiling."],
                ["Execution Layer", "Turn line items into real work, receipts, and confirmed costs."],
                ["System Visibility", "Keep a clear record of who changed what and when."],
              ].map(([label, text]) => (
                <div
                  key={label}
                  className="rounded-[1.75rem] border border-white/12 bg-white/8 p-5 backdrop-blur-sm"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-blue-200">
                    {label}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-blue-50">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
