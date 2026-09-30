import type { TransactionInput } from './types'

export type ValidationErrors = Partial<Record<keyof TransactionInput, string>>

export function validateTransactionInput(input: TransactionInput): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.amount = 'Enter an amount greater than 0.'
  } else if (input.amount > 10_000_000) {
    errors.amount = 'Enter an amount below 10,000,000.'
  }

  if (!input.merchant_category.trim()) {
    errors.merchant_category = 'Select a merchant category.'
  }

  if (!input.location.trim()) {
    errors.location = 'Enter the transaction location.'
  }

  if (!input.device_type.trim()) {
    errors.device_type = 'Select a device type.'
  }

  if (!Number.isInteger(input.user_age) || input.user_age < 18 || input.user_age > 120) {
    errors.user_age = 'User age must be a whole number from 18 to 120.'
  }

  if (!Number.isInteger(input.account_age_days) || input.account_age_days < 0 || input.account_age_days > 50 * 365) {
    errors.account_age_days = 'Account age must be between 0 and 18,250 days.'
  }

  if (!input.timestamp || Number.isNaN(Date.parse(input.timestamp))) {
    errors.timestamp = 'Enter a valid transaction date and time.'
  }

  if (typeof input.is_foreign_transaction !== 'boolean') {
    errors.is_foreign_transaction = 'Choose whether this is a foreign transaction.'
  }

  return errors
}
