import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ConfirmState {
    message: string;
    resolve: (value: boolean) => void;
}

interface UIContextValue {
    toast: (message: string, type?: ToastType) => void;
    confirm: (message: string) => Promise<boolean>;
}

const UIContext = createContext<UIContextValue | null>(null);

const toastStyles: Record<ToastType, string> = {
    success: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-lg',
    error: 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-900/50 text-slate-800 dark:text-slate-100 shadow-lg',
    info: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-lg',
};

const toastIcons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />,
    error: <AlertCircle size={18} className="text-red-500 shrink-0" />,
    info: <Info size={18} className="text-indigo-400 shrink-0" />,
};

export function UIProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const toastId = useRef(0);

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++toastId.current;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const confirm = useCallback((message: string) => {
        return new Promise<boolean>((resolve) => {
            setConfirmState({ message, resolve });
        });
    }, []);

    const handleConfirm = (value: boolean) => {
        confirmState?.resolve(value);
        setConfirmState(null);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <UIContext.Provider value={{ toast, confirm }}>
            {children}

            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in slide-in-from-right duration-300 ${toastStyles[t.type]}`}
                    >
                        {toastIcons[t.type]}
                        <p className="text-sm font-medium flex-1">{t.message}</p>
                        <button
                            onClick={() => removeToast(t.id)}
                            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                            aria-label="Zamknij"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {confirmState && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <p className="text-slate-800 dark:text-slate-100 font-medium mb-6">{confirmState.message}</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => handleConfirm(false)}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={() => handleConfirm(true)}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
                            >
                                Potwierdź
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </UIContext.Provider>
    );
}

export function useUI() {
    const ctx = useContext(UIContext);
    if (!ctx) throw new Error('useUI must be used within UIProvider');
    return ctx;
}
