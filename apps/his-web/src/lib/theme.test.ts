import { describe, it, expect } from 'vitest';
import { px, cardStyle, theme } from './theme';

describe('theme utils', () => {
    describe('px', () => {
        it('should append "px" to number', () => {
            expect(px(10)).toBe('10px');
        });

        it('should handle 0 correctly', () => {
            expect(px(0)).toBe('0px');
        });
    });

    describe('cardStyle', () => {
        it('should return default card styles', () => {
            const style = cardStyle();
            expect(style).toHaveProperty('background', theme.colors.surface);
            expect(style).toHaveProperty('borderRadius', px(theme.radius.md));
        });

        it('should merge custom styles', () => {
            const style = cardStyle({ padding: '20px' });
            expect(style).toHaveProperty('padding', '20px');
        });
    });
});
