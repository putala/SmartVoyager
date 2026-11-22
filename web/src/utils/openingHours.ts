// Opening hours in the OpenStreetMap `opening_hours` format, limited to the subset used by most attractions:
// "Mo-Fr 09:00-17:00; Sa 10:00-14:00; Su off", "Tu-Su 10:00-16:00, PH off", "24/7".
// Values outside this subset (months, week numbers, sunrise...) are not guessed: they are shown as they are
// and give no open/closed status.

const DAY_CODES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const DAY_SHORT = ['pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'niedz.'];
const DAY_SPOKEN = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];
const DAY_SPOKEN_GENITIVE = ['poniedziałku', 'wtorku', 'środy', 'czwartku', 'piątku', 'soboty', 'niedzieli'];

const MINUTES_PER_DAY = 24 * 60;
const DAY = '(?:Mo|Tu|We|Th|Fr|Sa|Su)';
const DAY_ITEM = `(?:${DAY}(?:-${DAY})?|PH)`;
const DAYS_PATTERN = new RegExp(`^${DAY_ITEM}(?:,${DAY_ITEM})*$`);
const TIME_RANGE = '\\d{1,2}:\\d{2}-\\d{1,2}:\\d{2}';
const TIMES_PATTERN = new RegExp(`^${TIME_RANGE}(?:,${TIME_RANGE})*$`);
// Rules are separated by ";" or by ", " before a day; a comma without a space joins days ("Tu,Fr")
const RULE_SEPARATOR = /\s*;\s*|\s*,\s+(?=(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)\b)/;

interface DaySpan {
    from: number;
    to: number;
}

interface TimeInterval {
    start: number;
    end: number;
}

export interface OpeningRule {
    days: DaySpan[];
    publicHolidays: boolean;
    intervals: TimeInterval[];
    closed: boolean;
}

const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const parseDays = (token: string): Pick<OpeningRule, 'days' | 'publicHolidays'> => {
    const items = token.split(',');
    const days = items
        .filter(item => item !== 'PH')
        .map(item => {
            const [from, to = from] = item.split('-');
            return { from: DAY_CODES.indexOf(from), to: DAY_CODES.indexOf(to) };
        });
    return { days, publicHolidays: items.includes('PH') };
};

const parseTimes = (token: string): Pick<OpeningRule, 'intervals' | 'closed'> | null => {
    if (token === 'off' || token === 'closed') return { intervals: [], closed: true };
    if (!TIMES_PATTERN.test(token)) return null;
    const intervals = token.split(',').map(range => {
        const [start, end] = range.split('-');
        return { start: toMinutes(start), end: toMinutes(end) };
    });
    return { intervals, closed: false };
};

const parseRule = (rule: string): OpeningRule | null => {
    if (rule === '24/7') {
        return { days: [], publicHolidays: false, intervals: [{ start: 0, end: MINUTES_PER_DAY }], closed: false };
    }
    const tokens = rule.split(' ');
    const daysToken = tokens.length === 2 ? tokens[0] : null;
    const timesToken = tokens[tokens.length - 1];
    if (tokens.length > 2 || (daysToken && !DAYS_PATTERN.test(daysToken))) return null;

    const times = parseTimes(timesToken);
    if (!times) return null;
    const days = daysToken ? parseDays(daysToken) : { days: [], publicHolidays: false };
    return { ...days, ...times };
};

/**
 * Rules in order of the source text, or null when the value is outside the supported subset
 */
export function parseOpeningHours(value: string | undefined): OpeningRule[] | null {
    if (!value?.trim()) return null;
    const normalized = value.trim()
        .replace(/\s+/g, ' ')
        .replace(/\s*-\s*/g, '-')
        .replace(/(\d)\s*,\s*(\d)/g, '$1,$2');
    const rules = normalized.split(RULE_SEPARATOR).filter(Boolean).map(parseRule);
    return rules.length > 0 && rules.every(Boolean) ? (rules as OpeningRule[]) : null;
}

const coversDay = ({ from, to }: DaySpan, day: number) =>
    (from <= to ? day >= from && day <= to : day >= from || day <= to);

const containsMinute = ({ start, end }: TimeInterval, minute: number) =>
    (end > start ? minute >= start && minute < end : minute >= start || minute < end);

const appliesToDay = (rule: OpeningRule, day: number) =>
    (rule.days.length === 0 ? !rule.publicHolidays : rule.days.some(span => coversDay(span, day)));

/**
 * true/false for the given moment, null when the hours cannot be interpreted.
 * Later rules override earlier ones for the same day, as in OpenStreetMap; days not mentioned are closed.
 */
export function isOpenAt(value: string | undefined, date: Date): boolean | null {
    const rules = parseOpeningHours(value);
    if (!rules) return null;
    const day = (date.getDay() + 6) % 7;
    const minute = date.getHours() * 60 + date.getMinutes();

    let open = false;
    for (const rule of rules) {
        if (appliesToDay(rule, day)) {
            open = !rule.closed && rule.intervals.some(interval => containsMinute(interval, minute));
        }
    }
    return open;
}

const isWholeDay = (rule: OpeningRule) =>
    rule.intervals.length === 1 && rule.intervals[0].start === 0 && rule.intervals[0].end === MINUTES_PER_DAY;

const formatTime = (minutes: number) =>
    `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

interface DayLabels {
    day: (index: number) => string;
    range: (span: DaySpan) => string;
    holidays: string;
    everyDay: string;
    separator: string;
}

const describeDays = (rule: OpeningRule, labels: DayLabels) => {
    const parts = rule.days.map(span => (span.from === span.to ? labels.day(span.from) : labels.range(span)));
    if (rule.publicHolidays) parts.push(labels.holidays);
    return parts.length > 0 ? parts.join(labels.separator) : labels.everyDay;
};

/**
 * Short Polish text for the screen, e.g. "pon. nieczynne; wt.–pt. 12:00–21:00".
 * Values outside the supported subset are returned unchanged.
 */
export function formatOpeningHours(value: string | undefined): string {
    const rules = parseOpeningHours(value);
    if (!rules) return value?.trim() ?? '';
    return rules.map(rule => {
        const days = describeDays(rule, {
            day: index => DAY_SHORT[index],
            range: span => `${DAY_SHORT[span.from]}–${DAY_SHORT[span.to]}`,
            holidays: 'święta',
            everyDay: 'codziennie',
            separator: ', ',
        });
        if (rule.closed) return `${days} nieczynne`;
        if (isWholeDay(rule)) return `${days} całą dobę`;
        return `${days} ${rule.intervals.map(({ start, end }) => `${formatTime(start)}–${formatTime(end)}`).join(', ')}`;
    }).join('; ');
}

/**
 * Text for the Polish voice reader, e.g. "od wtorku do piątku od 12:00 do 21:00".
 * Returns null for values outside the supported subset, so raw codes are never read aloud.
 */
export function describeOpeningHoursForSpeech(value: string | undefined): string | null {
    const rules = parseOpeningHours(value);
    if (!rules) return null;
    return rules.map(rule => {
        const days = describeDays(rule, {
            day: index => DAY_SPOKEN[index],
            range: span => `od ${DAY_SPOKEN_GENITIVE[span.from]} do ${DAY_SPOKEN_GENITIVE[span.to]}`,
            holidays: 'w święta',
            everyDay: 'codziennie',
            separator: ' i ',
        });
        if (rule.closed) return `${days} nieczynne`;
        if (isWholeDay(rule)) return `${days} całą dobę`;
        return `${days} ${rule.intervals.map(({ start, end }) => `od ${formatTime(start)} do ${formatTime(end)}`).join(' i ')}`;
    }).join(', ');
}
