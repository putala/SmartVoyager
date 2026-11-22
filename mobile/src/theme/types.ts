export type ColorMode = 'light' | 'dark' | 'system';
export type AccentColor = 'slate' | 'blue' | 'violet' | 'emerald' | 'rose' | 'amber';
export type Density = 'comfortable' | 'compact';

export interface AppearanceSettings {
    colorMode: ColorMode;
    accent: AccentColor;
    density: Density;
}

export const VALID_ACCENTS: AccentColor[] = ['slate', 'blue', 'violet', 'emerald', 'rose', 'amber'];

export const DEFAULT_APPEARANCE: AppearanceSettings = {
    colorMode: 'system',
    accent: 'slate',
    density: 'comfortable',
};
