"use client";

import { useEffect } from "react";

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Store original background
    const body = document.body;
    const originalBackground = body.style.background;

    // Set transparent background for share page
    body.style.background = "transparent";

    // Restore on unmount
    return () => {
      body.style.background = originalBackground;
    };
  }, []);

  return <>{children}</>;
}
