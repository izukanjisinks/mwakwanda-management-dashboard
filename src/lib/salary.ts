// Allowance percentages (proportion of base salary)
const HOUSING_ALLOWANCE_PCT = 0.20
const TRANSPORT_ALLOWANCE_PCT = 0.10
const MEDICAL_ALLOWANCE_PCT = 0.08

export interface SalaryBreakdown {
  baseSalary: number
  housingAllowance: number
  transportAllowance: number
  medicalAllowance: number
  grossSalary: number
  incomeTax: number
  netSalary: number
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

/**
 * Computes income tax using progressive PAYE brackets:
 *   Band 1: 0 – 4,800       → 0%
 *   Band 2: 4,801 – 6,800   → 20%
 *   Band 3: 6,801+           → 30%
 */
export function calculatePAYE(grossIncome: number): number {
  let tax: number
  if (grossIncome <= 4800) {
    tax = 0
  } else if (grossIncome <= 6800) {
    tax = (grossIncome - 4800) * 0.20
  } else {
    tax = (2000 * 0.20) + (grossIncome - 6800) * 0.30
  }
  return round2(tax)
}

/**
 * Calculates all salary components from a base salary.
 * Mirrors the backend Go utility exactly.
 */
export function calculateSalaryBreakdown(baseSalary: number): SalaryBreakdown {
  const housing = round2(baseSalary * HOUSING_ALLOWANCE_PCT)
  const transport = round2(baseSalary * TRANSPORT_ALLOWANCE_PCT)
  const medical = round2(baseSalary * MEDICAL_ALLOWANCE_PCT)
  const gross = baseSalary + housing + transport + medical
  const tax = calculatePAYE(gross)

  return {
    baseSalary,
    housingAllowance: housing,
    transportAllowance: transport,
    medicalAllowance: medical,
    grossSalary: gross,
    incomeTax: tax,
    netSalary: round2(gross - tax),
  }
}
