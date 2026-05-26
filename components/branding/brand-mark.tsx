import { cn } from "@/lib/utils";

export function BrandMark({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
      fill="none"
      viewBox="0 0 32 32"
    >
      <path
        d="M7 18.25C7 17.01 8.01 16 9.25 16H10.75C11.99 16 13 17.01 13 18.25V23.75C13 24.99 11.99 26 10.75 26H9.25C8.01 26 7 24.99 7 23.75V18.25Z"
        fill="currentColor"
        opacity="0.84"
      />
      <path
        d="M14 12.25C14 11.01 15.01 10 16.25 10H17.75C18.99 10 20 11.01 20 12.25V23.75C20 24.99 18.99 26 17.75 26H16.25C15.01 26 14 24.99 14 23.75V12.25Z"
        fill="currentColor"
        opacity="0.96"
      />
      <path
        d="M21 8.25C21 7.01 22.01 6 23.25 6H24.75C25.99 6 27 7.01 27 8.25V23.75C27 24.99 25.99 26 24.75 26H23.25C22.01 26 21 24.99 21 23.75V8.25Z"
        fill="currentColor"
        opacity="0.72"
      />
      <path
        d="M7.5 10.75L12.75 8L18 11.25L24.5 7.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}
