"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function LobbyPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // TODO: Verificar sessão
        // Por enquanto, apenas simula carregamento
        setTimeout(() => {
            setLoading(false);
            // Simula usuário logado
            setUser({ name: "Usuário" });
        }, 1000);
    }, []);

    async function handleLogout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/");
        } catch (e) {
            console.error("Logout failed", e);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
                <LoadingSpinner text="Carregando lobby" size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100">
            {/* Header */}
            <header className="border-b border-neutral-800/50 bg-neutral-900/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent">
                        RPG Mesa
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-neutral-400">{user?.name}</span>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 text-neutral-400 transition-all"
                        >
                            Sair
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="text-center py-20">
                    <h2 className="text-4xl font-bold mb-4">Bem-vindo ao Lobby!</h2>
                    <p className="text-neutral-400 mb-8">
                        Sistema de autenticação funcionando! 🎉
                    </p>
                    <p className="text-neutral-500 text-sm">
                        Próximos passos: Criar sistema de personagens e salas
                    </p>
                </div>
            </main>
        </div>
    );
}
