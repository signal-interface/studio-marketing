"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export default function RevealOnScroll({
  children,
  className = "",
  delay = "",
}: {
  children: ReactNode;
  className?: string;
  delay?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "visible" : ""} ${delay} ${className}`}
    >
      {children}
    </div>
  );
}
