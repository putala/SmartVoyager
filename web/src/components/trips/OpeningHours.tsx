import { Clock } from 'lucide-react';
import { formatOpeningHours, isOpenAt } from '../../utils/openingHours';

export const OpeningHours = ({ value }: { value: string }) => {
    const open = isOpenAt(value, new Date());

    return (
        <div className="text-xs text-muted mt-1 flex items-start gap-1">
            <Clock size={11} className="mt-0.5 shrink-0" />
            <span>
                {open !== null && (
                    <span className={`mr-1.5 font-medium ${open ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {open ? 'Otwarte teraz' : 'Zamknięte'}
                    </span>
                )}
                {formatOpeningHours(value)}
            </span>
        </div>
    );
};
