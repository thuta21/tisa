import Link from "next/link";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";

export default function NotFound() {
  return <div className="flex min-h-screen flex-col bg-background"><Navbar /><main id="main-content" tabIndex={-1} className="grid flex-1 place-items-center px-5 py-28"><div className="max-w-lg text-center"><p className="text-sm font-semibold text-primary">404</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Page not found.</h1><p className="mt-4 leading-7 text-muted-foreground">This page may have moved, or this jersey is not in the current collection.</p><Link href="/shop" className="mt-7 inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">Explore the collection</Link></div></main><Footer /></div>;
}
