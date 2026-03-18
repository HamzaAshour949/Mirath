import type { Fraction } from './types'

export function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b !== 0) {
    const t = b
    b = a % b
    a = t
  }
  return a
}

export function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b
}

export function reduce(f: Fraction): Fraction {
  if (f.numerator === 0) return { numerator: 0, denominator: 1 }
  const g = gcd(Math.abs(f.numerator), Math.abs(f.denominator))
  return { numerator: f.numerator / g, denominator: f.denominator / g }
}

export function add(a: Fraction, b: Fraction): Fraction {
  const d = lcm(a.denominator, b.denominator)
  return reduce({
    numerator: a.numerator * (d / a.denominator) + b.numerator * (d / b.denominator),
    denominator: d,
  })
}

export function multiply(a: Fraction, scalar: number): Fraction {
  return reduce({ numerator: a.numerator * scalar, denominator: a.denominator })
}

export function divide(a: Fraction, b: Fraction): Fraction {
  return reduce({ numerator: a.numerator * b.denominator, denominator: a.denominator * b.numerator })
}

export function toDecimal(f: Fraction): number {
  return f.numerator / f.denominator
}

/** Returns negative if a < b, 0 if equal, positive if a > b */
export function compare(a: Fraction, b: Fraction): number {
  return a.numerator * b.denominator - b.numerator * a.denominator
}

export function fractionOf(estate: number, f: Fraction): number {
  return (estate * f.numerator) / f.denominator
}

export const ZERO: Fraction = { numerator: 0, denominator: 1 }
export const ONE: Fraction = { numerator: 1, denominator: 1 }
export const HALF: Fraction = { numerator: 1, denominator: 2 }
export const THIRD: Fraction = { numerator: 1, denominator: 3 }
export const QUARTER: Fraction = { numerator: 1, denominator: 4 }
export const SIXTH: Fraction = { numerator: 1, denominator: 6 }
export const EIGHTH: Fraction = { numerator: 1, denominator: 8 }
export const TWO_THIRDS: Fraction = { numerator: 2, denominator: 3 }
