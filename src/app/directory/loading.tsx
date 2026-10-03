export default function Loading() {
  return (
    <div className="container-site py-12 sm:py-16" aria-busy="true" aria-live="polite">
      <div className="mx-auto h-9 w-64 rounded bg-card animate-pulse mb-4" />
      <div className="mx-auto h-4 w-96 max-w-full rounded bg-card animate-pulse mb-10" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => <div key={i} className="h-40 rounded-card bg-card animate-pulse" />)}
      </div>
    </div>
  );
}
