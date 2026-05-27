"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";

// TODO: migrate to @faraday/marketing-ui when the shared package exists

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 bg-[rgba(255,255,255,0.92)] backdrop-blur-[20px] border-b border-border transition-shadow duration-300 ${
          scrolled ? "shadow-sm" : ""
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-[1200px] mx-auto px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 no-underline text-inherit"
            aria-label="Studio home"
          >
            <div className="w-9 h-9 rounded-lg bg-canvas flex items-center justify-center text-accent font-bold text-base">
              S
            </div>
            <span className="font-semibold text-[15px] text-text tracking-[-0.01em]">
              Studio
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-text-secondary no-underline text-sm font-medium hover:text-text transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-md text-[13px] font-semibold bg-canvas text-white hover:bg-canvas-light hover:-translate-y-px transition-all tracking-[0.01em]"
            >
              Join the Waitlist
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-text hover:text-text-secondary"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed top-16 left-0 right-0 bottom-0 md:hidden bg-white px-8 py-6 z-[99] flex flex-col gap-2">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block py-3.5 text-base font-medium text-text no-underline border-b border-border-light"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#waitlist"
            onClick={() => setMenuOpen(false)}
            className="mt-4 inline-block text-center px-6 py-3.5 rounded-md text-[15px] font-semibold bg-canvas text-white"
          >
            Join the Waitlist
          </a>
        </div>
      )}
    </>
  );
}
