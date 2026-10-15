/// <reference path="../../types/global.d.ts" />
// Exports: ES named exports (emitted onto the original `exports` object). Members that were assigned
// directly to module.exports and reached via module-level `this` use `export const`, whose references
// TS emits as `exports.x` (same routing); members with a local binding use `export { x }`.
import Path = require('path')
import uuid = require('uuid')
import Logger = require('../Logger')
import xml2js = require('xml2js')
import areEquivalent = require('./areEquivalent')
import type { Request } from 'express'

const { parseString } = xml2js

const levenshteinDistance = (str1: string, str2: string, caseSensitive = false): number => {
  str1 = String(str1)
  str2 = String(str2)
  if (!caseSensitive) {
    str1 = str1.toLowerCase()
    str2 = str2.toLowerCase()
  }
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array<number | null>(str1.length + 1).fill(null))
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j
  }
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      // Every cell read here was filled by the loops above (row 0, column 0, then left/up neighbours)
      track[j][i] = Math.min(
        (track[j][i - 1] as number) + 1, // deletion
        (track[j - 1][i] as number) + 1, // insertion
        (track[j - 1][i - 1] as number) + indicator // substitution
      )
    }
  }
  return track[str2.length][str1.length] as number
}
export { levenshteinDistance }

const levenshteinSimilarity = (str1: string, str2: string, caseSensitive = false): number => {
  const distance = levenshteinDistance(str1, str2, caseSensitive)
  const maxLength = Math.max(str1.length, str2.length)
  if (maxLength === 0) return 1
  return 1 - distance / maxLength
}
export { levenshteinSimilarity }

export const isObject = (val: unknown): val is object => {
  return val !== null && typeof val === 'object'
}

export const comparePaths = (path1: string, path2: string): boolean => {
  return path1 === path2 || Path.normalize(path1) === Path.normalize(path2)
}

export const isNullOrNaN = (num: unknown): boolean => {
  // isNaN() coerces its argument to a number (ToNumber); that coercion is the intended check
  return num === null || isNaN(num as number)
}

/**
 */
export const clampPositiveInt = (value: number | null | undefined, max: number): number | null => {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return Math.min(Math.floor(value), max)
}

/** Resolves to the xml2js result object, or null if parsing fails */
const xmlToJSON = (xml: string): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    parseString(xml, (err, results) => {
      if (err) {
        Logger.error(`[xmlToJSON] Error`, err)
        resolve(null)
      } else {
        resolve(results)
      }
    })
  })
}
export { xmlToJSON }

export const getId = (prepend = ''): string => {
  var _id = Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8)
  if (prepend) return prepend + '_' + _id
  return _id
}

function elapsedPretty(seconds: number): string {
  if (seconds > 0 && seconds < 1) {
    return `${Math.floor(seconds * 1000)} ms`
  }
  if (seconds < 60) {
    return `${Math.floor(seconds)} sec`
  }
  let minutes = Math.floor(seconds / 60)
  if (minutes < 70) {
    return `${minutes} min`
  }
  let hours = Math.floor(minutes / 60)
  minutes -= hours * 60

  let days = Math.floor(hours / 24)
  hours -= days * 24

  const timeParts = []
  if (days) {
    timeParts.push(`${days} d`)
  }
  if (hours || (days && minutes)) {
    timeParts.push(`${hours} hr`)
  }
  if (minutes) {
    timeParts.push(`${minutes} min`)
  }
  return timeParts.join(' ')
}
export { elapsedPretty }

function secondsToTimestamp(seconds: number, includeMs = false, alwaysIncludeHours = false): string {
  var _seconds = seconds
  var _minutes = Math.floor(seconds / 60)
  _seconds -= _minutes * 60
  var _hours = Math.floor(_minutes / 60)
  _minutes -= _hours * 60

  var ms = _seconds - Math.floor(seconds)
  _seconds = Math.floor(_seconds)

  const msString = includeMs ? '.' + ms.toFixed(3).split('.')[1] : ''
  if (alwaysIncludeHours) {
    return `${_hours.toString().padStart(2, '0')}:${_minutes.toString().padStart(2, '0')}:${_seconds.toString().padStart(2, '0')}${msString}`
  }
  if (!_hours) {
    return `${_minutes}:${_seconds.toString().padStart(2, '0')}${msString}`
  }
  return `${_hours}:${_minutes.toString().padStart(2, '0')}:${_seconds.toString().padStart(2, '0')}${msString}`
}
export { secondsToTimestamp }

export const reqSupportsWebp = (req: Pick<Request, 'headers'> | null | undefined): boolean => {
  if (!req || !req.headers || !req.headers.accept) return false
  return req.headers.accept.includes('image/webp') || req.headers.accept === '*/*'
}

export { areEquivalent }

/** Deep copy of plain data; undefined and "" become null */
export const copyValue = (val: unknown): unknown => {
  if (val === undefined || val === '') return null
  else if (!val) return val

  if (!isObject(val)) return val

  if (Array.isArray(val)) {
    return val.map(copyValue)
  } else {
    var final: Record<string, unknown> = {}
    for (const key in val) {
      final[key] = copyValue((val as Record<string, unknown>)[key])
    }
    return final
  }
}

export const toNumber = (val: unknown, fallback = 0): number => {
  // isNaN() coerces its argument to a number (ToNumber); that coercion is the intended check
  if (isNaN(val as number) || val === null) return fallback
  return Number(val)
}

export const cleanStringForSearch = (str: string | null | undefined): string => {
  if (!str) return ''
  // Remove ' . ` " ,
  return str
    .toLowerCase()
    .replace(/[\'\.\`\",]/g, '')
    .trim()
}

const getTitleParts = (title: string | null | undefined): [string, string | null] => {
  if (!title) return ['', null]
  const prefixesToIgnore: string[] = global.ServerSettings.sortingPrefixes || []
  for (const prefix of prefixesToIgnore) {
    // e.g. for prefix "the". If title is "The Book" return "Book, The"
    if (title.toLowerCase().startsWith(`${prefix} `)) {
      return [title.substr(prefix.length + 1), `${prefix.substr(0, 1).toUpperCase() + prefix.substr(1)}`]
    }
  }
  return [title, null]
}

/**
 * Remove sortingPrefixes from title
 * @example "The Good Book" => "Good Book"
 */
export const getTitleIgnorePrefix = (title: string | null | undefined): string => {
  return getTitleParts(title)[0]
}

/**
 * Put sorting prefix at the end of title
 * @example "The Good Book" => "Good Book, The"
 */
export const getTitlePrefixAtEnd = (title: string): string => {
  let [sort, prefix] = getTitleParts(title)
  return prefix ? `${sort}, ${prefix}` : title
}

/**
 * Escape string used in RegExp
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
 *
 */
export const escapeRegExp = (str: unknown): string => {
  if (typeof str !== 'string') return ''
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Validate url string with URL class
 *
 * @returns null if invalid
 */
export const validateUrl = (rawUrl: unknown): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  try {
    return new URL(rawUrl).toString()
  } catch (error) {
    Logger.error(`Invalid URL "${rawUrl}"`, error)
    return null
  }
}

/**
 * Check if a string is a valid UUID
 *
 */
export const isUUID = (str: unknown): boolean => {
  if (!str || typeof str !== 'string') return false
  return uuid.validate(str)
}

/**
 * Check if a string is a valid ASIN
 *
 */
export const isValidASIN = (str: unknown): boolean => {
  if (!str || typeof str !== 'string') return false
  return /^[A-Z0-9]{10}$/.test(str)
}

/**
 * Convert timestamp to seconds
 * @example "01:00:00" => 3600
 * @example "01:00" => 60
 * @example "01" => 1
 *
 * @returns null if not a valid timestamp
 */
export const timestampToSeconds = (timestamp: unknown): number | null => {
  if (typeof timestamp !== 'string') {
    return null
  }
  const parts = timestamp.split(':').map(Number)
  if (parts.some(isNaN)) {
    return null
  } else if (parts.length === 1) {
    return parts[0]
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return null
}

class ValidationError extends Error {
  paramName: string
  status: number

  constructor(paramName: string, message: string, status = 400) {
    super(`Query parameter "${paramName}" ${message}`)
    this.name = 'ValidationError'
    this.paramName = paramName
    this.status = status
  }
}
export { ValidationError }

class NotFoundError extends Error {
  status: number

  constructor(message: string, status = 404) {
    super(message)
    this.name = 'NotFoundError'
    this.status = status
  }
}
export { NotFoundError }

/**
 * Safely extracts a query parameter as a string, rejecting arrays to prevent type confusion
 * Express query parameters can be arrays if the same parameter appears multiple times
 * @example ?author=Smith => "Smith"
 * @example ?author=Smith&author=Jones => throws error
 *
 * @param query - Query object
 * @param paramName - Parameter name
 * @param defaultValue - Default value if undefined/null
 * @param required - Whether the parameter is required
 * @param maxLength - Optional maximum length (defaults to 10000 to prevent ReDoS attacks)
 * @returns String value
 * @throws {ValidationError} If value is an array
 * @throws {ValidationError} If value is too long
 * @throws {ValidationError} If value is required but not provided
 */
export const getQueryParamAsString = (query: Record<string, unknown>, paramName: string, defaultValue = '', required = false, maxLength = 1000): string => {
  const value = query[paramName]
  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(paramName, 'is required')
    }
    return defaultValue
  }
  // Explicitly reject arrays to prevent type confusion
  if (Array.isArray(value)) {
    throw new ValidationError(paramName, 'is an array')
  }
  // Reject excessively long strings to prevent ReDoS attacks
  if (typeof value === 'string' && value.length > maxLength) {
    throw new ValidationError(paramName, 'is too long')
  }
  return String(value)
}
