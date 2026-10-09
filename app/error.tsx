"use client";

import Link from "next/link";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="flex min-h-screen flex-col bg-background"><Navbar /><main id="main-content" tabIndex={-1} className="grid flex-1 place-items-center px-5 py-28"><section role="alert" className="max-w-lg text-center"><h1 className="text-3xl font-semibold tracking-tight">This page could not be loaded.</h1><p className="mt-4 leading-7 text-muted-foreground">Please try again in a moment.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button type="button" onClick={reset} className="min-h-12 rounded-full bg-primary px-6 text-sm font-semibold text-white">Try again</button><Link href="/" className="inline-flex min-h-12 items-center rounded-full border border-border px-6 text-sm font-medium">Back to home</Link></div></section></main><Footer /></div>;
}
