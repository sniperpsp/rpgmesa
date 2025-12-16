"use client";

interface LoadingSpinnerProps {
    text?: string;
    size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ text = "Carregando", size = "md" }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "w-6 h-6",
        md: "w-12 h-12",
        lg: "w-16 h-16"
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            {/* Animated dice */}
            <div className="relative">
                <div className={`${sizeClasses[size]} animate-bounce`}>
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-emerald-500">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.3" />
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="12" cy="9" r="1.5" fill="white" />
                        <circle cx="8" cy="14" r="1.5" fill="white" />
                        <circle cx="16" cy="14" r="1.5" fill="white" />
                    </svg>
                </div>
                <div className="absolute inset-0 animate-ping opacity-20">
                    <div className={`${sizeClasses[size]} rounded-full bg-emerald-500`} />
                </div>
            </div>
            {text && (
                <p className="text-neutral-400 text-sm animate-pulse">{text}...</p>
            )}
        </div>
    );
}
