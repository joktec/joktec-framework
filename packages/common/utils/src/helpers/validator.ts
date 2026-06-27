import { isDateString, isJSON } from 'class-validator';

export function isClass(variable: any): boolean {
  if (typeof variable !== 'function') return false;
  try {
    variable();
    return false;
  } catch (error) {
    return /^Class constructor/.test(error.message);
  }
}

/** Check whether a string is a JSON object/array payload before parsing it. */
export function isJsonObjectString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  return (normalized.startsWith('{') || normalized.startsWith('[')) && isJSON(normalized);
}

const DEFAULT_DATE_OPERATORS = new Set(['$eq', '$gt', '$gte', '$lt', '$lte']);
const DEFAULT_DATE_KEY_PATTERN = /(^date$|date$|at$)/i;

/**
 * Controls when a date-like string should be treated as an application Date.
 */
export type DateStringCastMode = boolean | 'operator-only' | 'date-key-only' | 'operator-and-date-key';

/** Context used by date casting guards to inspect operator and field path. */
export interface DateStringCastContext {
  key?: string;
  path?: string[];
  operators?: Set<string> | string[];
  dateKeyPattern?: RegExp;
}

/**
 * Decide whether a string date should be promoted to a Date instance.
 *
 * This helper intentionally requires either an operator or a date-like field
 * name unless the caller explicitly passes `true`, preventing generic string
 * fields such as codes/slugs from becoming Date values.
 */
export function isDateStringCastable(
  value: unknown,
  mode: DateStringCastMode,
  context: DateStringCastContext = {},
): value is string {
  if (mode === false || typeof value !== 'string' || !isDateString(value)) return false;
  if (mode === true) return true;

  const operators =
    context.operators instanceof Set ? context.operators : new Set(context.operators || DEFAULT_DATE_OPERATORS);
  const path = context.path || [];
  const fieldKey = path
    .slice()
    .reverse()
    .find(key => !key.startsWith('$'));
  const byOperator = !!context.key && operators.has(context.key);
  const byDateKey = !!fieldKey && (context.dateKeyPattern || DEFAULT_DATE_KEY_PATTERN).test(fieldKey);

  if (mode === 'operator-only') return byOperator;
  if (mode === 'date-key-only') return byDateKey;
  return byOperator || byDateKey;
}
