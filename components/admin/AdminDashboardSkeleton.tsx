function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-neutral-200/80 ${className}`} />;
}

export default function AdminDashboardSkeleton({ embedded = false }: { embedded?: boolean }) {
  const body = (
    <>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-32" />)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <SkeletonBlock className="h-[30rem]" />
        <div className="space-y-6">
          <SkeletonBlock className="h-56" />
          <SkeletonBlock className="h-52" />
        </div>
      </div>
    </>
  );

  if (embedded) return body;

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <aside className="fixed bottom-0 left-0 right-0 h-[4.5rem] border-t border-border bg-background md:bottom-auto md:top-0 md:h-screen md:w-72 md:border-r md:border-t-0 md:p-6">
        <SkeletonBlock className="hidden h-12 w-40 md:block" />
        <div className="mt-8 hidden space-y-3 md:block">
          {[0, 1, 2, 3, 4, 5, 6].map((item) => <SkeletonBlock key={item} className="h-11 w-full" />)}
        </div>
      </aside>
      <main className="px-4 pb-24 pt-5 md:ml-72 md:px-8 md:pb-10 md:pt-8 xl:px-10">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <SkeletonBlock className="h-3 w-36" />
              <SkeletonBlock className="h-10 w-52" />
            </div>
            <div className="flex gap-2">
              <SkeletonBlock className="h-11 w-28 rounded-full" />
              <SkeletonBlock className="h-11 w-24 rounded-full" />
            </div>
          </div>
          {body}
        </div>
      </main>
    </div>
  );
}
