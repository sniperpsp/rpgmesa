"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface Character {
    id: string;
    name: string;
    class: string | null;
    race: string | null;
    avatarUrl: string | null;
    stats?: any;
}

export default function CharactersPage() {
    const router = useRouter();
    const [characters, setCharacters] = useState<Character[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newChar, setNewChar] = useState({ name: "", class: "", race: "" });

    useEffect(() => {
        loadCharacters();
    }, []);

    async function loadCharacters() {
        try {
            const res = await fetch("/api/characters");
            if (res.ok) {
                const data = await res.json();
                setCharacters(data.characters);
            }
        } catch (e) {
            console.error("Erro ao carregar personagens", e);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        try {
            const res = await fetch("/api/characters", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...newChar, withStats: true }),
            });

            if (res.ok) {
                setShowCreateForm(false);
                setNewChar({ name: "", class: "", race: "" });
                loadCharacters();
            }
        } catch (e) {
            console.error("Erro ao criar personagem", e);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Tem certeza que deseja deletar este personagem?")) return;

        try {
            const res = await fetch(`/api/characters/${id}`, { method: "DELETE" });
            if (res.ok) {
                loadCharacters();
            }
        } catch (e) {
            console.error("Erro ao deletar personagem", e);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
                <LoadingSpinner text="Carregando personagens" size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100">
            {/* Header */}
            <header className="border-b border-neutral-800/50 bg-neutral-900/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent">
                        Meus Personagens
                    </h1>
                    <Link
                        href="/lobby"
                        className="px-4 py-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 text-neutral-400 transition-all"
                    >
                        ← Voltar ao Lobby
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Create Button */}
                <div className="mb-8">
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all"
                    >
                        {showCreateForm ? "Cancelar" : "+ Novo Personagem"}
                    </button>
                </div>

                {/* Create Form */}
                {showCreateForm && (
                    <div className="mb-8 bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-6">
                        <h2 className="text-xl font-bold mb-4">Criar Novo Personagem</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input
                                    type="text"
                                    placeholder="Nome"
                                    value={newChar.name}
                                    onChange={(e) => setNewChar({ ...newChar, name: e.target.value })}
                                    className="px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Classe"
                                    value={newChar.class}
                                    onChange={(e) => setNewChar({ ...newChar, class: e.target.value })}
                                    className="px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Raça"
                                    value={newChar.race}
                                    onChange={(e) => setNewChar({ ...newChar, race: e.target.value })}
                                    className="px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all"
                            >
                                Criar Personagem
                            </button>
                        </form>
                    </div>
                )}

                {/* Characters Grid */}
                {characters.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-neutral-500 text-lg">Nenhum personagem criado ainda.</p>
                        <p className="text-neutral-600 text-sm mt-2">Clique em "Novo Personagem" para começar!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {characters.map((char) => (
                            <div
                                key={char.id}
                                className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-6 hover:border-emerald-500/50 transition-all group"
                            >
                                {/* Avatar */}
                                {char.avatarUrl && (
                                    <div className="mb-4">
                                        <img
                                            src={char.avatarUrl}
                                            alt={char.name}
                                            className="w-full aspect-square object-cover rounded-2xl"
                                        />
                                    </div>
                                )}

                                {/* Info */}
                                <h3 className="text-xl font-bold mb-2">{char.name}</h3>
                                <div className="flex gap-2 mb-4">
                                    {char.class && (
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm border border-emerald-500/30">
                                            {char.class}
                                        </span>
                                    )}
                                    {char.race && (
                                        <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm border border-purple-500/30">
                                            {char.race}
                                        </span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Link
                                        href={`/characters/${char.id}/edit`}
                                        className="flex-1 px-4 py-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 text-center transition-all"
                                    >
                                        Editar
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(char.id)}
                                        className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                                    >
                                        Deletar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
