import {
  parseRiveColor,
  riveColorToArgb,
  riveColorToHex,
} from './color-parser';
import { RiveColor } from '../models/data-binding.types';

describe('color-parser', () => {
  describe('parseRiveColor', () => {
    describe('hex string parsing', () => {
      it('should parse 6-digit hex color (#RRGGBB)', () => {
        const result = parseRiveColor('#FF5733');
        expect(result).toEqual({ r: 255, g: 87, b: 51, a: 255 });
      });

      it('should parse 8-digit hex color (#RRGGBBAA)', () => {
        const result = parseRiveColor('#FF573380');
        expect(result).toEqual({ r: 255, g: 87, b: 51, a: 128 });
      });

      it('should parse hex without # prefix', () => {
        const result = parseRiveColor('FF5733');
        expect(result).toEqual({ r: 255, g: 87, b: 51, a: 255 });
      });

      it('should parse lowercase hex', () => {
        const result = parseRiveColor('#ff5733');
        expect(result).toEqual({ r: 255, g: 87, b: 51, a: 255 });
      });

      it('should parse black color', () => {
        const result = parseRiveColor('#000000');
        expect(result).toEqual({ r: 0, g: 0, b: 0, a: 255 });
      });

      it('should parse white color', () => {
        const result = parseRiveColor('#FFFFFF');
        expect(result).toEqual({ r: 255, g: 255, b: 255, a: 255 });
      });

      it('should parse transparent black', () => {
        const result = parseRiveColor('#00000000');
        expect(result).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      });

      it('should throw on invalid hex format', () => {
        expect(() => parseRiveColor('#GGGGGG')).toThrow(
          'Invalid hex color format',
        );
        expect(() => parseRiveColor('#FFF')).toThrow(
          'Invalid hex color format',
        );
        expect(() => parseRiveColor('#FFFFFFFFFF')).toThrow(
          'Invalid hex color format',
        );
      });
    });

    describe('ARGB integer parsing', () => {
      it('should parse ARGB integer (red with full alpha)', () => {
        const result = parseRiveColor(0xffff0000);
        expect(result).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      });

      it('should parse ARGB integer (green with half alpha)', () => {
        const result = parseRiveColor(0x8000ff00);
        expect(result).toEqual({ r: 0, g: 255, b: 0, a: 128 });
      });

      it('should parse ARGB integer (blue with full alpha)', () => {
        const result = parseRiveColor(0xff0000ff);
        expect(result).toEqual({ r: 0, g: 0, b: 255, a: 255 });
      });

      it('should parse ARGB integer (transparent)', () => {
        const result = parseRiveColor(0x00000000);
        expect(result).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      });

      it('should parse ARGB integer (custom color)', () => {
        const result = parseRiveColor(0x80ff5733);
        expect(result).toEqual({ r: 255, g: 87, b: 51, a: 128 });
      });
    });

    describe('RiveColor object parsing', () => {
      it('should normalize RiveColor with all components', () => {
        const result = parseRiveColor({ r: 255, g: 87, b: 51, a: 128 });
        expect(result).toEqual({ r: 255, g: 87, b: 51, a: 128 });
      });

      it('should default alpha to 255 if missing', () => {
        const result = parseRiveColor({ r: 255, g: 0, b: 0 } as RiveColor);
        expect(result).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      });

      it('should clamp values above 255', () => {
        const result = parseRiveColor({ r: 300, g: 400, b: 500, a: 600 });
        expect(result).toEqual({ r: 255, g: 255, b: 255, a: 255 });
      });

      it('should clamp values below 0', () => {
        const result = parseRiveColor({ r: -10, g: -20, b: -30, a: -40 });
        expect(result).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      });

      it('should handle floating point values', () => {
        const result = parseRiveColor({
          r: 255.7,
          g: 87.3,
          b: 51.9,
          a: 128.5,
        });
        expect(result).toEqual({ r: 255, g: 87, b: 52, a: 129 });
      });
    });

    describe('invalid inputs', () => {
      it('should throw on null', () => {
        expect(() => parseRiveColor(null as unknown as string)).toThrow(
          'Invalid color format',
        );
      });

      it('should throw on undefined', () => {
        expect(() => parseRiveColor(undefined as unknown as string)).toThrow(
          'Invalid color format',
        );
      });

      it('should throw on boolean', () => {
        expect(() => parseRiveColor(true as unknown as string)).toThrow(
          'Invalid color format',
        );
      });
    });
  });

  describe('riveColorToArgb', () => {
    it('should convert red to ARGB', () => {
      const result = riveColorToArgb({ r: 255, g: 0, b: 0, a: 255 });
      expect(result).toBe(0xffff0000);
    });

    it('should convert green to ARGB', () => {
      const result = riveColorToArgb({ r: 0, g: 255, b: 0, a: 255 });
      expect(result).toBe(0xff00ff00);
    });

    it('should convert blue to ARGB', () => {
      const result = riveColorToArgb({ r: 0, g: 0, b: 255, a: 255 });
      expect(result).toBe(0xff0000ff);
    });

    it('should convert transparent black to ARGB', () => {
      const result = riveColorToArgb({ r: 0, g: 0, b: 0, a: 0 });
      expect(result).toBe(0x00000000);
    });

    it('should convert semi-transparent color to ARGB', () => {
      const result = riveColorToArgb({ r: 255, g: 87, b: 51, a: 128 });
      expect(result).toBe(0x80ff5733);
    });

    it('should handle floating point values', () => {
      const result = riveColorToArgb({
        r: 255.7,
        g: 87.3,
        b: 51.9,
        a: 128.5,
      });
      expect(result).toBe(0x81ff5734);
    });

    it('should clamp values above 255', () => {
      const result = riveColorToArgb({ r: 300, g: 400, b: 500, a: 600 });
      expect(result).toBe(0xffffffff);
    });

    it('should clamp values below 0', () => {
      const result = riveColorToArgb({ r: -10, g: -20, b: -30, a: -40 });
      expect(result).toBe(0x00000000);
    });
  });

  describe('riveColorToHex', () => {
    it('should convert red to hex', () => {
      const result = riveColorToHex({ r: 255, g: 0, b: 0, a: 255 });
      expect(result).toBe('#FF0000FF');
    });

    it('should convert green to hex', () => {
      const result = riveColorToHex({ r: 0, g: 255, b: 0, a: 255 });
      expect(result).toBe('#00FF00FF');
    });

    it('should convert blue to hex', () => {
      const result = riveColorToHex({ r: 0, g: 0, b: 255, a: 255 });
      expect(result).toBe('#0000FFFF');
    });

    it('should convert transparent black to hex', () => {
      const result = riveColorToHex({ r: 0, g: 0, b: 0, a: 0 });
      expect(result).toBe('#00000000');
    });

    it('should convert semi-transparent color to hex', () => {
      const result = riveColorToHex({ r: 255, g: 87, b: 51, a: 128 });
      expect(result).toBe('#FF573380');
    });

    it('should pad single-digit hex values', () => {
      const result = riveColorToHex({ r: 1, g: 2, b: 3, a: 4 });
      expect(result).toBe('#01020304');
    });

    it('should handle floating point values', () => {
      const result = riveColorToHex({
        r: 255.7,
        g: 87.3,
        b: 51.9,
        a: 128.5,
      });
      expect(result).toBe('#FF573481');
    });

    it('should clamp values above 255', () => {
      const result = riveColorToHex({ r: 300, g: 400, b: 500, a: 600 });
      expect(result).toBe('#FFFFFFFF');
    });

    it('should clamp values below 0', () => {
      const result = riveColorToHex({ r: -10, g: -20, b: -30, a: -40 });
      expect(result).toBe('#00000000');
    });
  });

  describe('round-trip conversions', () => {
    it('should round-trip hex -> RiveColor -> hex', () => {
      const original = '#FF5733AA';
      const parsed = parseRiveColor(original);
      const converted = riveColorToHex(parsed);
      expect(converted).toBe(original);
    });

    it('should round-trip ARGB -> RiveColor -> ARGB', () => {
      const original = 0x80ff5733;
      const parsed = parseRiveColor(original);
      const converted = riveColorToArgb(parsed);
      expect(converted).toBe(original);
    });

    it('should round-trip RiveColor -> hex -> RiveColor', () => {
      const original: RiveColor = { r: 255, g: 87, b: 51, a: 128 };
      const hex = riveColorToHex(original);
      const parsed = parseRiveColor(hex);
      expect(parsed).toEqual(original);
    });

    it('should round-trip RiveColor -> ARGB -> RiveColor', () => {
      const original: RiveColor = { r: 255, g: 87, b: 51, a: 128 };
      const argb = riveColorToArgb(original);
      const parsed = parseRiveColor(argb);
      expect(parsed).toEqual(original);
    });
  });
});
