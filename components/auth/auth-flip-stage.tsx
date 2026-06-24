"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import {
  clearAuthTransitionIntent,
  peekAuthTransitionIntent,
} from "@/components/auth/auth-transition-intent";

const isRegisterRoute = (pathname: string) => pathname.includes("/register");

export function AuthFlipStage({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const previousPathRef = useRef(pathname);
  const previousPath = previousPathRef.current;
  const routeChanged = previousPath !== pathname;
  const pendingIntent = routeChanged ? peekAuthTransitionIntent() : null;
  const targetIntent = isRegisterRoute(pathname) ? "to-register" : "to-login";
  const shouldAnimate = pendingIntent === targetIntent;
  const direction = isRegisterRoute(pathname) ? 1 : -1;

  previousPathRef.current = pathname;

  useEffect(() => {
    clearAuthTransitionIntent();
  }, [pathname]);

  return (
    <div className="h-full [perspective:1800px]">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={pathname}
          animate={{
            opacity: 1,
            rotateX: 0,
            rotateY: 0,
            x: 0,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
          }}
          exit={
            shouldAnimate
              ? {
                  opacity: 0.26,
                  rotateX: 4,
                  rotateY: direction * 16,
                  x: direction * 30,
                  y: 10,
                  scale: 0.982,
                  filter: "blur(7px)",
                }
              : {
                  opacity: 1,
                  rotateX: 0,
                  rotateY: 0,
                  x: 0,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                }
          }
          initial={
            shouldAnimate
              ? {
                  opacity: 0.3,
                  rotateX: -4,
                  rotateY: direction * 16,
                  x: direction * 30,
                  y: -10,
                  scale: 0.982,
                  filter: "blur(7px)",
                }
              : false
          }
          transition={{
            opacity: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
            filter: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
            default: {
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            },
          }}
          className="h-full [backface-visibility:hidden] [transform-style:preserve-3d]"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
