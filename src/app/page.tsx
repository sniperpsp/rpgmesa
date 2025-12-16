import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4">
      <main className="max-w-md w-full text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent tracking-tight">
            RPG Mesa
          </h1>
          <p className="text-neutral-400 text-lg">
            Gerencie suas mesas, personagens e histórias com o poder da IA.
          </p>
        </div>

        <div className="grid gap-4">
          <Link
            href="/login"
            className="block w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-emerald-500/25"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="block w-full py-4 px-6 bg-neutral-900/50 backdrop-blur-sm hover:bg-neutral-800/50 text-neutral-200 border border-neutral-800/50 rounded-2xl font-semibold transition-all"
          >
            Criar conta
          </Link>
        </div>

        <div className="text-sm text-neutral-500 pt-8">
          <p>Powered by Next.js & Mistral AI</p>
        </div>
      </main>
    </div>
  );
}
