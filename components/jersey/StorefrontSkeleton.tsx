import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";

function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-black/[0.06] motion-reduce:animate-none ${className}`} />;
}

export default function StorefrontSkeleton({ variant = "home" }: { variant?: "home" | "collection" | "detail" }) {
  return <div className="tisa-page-surface flex min-h-screen flex-col">
    <Navbar />
    <main id="main-content" tabIndex={-1} aria-busy="true" aria-label="Loading collection" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
      <p role="status" className="sr-only">Loading {variant === "detail" ? "jersey details" : "the collection"}. Please wait.</p>
      <div aria-hidden="true">
        {variant === "collection" ? <>
          <Block className="h-3 w-32" /><Block className="mt-5 h-14 w-64 max-w-full" /><Block className="mt-5 h-5 w-full max-w-xl" />
          <div className="mt-8 grid gap-4 rounded-2xl border border-border p-5 sm:grid-cols-[2fr_1fr_1fr]">{[0, 1, 2].map(i => <Block key={i} className="h-16" />)}</div>
          <Block className="my-6 h-5 w-24" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="overflow-hidden rounded-3xl border border-border bg-white/70"><Block className="aspect-[4/3] rounded-none" /><div className="p-5"><Block className="h-3 w-28" /><Block className="mt-3 h-6 w-3/4" /><Block className="mt-5 h-4 w-36" /></div></div>)}</div>
        </> : <>
          <Block className="mb-4 h-4 w-52" />
          {variant === "detail" && <><Block className="h-3 w-28" /><Block className="mb-5 mt-3 h-16 w-full max-w-xl sm:h-12" /></>}
          <div className="grid gap-7 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
            <div><Block className="aspect-square rounded-[28px]" /><div className="mt-3 grid grid-cols-2 gap-2"><Block className="h-12" /><Block className="h-12" /></div></div>
            <div className="rounded-[28px] border border-border bg-white/60 p-6 sm:p-8"><Block className="h-3 w-28" /><Block className="mt-5 h-12 w-4/5" /><Block className="mt-3 h-12 w-3/5" /><Block className="mt-7 h-5 w-full" /><Block className="mt-3 h-5 w-4/5" /><div className="my-7 grid grid-cols-2 gap-5">{[0, 1, 2, 3].map(i => <Block key={i} className="h-12" />)}</div><Block className="h-12 w-full" /><Block className="mt-6 h-12 w-40" /><Block className="mt-7 h-28 w-full" /></div>
          </div>
        </>}
      </div>
    </main>
    <Footer />
  </div>;
}
