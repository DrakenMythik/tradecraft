import { AuthForm } from "@/components/auth-form";

export default function AuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            Supabase Auth + Vercel FastAPI + Parquet research data
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white md:text-7xl">
              Build, test, and export systematic equity strategies.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              Compose nested indicator rules, stream parquet data through DuckDB,
              inspect bar-by-bar performance, and export a starter NinjaScript.
            </p>
          </div>
          <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
            {["Recursive JSON rules", "Multi-timeframe indicators", "Payload-safe charts"].map(
              (item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                  {item}
                </div>
              )
            )}
          </div>
        </div>
        <AuthForm />
      </section>
    </main>
  );
}
