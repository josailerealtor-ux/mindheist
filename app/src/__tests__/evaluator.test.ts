import { evaluate } from '../engine/evaluator';

describe('evaluator — logic', () => {
  const solution = { values: { A: true, B: false } };

  it('returns correct when all variables match', () => {
    expect(evaluate('logic', { values: { A: true, B: false } }, solution).correct).toBe(true);
  });

  it('returns incorrect when a variable is wrong', () => {
    const result = evaluate('logic', { values: { A: true, B: true } }, solution);
    expect(result.correct).toBe(false);
    expect(result.hint).toBeDefined();
  });

  it('returns incorrect when variables are missing', () => {
    const result = evaluate('logic', { values: { A: true } }, solution);
    expect(result.correct).toBe(false);
  });
});

describe('evaluator — sequence', () => {
  const solution = { order: ['c', 'a', 'b'] };

  it('returns correct for exact order', () => {
    expect(evaluate('sequence', { order: ['c', 'a', 'b'] }, solution).correct).toBe(true);
  });

  it('returns incorrect for wrong order', () => {
    expect(evaluate('sequence', { order: ['a', 'b', 'c'] }, solution).correct).toBe(false);
  });

  it('returns incorrect for wrong length', () => {
    expect(evaluate('sequence', { order: ['c', 'a'] }, solution).correct).toBe(false);
  });
});

describe('evaluator — cipher', () => {
  const solution = { plaintext: 'hello world' };

  it('returns correct for exact match', () => {
    expect(evaluate('cipher', { plaintext: 'hello world' }, solution).correct).toBe(true);
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(evaluate('cipher', { plaintext: '  Hello World  ' }, solution).correct).toBe(true);
  });

  it('returns incorrect for wrong answer', () => {
    expect(evaluate('cipher', { plaintext: 'goodbye' }, solution).correct).toBe(false);
  });
});

describe('evaluator — pattern', () => {
  const solution = { answer: 16 };

  it('returns correct for exact numeric answer', () => {
    expect(evaluate('pattern', { answer: 16 }, solution).correct).toBe(true);
  });

  it('returns correct for string "16" matching number 16', () => {
    expect(evaluate('pattern', { answer: '16' }, solution).correct).toBe(true);
  });

  it('returns incorrect for wrong answer', () => {
    expect(evaluate('pattern', { answer: 32 }, solution).correct).toBe(false);
  });
});

describe('evaluator — timing', () => {
  const solution = { targetMs: 3000, windowMs: 500 };

  it('returns correct when within window', () => {
    expect(evaluate('timing', { elapsedMs: 3200 }, solution).correct).toBe(true);
  });

  it('returns correct at exact target', () => {
    expect(evaluate('timing', { elapsedMs: 3000 }, solution).correct).toBe(true);
  });

  it('returns incorrect when outside window', () => {
    const result = evaluate('timing', { elapsedMs: 4000 }, solution);
    expect(result.correct).toBe(false);
    expect(result.hint).toContain('ms');
  });
});
