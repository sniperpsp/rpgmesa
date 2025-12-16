"use client";
import { useEffect, useState } from "react";

interface TurnNotificationProps {
    isYourTurn: boolean;
    characterName: string;
}

export function TurnNotification({ isYourTurn, characterName }: TurnNotificationProps) {
    const [show, setShow] = useState(false);
    const [audio] = useState(typeof window !== 'undefined' ? new Audio('/sounds/your-turn.mp3') : null);

    useEffect(() => {
        if (isYourTurn) {
            setShow(true);
            // Tocar som
            audio?.play().catch(() => { });

            // Vibrar se disponível
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }

            // Esconder após 5 segundos
            const timer = setTimeout(() => setShow(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [isYourTurn, audio]);

    if (!show || !isYourTurn) return null;

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-4 rounded-2xl shadow-2xl border-4 border-yellow-300">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">⚔️</span>
                    <div>
                        <p className="font-bold text-xl">SUA VEZ, {characterName}!</p>
                        <p className="text-sm opacity-90">Escolha sua ação</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
