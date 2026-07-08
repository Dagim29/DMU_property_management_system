/**
 * Currency Utility Functions for Ethiopian Birr (ETB)
 * 
 * This module provides standardized currency formatting functions
 * for displaying Ethiopian Birr throughout the application.
 */

/**
 * Format a number as Ethiopian Birr currency
 * @param {number|string} amount - The amount to format
 * @param {boolean} includeDecimals - Whether to include decimal places (default: true)
 * @returns {string} Formatted currency string (e.g., "ETB 1,234.56")
 */
export const formatETB = (amount, includeDecimals = true) => {
  const numAmount = parseFloat(amount) || 0
  
  if (includeDecimals) {
    return `ETB ${numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }
  
  return `ETB ${Math.round(numAmount).toLocaleString('en-US')}`
}

/**
 * Format a number as Ethiopian Birr with Amharic symbol (ብር)
 * @param {number|string} amount - The amount to format
 * @param {boolean} includeDecimals - Whether to include decimal places (default: true)
 * @returns {string} Formatted currency string (e.g., "ብር 1,234.56")
 */
export const formatBirr = (amount, includeDecimals = true) => {
  const numAmount = parseFloat(amount) || 0
  
  if (includeDecimals) {
    return `ብር ${numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }
  
  return `ብር ${Math.round(numAmount).toLocaleString('en-US')}`
}

/**
 * Format a number as compact Ethiopian Birr (e.g., "ETB 1.2K", "ETB 3.5M")
 * @param {number|string} amount - The amount to format
 * @returns {string} Compact formatted currency string
 */
export const formatETBCompact = (amount) => {
  const numAmount = parseFloat(amount) || 0
  
  if (numAmount >= 1000000) {
    return `ETB ${(numAmount / 1000000).toFixed(1)}M`
  } else if (numAmount >= 1000) {
    return `ETB ${(numAmount / 1000).toFixed(1)}K`
  }
  
  return `ETB ${numAmount.toFixed(0)}`
}

/**
 * Parse a currency string to a number
 * @param {string} currencyString - Currency string to parse (e.g., "ETB 1,234.56" or "ብር 1,234.56")
 * @returns {number} Parsed number value
 */
export const parseETB = (currencyString) => {
  if (typeof currencyString === 'number') return currencyString
  
  // Remove currency symbols and commas, then parse
  const cleaned = String(currencyString)
    .replace(/ETB|ብር/g, '')
    .replace(/,/g, '')
    .trim()
  
  return parseFloat(cleaned) || 0
}

/**
 * Currency symbol constants
 */
export const CURRENCY = {
  CODE: 'ETB',
  SYMBOL: 'ብር',
  NAME: 'Ethiopian Birr',
  NAME_PLURAL: 'Ethiopian Birr'
}

export default {
  formatETB,
  formatBirr,
  formatETBCompact,
  parseETB,
  CURRENCY
}
