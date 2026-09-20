#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parseDocument } from 'yaml';

const root = process.cwd();
const shaRef = /^[0-9a-f]{40}$/;
const digestRef = /^sha256:[0-9a-f]{64}$/;
const localComposeImage = /^cvg-his-v[24]-/;
const opaqueStaticHash = Symbol('opaque-static-hash');
const opaqueStaticString = Symbol('opaque-static-string');
const filteredStaticArray = Symbol('filtered-static-array');
const constructorStaticToken = Symbol('constructor-static-token');
const constructorStaticValue = Symbol('constructor-static-value');
const constructorStaticUndefined = Symbol('constructor-static-undefined');
const githubStaticUndefined = Symbol('github-static-undefined');
const githubInvalidStaticJson = Symbol('github-invalid-static-json');
const githubConstructorNamePattern = /^[\p{L}\p{Nd}]+$/u;
const staticDigest = /^[0-9a-f]{64}$/i;
const githubJsonMaxIntegerDigits = 380;
const githubJsonMaxInt64 = 9223372036854775807n;
const githubJsonMaxUInt64 = 18446744073709551615n;
const githubJsonInt64Modulus = 18446744073709551616n;

let trackedCheckoutFilesCache;

function isOpaqueStaticHash(value) {
  return Boolean(value && typeof value === 'object' && value[opaqueStaticHash] === true);
}

function createOpaqueStaticHash() {
  return { [opaqueStaticHash]: true };
}

function isOpaqueStaticString(value) {
  return Boolean(value && typeof value === 'object' && value[opaqueStaticString] === true);
}

function createOpaqueStaticString() {
  return { [opaqueStaticString]: true };
}

function isOpaqueStaticText(value) {
  return isOpaqueStaticHash(value) || isOpaqueStaticString(value);
}

function createFilteredStaticArray(values) {
  const result = [...values];
  Object.defineProperty(result, filteredStaticArray, { value: true });
  return result;
}

function isFilteredStaticArray(value) {
  return Array.isArray(value) && value[filteredStaticArray] === true;
}

function createConstructorStaticToken(value) {
  return { [constructorStaticToken]: value };
}

function isConstructorStaticToken(value) {
  return Boolean(value && typeof value === 'object' && value[constructorStaticToken]);
}

function createConstructorStaticValue(value) {
  return { [constructorStaticValue]: value };
}

function isConstructorStaticValue(value) {
  return Boolean(value && typeof value === 'object' && value[constructorStaticValue] !== undefined);
}

function createConstructorStaticUndefined() {
  return { [constructorStaticUndefined]: true };
}

function isConstructorStaticUndefined(value) {
  return Boolean(value && typeof value === 'object' && value[constructorStaticUndefined] === true);
}

function createGithubStaticUndefined() {
  return { [githubStaticUndefined]: true };
}

function isGithubStaticUndefined(value) {
  return Boolean(value && typeof value === 'object' && value[githubStaticUndefined] === true);
}

function createGithubInvalidStaticJson() {
  return { [githubInvalidStaticJson]: true };
}

function isGithubInvalidStaticJson(value) {
  return Boolean(value && typeof value === 'object' && value[githubInvalidStaticJson] === true);
}

function isGithubConstructorName(value) {
  return githubConstructorNamePattern.test(value) && !/[\uD800-\uDFFF]/.test(value);
}

function githubNumberString(value) {
  if (Number.isNaN(value)) return 'NaN';
  if (value === Number.POSITIVE_INFINITY) return 'Infinity';
  if (value === Number.NEGATIVE_INFINITY) return '-Infinity';
  if (Object.is(value, -0) || value === 0) return '0';
  const negative = value < 0;
  const precise = Math.abs(value).toPrecision(15);
  const [rawMantissa, rawExponent = '0'] = precise.split(/[eE]/);
  const decimalIndex = rawMantissa.indexOf('.') < 0 ? rawMantissa.length : rawMantissa.indexOf('.');
  const digits = rawMantissa.replace('.', '');
  const firstSignificant = digits.search(/[1-9]/);
  if (firstSignificant < 0) return '0';
  const significantDigits = digits.slice(firstSignificant);
  const scientificExponent =
    Number(rawExponent) + decimalIndex - firstSignificant - 1;
  const sign = negative ? '-' : '';

  if (scientificExponent >= -4 && scientificExponent < 15) {
    const decimalPosition = scientificExponent + 1;
    let integer;
    let fraction;
    if (decimalPosition <= 0) {
      integer = '0';
      fraction = `${'0'.repeat(-decimalPosition)}${significantDigits}`;
    } else if (decimalPosition >= significantDigits.length) {
      integer = `${significantDigits}${'0'.repeat(decimalPosition - significantDigits.length)}`;
      fraction = '';
    } else {
      integer = significantDigits.slice(0, decimalPosition);
      fraction = significantDigits.slice(decimalPosition);
    }
    fraction = fraction.replace(/0+$/, '');
    return `${sign}${integer}${fraction ? `.${fraction}` : ''}`;
  }

  let scientificMantissa = significantDigits[0];
  const scientificFraction = significantDigits.slice(1).replace(/0+$/, '');
  if (scientificFraction) scientificMantissa += `.${scientificFraction}`;
  const exponentSign = scientificExponent >= 0 ? '+' : '-';
  const exponentDigits = String(Math.abs(scientificExponent)).padStart(2, '0');
  return `${sign}${scientificMantissa}E${exponentSign}${exponentDigits}`;
}

function isGithubPrimitive(value) {
  return isGithubStaticUndefined(value) || value === null || ['boolean', 'number', 'string'].includes(typeof value);
}

function lookupGithubObjectProperty(value, property) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { found: false, value: undefined };
  }
  if (Object.prototype.hasOwnProperty.call(value, property)) {
    return { found: true, value: value[property] };
  }
  const normalizedProperty = String(property).toLowerCase();
  const matchingKey = Object.keys(value).find(
    (key) => key.toLowerCase() === normalizedProperty
  );
  return matchingKey === undefined
    ? { found: false, value: undefined }
    : { found: true, value: value[matchingKey] };
}

function lookupCaseInsensitiveValue(values, key) {
  if (Object.prototype.hasOwnProperty.call(values, key)) {
    return { found: true, value: values[key] };
  }
  const normalizedKey = String(key).toLowerCase();
  const matchingKey = Object.keys(values).find(
    (candidate) => candidate.toLowerCase() === normalizedKey
  );
  return matchingKey === undefined
    ? { found: false, value: undefined }
    : { found: true, value: values[matchingKey] };
}

function githubExpressionValueString(value) {
  if (isGithubInvalidStaticJson(value)) throw new Error('invalid static JSON');
  if (isGithubStaticUndefined(value)) return '';
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return 'Array';
  if (typeof value === 'object') return 'Object';
  if (typeof value === 'number') return githubNumberString(value);
  return String(value);
}

function githubToJson(value, depth = 0) {
  if (isGithubInvalidStaticJson(value)) throw new Error('invalid static JSON');
  if (isGithubStaticUndefined(value)) return JSON.stringify('');
  const indentation = '  '.repeat(depth);
  const nestedIndentation = '  '.repeat(depth + 1);
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return githubNumberString(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((item) => `${nestedIndentation}${githubToJson(item, depth + 1)}`);
    return `[\n${items.join(',\n')}\n${indentation}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    const members = entries.map(
      ([key, item]) => `${nestedIndentation}${JSON.stringify(key)}: ${githubToJson(item, depth + 1)}`
    );
    return `{\n${members.join(',\n')}\n${indentation}}`;
  }
  return 'null';
}

function decodeGithubJsonString(value) {
  let result = '';
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== '\\' || index + 1 >= value.length) {
      result += value[index];
      continue;
    }
    const escape = value[index + 1];
    index += 1;
    const escapedCharacters = {
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t'
    };
    if (Object.prototype.hasOwnProperty.call(escapedCharacters, escape)) {
      result += escapedCharacters[escape];
      continue;
    }
    if (escape === 'u' && /^[0-9a-fA-F]{4}/.test(value.slice(index + 1, index + 5))) {
      result += String.fromCharCode(Number.parseInt(value.slice(index + 1, index + 5), 16));
      index += 4;
      continue;
    }
    if (escape === '\\' || escape === '/' || escape === '"' || escape === "'") {
      result += escape;
      continue;
    }
    throw new Error('invalid JSON string escape');
  }
  return result;
}

function replaceGithubUnpairedSurrogates(value) {
  let result = '';
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        result += value[index] + value[index + 1];
        index += 1;
      } else {
        result += '\uFFFD';
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      result += '\uFFFD';
    } else {
      result += value[index];
    }
  }
  return result;
}

function isGithubJsonWhitespace(character) {
  if (!character || character.length !== 1) return false;
  const code = character.charCodeAt(0);
  return (
    (code >= 0x0009 && code <= 0x000d) ||
    code === 0x0020 ||
    code === 0x0085 ||
    code === 0x00a0 ||
    code === 0x1680 ||
    (code >= 0x2000 && code <= 0x200a) ||
    code === 0x2028 ||
    code === 0x2029 ||
    code === 0x202f ||
    code === 0x205f ||
    code === 0x3000
  );
}

function trimGithubJsonWhitespace(value) {
  let start = 0;
  let end = value.length;
  while (start < end && isGithubJsonWhitespace(value[start])) start += 1;
  while (end > start && isGithubJsonWhitespace(value[end - 1])) end -= 1;
  return value.slice(start, end);
}

function stripGithubJsonComments(source) {
  let result = '';
  let quote = null;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      result += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      result += character;
      continue;
    }
    if (character === '/' && source[index + 1] === '/') {
      index += 2;
      while (index < source.length && source[index] !== '\n' && source[index] !== '\r') index += 1;
      result += '';
      index -= 1;
      continue;
    }
    if (character === '/' && source[index + 1] === '*') {
      index += 2;
      while (
        index + 1 < source.length &&
        !(source[index] === '*' && source[index + 1] === '/')
      ) {
        index += 1;
      }
      index += 1;
      result += '';
      continue;
    }
    result += character;
  }
  return result;
}

function githubJsonNetDoubleString(value) {
  if (!Number.isFinite(value)) return JSON.stringify(githubNumberString(value));
  if (Object.is(value, -0)) return '-0.0';
  const exponential = value.toExponential();
  const match = exponential.match(/^([+-]?\d(?:\.\d+)?)e([+-]?)(\d+)$/i);
  if (!match) return String(value);
  const sign = match[1].startsWith('-') ? '-' : '';
  const mantissa = match[1].replace(/^[+-]/, '');
  const exponent = Number(`${match[2] || '+'}${match[3]}`);
  const digits = mantissa.replace('.', '');
  const decimalPosition = 1 + exponent;
  let formatted;
  if (exponent >= -4 && exponent < 15) {
    if (decimalPosition <= 0) {
      formatted = `${sign}0.${'0'.repeat(-decimalPosition)}${digits}`;
    } else if (decimalPosition >= digits.length) {
      formatted = `${sign}${digits}${'0'.repeat(decimalPosition - digits.length)}`;
    } else {
      formatted = `${sign}${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`;
    }
  } else {
    formatted = `${sign}${mantissa}E${match[2] || '+'}${match[3].padStart(2, '0')}`;
  }
  if (!/[.eE]/.test(formatted)) formatted += '.0';
  return formatted;
}

function githubJsonNetNumberString(literal) {
  validateGithubJsonNumericLiteral(literal);
  const isDouble = /[.eE]/.test(literal);
  if (isDouble) return githubJsonNetDoubleString(Number(literal));
  const negative = literal.startsWith('-');
  const signed = /^[+-]/.test(literal);
  const unsigned = signed ? literal.slice(1) : literal;
  if (/^0[bBoO]/.test(unsigned) || /^[+-]0[xX]/.test(literal)) {
    throw new Error('non-decimal JSON numbers are not supported');
  }
  if (!signed && /^0[89]/.test(unsigned)) {
    throw new Error('invalid legacy octal JSON number');
  }
  try {
    let integer;
    if (/^0[xX]/.test(unsigned)) integer = githubJsonSignedInt64(BigInt(unsigned));
    else if (!signed && /^0[0-7]+$/.test(unsigned)) {
      integer = githubJsonSignedInt64(BigInt(`0o${unsigned.replace(/^0[oO]?/, '') || '0'}`));
    } else if (/^\d+$/.test(unsigned)) integer = BigInt(unsigned);
    else return githubJsonNetDoubleString(Number(literal));
    return integer === 0n ? '0' : `${negative ? '-' : ''}${integer}`;
  } catch {
    return githubJsonNetDoubleString(parseGithubJsonNumericLiteral(literal));
  }
}

function validateGithubJsonNumericLiteral(literal) {
  const unsigned = literal.startsWith('-') ? literal.slice(1) : literal;
  if (/^-?\d+$/.test(literal) && literal.length > githubJsonMaxIntegerDigits) {
    const isLegacyOctal = !literal.startsWith('-') && /^0[0-7]+$/.test(unsigned);
    if (!isLegacyOctal) {
      const magnitude = BigInt(unsigned);
      const int64Limit = literal.startsWith('-')
        ? githubJsonMaxInt64 + 1n
        : githubJsonMaxInt64;
      if (magnitude > int64Limit) {
        throw new Error('JSON integer exceeds reader precision limit');
      }
    }
  }
  if (!literal.startsWith('-') && /^0\d/.test(unsigned) && /[.eE]/.test(literal)) {
    throw new Error('invalid legacy octal JSON number');
  }
  if (
    !literal.startsWith('-') &&
    /^0\d/.test(unsigned) &&
    /^\d+$/.test(unsigned) &&
    !/^0[0-7]+$/.test(unsigned)
  ) {
    throw new Error('invalid legacy octal JSON number');
  }
  if (/^0[xX][0-9a-fA-F]+$/.test(unsigned)) {
    if (BigInt(unsigned) > githubJsonMaxUInt64) {
      throw new Error('JSON integer exceeds Int64 range');
    }
  }
  if (/^0[oO][0-7]+$/.test(unsigned)) {
    if (BigInt(unsigned) > githubJsonMaxUInt64) {
      throw new Error('JSON integer exceeds Int64 range');
    }
  }
  if (/^0[0-7]+$/.test(unsigned) && unsigned.length > 1) {
    const legacyOctal = BigInt(`0o${unsigned.slice(1)}`);
    if (legacyOctal > githubJsonMaxUInt64) {
      throw new Error('JSON integer exceeds Int64 range');
    }
  }
}

function githubJsonSignedInt64(value) {
  if (value > githubJsonMaxUInt64) throw new Error('JSON integer exceeds Int64 range');
  return value > githubJsonMaxInt64 ? value - githubJsonInt64Modulus : value;
}

function matchingGithubConstructorParen(source, opening) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = opening; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '(') depth += 1;
    else if (character === ')' && --depth === 0) return index;
  }
  return -1;
}

function splitGithubConstructorArguments(source) {
  if (trimGithubJsonWhitespace(source) === '') return [];
  const argumentsList = [];
  let start = 0;
  let parentheses = 0;
  let brackets = 0;
  let braces = 0;
  let quote = null;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '(') parentheses += 1;
    else if (character === ')') parentheses -= 1;
    else if (character === '[') brackets += 1;
    else if (character === ']') brackets -= 1;
    else if (character === '{') braces += 1;
    else if (character === '}') braces -= 1;
    else if (character === ',' && parentheses === 0 && brackets === 0 && braces === 0) {
      argumentsList.push(source.slice(start, index));
      start = index + 1;
    }
  }
  argumentsList.push(source.slice(start));
  return argumentsList;
}

function readGithubConstructorHeader(value) {
  const source = trimGithubJsonWhitespace(value);
  if (!source.startsWith('new')) return null;
  let cursor = 3;
  const whitespaceStart = cursor;
  while (cursor < source.length && isGithubJsonWhitespace(source[cursor])) cursor += 1;
  if (cursor === whitespaceStart) return null;
  const nameStart = cursor;
  while (
    cursor < source.length &&
    /^[\p{L}\p{Nd}]$/u.test(source[cursor]) &&
    !/[\uD800-\uDFFF]/.test(source[cursor])
  ) {
    cursor += 1;
  }
  const name = source.slice(nameStart, cursor);
  if (!name || !isGithubConstructorName(name)) return null;
  while (cursor < source.length && isGithubJsonWhitespace(source[cursor])) cursor += 1;
  if (source[cursor] !== '(') return null;
  return { source, name, opening: cursor };
}

function indentGithubConstructorText(value, depth) {
  const indentation = '  '.repeat(depth);
  return value.replace(/\n/g, `\n${indentation}`);
}

function formatGithubConstructorExpression(value, depth = 0) {
  const header = readGithubConstructorHeader(value);
  if (!header) {
    throw new Error('invalid JSON constructor name');
  }
  const { source, opening } = header;
  const closing = matchingGithubConstructorParen(source, opening);
  if (closing < 0 || trimGithubJsonWhitespace(source.slice(closing + 1)) !== '') {
    throw new Error('invalid JSON constructor');
  }
  const argumentsSource = source.slice(opening + 1, closing);
  const argumentsList = splitGithubConstructorArguments(argumentsSource);
  if (trimGithubJsonWhitespace(argumentsList.at(-1) ?? '') === '') argumentsList.pop();
  if (argumentsList.length === 0) return `${source.slice(0, opening)}()`;
  const renderedArguments = argumentsList.map((argument) => {
    const trimmed = trimGithubJsonWhitespace(argument);
    if (trimmed === '') return 'undefined';
    if (readGithubConstructorHeader(trimmed)) {
      return formatGithubConstructorExpression(trimmed, depth + 1);
    }
    return trimmed;
  });
  const nestedIndentation = '  '.repeat(depth + 1);
  const indentation = '  '.repeat(depth);
  return `${source.slice(0, opening)}(\n${renderedArguments
    .map((argument) => `${nestedIndentation}${indentGithubConstructorText(argument, depth + 1)}`)
    .join(',\n')}\n${indentation})`;
}

function normalizeGithubConstructor(value, depth = 0) {
  if (depth >= 64) throw new Error('maximum JSON depth exceeded');
  const header = readGithubConstructorHeader(value);
  if (!header) {
    throw new Error('invalid JSON constructor name');
  }
  const { source: constructorSource, opening } = header;
  const closing = matchingGithubConstructorParen(constructorSource, opening);
  if (closing < 0 || trimGithubJsonWhitespace(constructorSource.slice(closing + 1)) !== '') {
    throw new Error('invalid JSON constructor');
  }
  const argumentSources = splitGithubConstructorArguments(
    constructorSource.slice(opening + 1, closing)
  );
  if (trimGithubJsonWhitespace(argumentSources.at(-1) ?? '') === '') argumentSources.pop();
  for (const argumentSource of argumentSources) {
    if (trimGithubJsonWhitespace(stripGithubJsonComments(argumentSource)) === '') continue;
    parseGithubJsonPrefix(argumentSource, {
      preserveConstructors: true,
      requireComplete: true,
      depth: depth + 1
    });
  }
  let result = '';
  let pendingWhitespace = false;
  const appendToken = (token) => {
    if (pendingWhitespace && result && !result.endsWith('(') && !result.endsWith(',')) {
      result += ' ';
    }
    pendingWhitespace = false;
    result += token;
  };
  const structuredEnd = (start) => {
    let depth = 0;
    let quote = null;
    let escaped = false;
    for (let cursor = start; cursor < value.length; cursor += 1) {
      const current = value[cursor];
      if (quote) {
        if (escaped) escaped = false;
        else if (current === '\\') escaped = true;
        else if (current === quote) quote = null;
        continue;
      }
      if (current === '"' || current === "'") {
        quote = current;
        continue;
      }
      if (current === '{' || current === '[') {
        depth += 1;
        continue;
      }
      if (current === '}' || current === ']') {
        depth -= 1;
        if (depth === 0) return cursor + 1;
      }
    }
    return -1;
  };
  const isConstructorArgumentPosition = (offset) => {
    let cursor = offset - 1;
    while (cursor >= 0 && isGithubJsonWhitespace(value[cursor])) cursor -= 1;
    return value[cursor] === '(' || value[cursor] === ',';
  };
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"' || character === "'") {
      const quote = character;
      const start = index + 1;
      let end = start;
      let escaped = false;
      for (; end < value.length; end += 1) {
        const current = value[end];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (current === '\\') {
          escaped = true;
          continue;
        }
        if (current === quote) break;
      }
      const raw = value.slice(start, end);
      let decoded;
      try {
        decoded = replaceGithubUnpairedSurrogates(decodeGithubJsonString(raw));
      } catch {
        decoded = raw;
      }
      appendToken(JSON.stringify(decoded));
      index = end;
      continue;
    }
    if (character === '{' || character === '[') {
      const end = structuredEnd(index);
      if (end > index) {
        const nested = parseGithubJsonPrefix(value.slice(index, end), {
          preserveConstructors: true,
          requireComplete: true
        });
        appendToken(githubConstructorJson(nested));
        index = end - 1;
        continue;
      }
    }
    if (
      isConstructorArgumentPosition(index) &&
      !/[A-Za-z0-9_$]/.test(value[index - 1] ?? '')
    ) {
      const special = value.slice(index).match(/^(?:-?Infinity|NaN)(?![A-Za-z0-9_$])/)?.[0];
      if (special) {
        appendToken(githubJsonNetNumberString(special));
        index += special.length - 1;
        continue;
      }
    }
    if (character === '+' && isConstructorArgumentPosition(index)) {
      throw new Error('invalid JSON number');
    }
    if (/[0-9-]/.test(character)) {
      if (
        isConstructorArgumentPosition(index) &&
        /^[+-]?0[bBoO]/.test(value.slice(index))
      ) {
        throw new Error('non-decimal JSON numbers are not supported');
      }
      const numeric = value.slice(index).match(
        /^-?(?:(?:0[xX][0-9a-fA-F]+)|(?:0[oO][0-7]+)|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/
      )?.[0];
      if (
        numeric &&
        isConstructorArgumentPosition(index) &&
        !/[A-Za-z0-9_$]/.test(value[index - 1] ?? '')
      ) {
        if (/[A-Za-z_$]/.test(value[index + numeric.length] ?? '')) {
          throw new Error('invalid JSON number');
        }
        const normalizedNumeric = githubJsonNetNumberString(numeric);
        appendToken(normalizedNumeric);
        index += numeric.length - 1;
        continue;
      }
    }
    if (isGithubJsonWhitespace(character)) {
      pendingWhitespace = true;
      continue;
    }
    if (character === '(' || character === ')' || character === ',') {
      result = result.replace(/(?:[\t\n\v\f\r \u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000])+$/u, '');
      result += character;
      pendingWhitespace = false;
      continue;
    }
    if (pendingWhitespace && result && !result.endsWith('(') && !result.endsWith(',')) {
      result += ' ';
    }
    pendingWhitespace = false;
    result += character;
  }
  return formatGithubConstructorExpression(trimGithubJsonWhitespace(result));
}

function parseGithubJsonPrefix(
  source,
  { preserveConstructors = false, requireComplete = false, depth = 0 } = {}
) {
  let index = 0;

  const skipWhitespace = () => {
    while (isGithubJsonWhitespace(source[index] ?? '')) index += 1;
  };

  const readComment = () => {
    if (source[index] !== '/') return null;
    if (source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2);
      const commentEnd = end < 0 ? source.length : end;
      const value = source.slice(index + 2, commentEnd);
      index = end < 0 ? source.length : end + 2;
      return value;
    }
    if (source[index + 1] === '/') {
      const end = source.slice(index + 2).search(/[\r\n]/);
      const commentEnd = end < 0 ? source.length : index + 2 + end;
      const value = source.slice(index + 2, commentEnd);
      index = commentEnd;
      return value;
    }
    return null;
  };

  const assertTokenBoundary = ({ allowClosingParen = false, allowSlash = false } = {}) => {
    const character = source[index];
    if (
      character === undefined ||
      isGithubJsonWhitespace(character) ||
      character === ',' ||
      character === ']' ||
      character === '}' ||
      (character === ')' && (allowClosingParen || preserveConstructors)) ||
      (character === '/' &&
        (allowSlash || source[index + 1] === '/' || source[index + 1] === '*'))
    ) {
      return;
    }
    throw new Error('invalid JSON token');
  };

  const skipTrivia = () => {
    while (true) {
      skipWhitespace();
      const before = index;
      if (readComment() === null) return;
      if (index === before) return;
    }
  };

  // FromJson calls JToken.ReadFrom without JsonLoadSettings. That API
  // preserves a leading comment as the first token; comments inside a loaded
  // object or array are ignored by the default container settings.
  skipWhitespace();
  if (
    !preserveConstructors &&
    source[index] === '/' &&
    (source[index + 1] === '/' || source[index + 1] === '*')
  ) {
    if (source[index + 1] === '*' && source.indexOf('*/', index + 2) < 0) {
      throw new Error('invalid JSON comment');
    }
    const comment = readComment();
    if (comment === null) throw new Error('invalid JSON comment');
    return comment;
  }

  const readString = (quote = '"') => {
    const start = index;
    index += 1;
    let escaped = false;
    while (index < source.length) {
      const character = source[index];
      if (escaped) {
        escaped = false;
        index += 1;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        index += 1;
        continue;
      }
      if (character === quote) {
        index += 1;
        const raw = source.slice(start, index);
        if (quote === '"') {
          return replaceGithubUnpairedSurrogates(decodeGithubJsonString(raw.slice(1, -1)));
        }
        return replaceGithubUnpairedSurrogates(
          decodeGithubJsonString(raw.slice(1, -1).replace(/''/g, "'"))
        );
      }
      index += 1;
    }
    throw new Error('invalid JSON string');
  };

  const parseValue = (depth = 0) => {
    skipTrivia();
    const character = source[index];
    if (character === ',') {
      index += 1;
      return preserveConstructors
        ? createConstructorStaticUndefined()
        : createGithubStaticUndefined();
    }
    if (character === '"' || character === "'") return readString(character);
    if (character === '{') {
      if (depth >= 64) throw new Error('maximum JSON depth exceeded');
      index += 1;
      const value = Object.create(null);
      skipTrivia();
      while (source[index] !== '}') {
        skipTrivia();
        let key;
        if (source[index] === '"' || source[index] === "'") {
          key = readString(source[index]);
        } else {
          const keyStart = index;
          if (
            !/^[\p{L}\p{Nd}_$]$/u.test(source[index] ?? '') ||
            /[\uD800-\uDFFF]/.test(source[index] ?? '')
          ) {
            throw new Error('invalid JSON object key');
          }
          while (
            index < source.length &&
            /^[\p{L}\p{Nd}_$]$/u.test(source[index]) &&
            !/[\uD800-\uDFFF]/.test(source[index])
          ) {
            index += 1;
          }
          key = source.slice(keyStart, index);
        }
        if (typeof key !== 'string') throw new Error('invalid JSON object key');
        skipWhitespace();
        if (source[index] !== ':') throw new Error('invalid JSON object');
        index += 1;
        skipTrivia();
        if (source[index] === ',') {
          value[key] = preserveConstructors
            ? createConstructorStaticUndefined()
            : createGithubStaticUndefined();
        } else if (source[index] === '}') {
          throw new Error('invalid JSON object value');
        } else {
          const valueStart = index;
          const parsedValue = parseValue(depth + 1);
          const rawValue = trimGithubJsonWhitespace(
            stripGithubJsonComments(source.slice(valueStart, index))
          );
          value[key] = !preserveConstructors && rawValue === 'undefined'
            ? createGithubStaticUndefined()
            : parsedValue;
        }
        skipTrivia();
        if (source[index] === ',') {
          index += 1;
          skipTrivia();
          if (source[index] === '}') break;
          continue;
        }
        if (source[index] !== '}') throw new Error('invalid JSON object');
      }
      if (source[index] !== '}') throw new Error('invalid JSON object');
      index += 1;
      return value;
    }
    if (character === '[') {
      if (depth >= 64) throw new Error('maximum JSON depth exceeded');
      index += 1;
      const value = [];
      skipTrivia();
      while (source[index] !== ']') {
        if (source[index] === ',') {
          value.push(
            preserveConstructors ? createConstructorStaticUndefined() : createGithubStaticUndefined()
          );
          index += 1;
          skipTrivia();
          if (source[index] === ']') break;
          continue;
        }
        const valueStart = index;
        const parsedValue = parseValue(depth + 1);
        const rawValue = trimGithubJsonWhitespace(
          stripGithubJsonComments(source.slice(valueStart, index))
        );
        value.push(
          !preserveConstructors && rawValue === 'undefined'
            ? createGithubStaticUndefined()
            : parsedValue
        );
        skipTrivia();
        if (source[index] === ',') {
          index += 1;
          skipTrivia();
          if (source[index] === ']') break;
          continue;
        }
        if (source[index] !== ']') throw new Error('invalid JSON array');
      }
      if (source[index] !== ']') throw new Error('invalid JSON array');
      index += 1;
      return value;
    }
    const special = source.slice(index).match(/^(?:-?Infinity|NaN)(?![A-Za-z0-9_])/);
    if (special) {
      index += special[0].length;
      assertTokenBoundary();
      const value = parseGithubJsonNumericLiteral(special[0]);
      return preserveConstructors
        ? createConstructorStaticValue(githubJsonNetNumberString(special[0]))
        : value;
    }
    const literal = source.slice(index).match(/^(?:true|false|null)(?![A-Za-z0-9_])/);
    if (literal) {
      index += literal[0].length;
      assertTokenBoundary();
      return literal[0] === 'true' ? true : literal[0] === 'false' ? false : null;
    }
    if (
      source[index] === '+' ||
      /^[+-]?0[bBoO]/.test(source.slice(index)) ||
      /^-0[xX]/.test(source.slice(index))
    ) {
      throw new Error('non-decimal JSON numbers are not supported');
    }
    const number = source
      .slice(index)
      .match(
        /^-?(?:(?:0[xX][0-9a-fA-F]+)|(?:0[oO][0-7]+)|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/
      );
    if (number) {
      index += number[0].length;
      assertTokenBoundary({ allowClosingParen: true, allowSlash: true });
      const value = parseGithubJsonNumericLiteral(number[0]);
      return preserveConstructors
        ? createConstructorStaticValue(githubJsonNetNumberString(number[0]))
        : value;
    }
    const simpleFallback = source
      .slice(index)
      .match(/^[A-Za-z_$][A-Za-z0-9_$-]*/)?.[0];
    if (simpleFallback && simpleFallback !== 'new') {
      index += simpleFallback.length;
      if (simpleFallback === 'undefined') {
        assertTokenBoundary();
        return preserveConstructors
          ? createConstructorStaticUndefined()
          : createGithubStaticUndefined();
      }
      throw new Error('invalid JSON value');
    }
    const fallbackStart = index;
    let parenthesisDepth = 0;
    let quote = null;
    let escaped = false;
    while (index < source.length) {
      const current = source[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (current === '\\') escaped = true;
        else if (current === quote) quote = null;
        index += 1;
        continue;
      }
      if (current === '"' || current === "'") {
        quote = current;
        index += 1;
        continue;
      }
      if (current === '(') {
        parenthesisDepth += 1;
        index += 1;
        continue;
      }
      if (current === ')' && parenthesisDepth > 0) {
        parenthesisDepth -= 1;
        index += 1;
        if (parenthesisDepth === 0 && readGithubConstructorHeader(source.slice(fallbackStart))) {
          break;
        }
        continue;
      }
      if (
        parenthesisDepth === 0 &&
        current === '/' &&
        (source[index + 1] === '/' || source[index + 1] === '*')
      ) {
        break;
      }
      if (parenthesisDepth === 0 && (current === ',' || current === ']' || current === '}')) {
        break;
      }
      index += 1;
    }
    let fallback = trimGithubJsonWhitespace(
      stripGithubJsonComments(source.slice(fallbackStart, index))
    );
    if (readGithubConstructorHeader(fallback)) {
      fallback = normalizeGithubConstructor(fallback, depth);
    }
    if (!fallback || !readGithubConstructorHeader(fallback)) {
      throw new Error('invalid JSON value');
    }
    return preserveConstructors ? createConstructorStaticToken(fallback) : fallback;
  };

  skipTrivia();
  const value = parseValue(depth);
  if (requireComplete) {
    skipTrivia();
    if (index < source.length) throw new Error('additional JSON content');
  }
  return value;
}

function normalizeGithubJsonValue(value) {
  if (
    isConstructorStaticToken(value) ||
    isConstructorStaticValue(value) ||
    isConstructorStaticUndefined(value) ||
    isGithubStaticUndefined(value) ||
    isGithubInvalidStaticJson(value)
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(normalizeGithubJsonValue);
  if (!value || typeof value !== 'object') return value;
  const normalized = Object.create(null);
  const keysByCase = new Map();
  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    const previousKey = keysByCase.get(normalizedKey);
    if (previousKey !== undefined) {
      normalized[previousKey] = normalizeGithubJsonValue(item);
      continue;
    }
    normalized[key] = normalizeGithubJsonValue(item);
    keysByCase.set(normalizedKey, key);
  }
  return normalized;
}

function githubConstructorJson(value, depth = 0) {
  const indentation = '  '.repeat(depth);
  const nestedIndentation = '  '.repeat(depth + 1);
  if (isConstructorStaticToken(value)) {
    return formatGithubConstructorExpression(value[constructorStaticToken], depth);
  }
  if (isConstructorStaticValue(value)) return value[constructorStaticValue];
  if (isConstructorStaticUndefined(value)) return 'undefined';
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return JSON.stringify(githubNumberString(value));
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map(
      (item) => `${nestedIndentation}${githubConstructorJson(item, depth + 1)}`
    );
    return `[\n${items.join(',\n')}\n${indentation}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    const members = entries.map(
      ([key, item]) =>
        `${nestedIndentation}${JSON.stringify(key)}: ${githubConstructorJson(item, depth + 1)}`
    );
    return `{\n${members.join(',\n')}\n${indentation}}`;
  }
  return githubToJson(value);
}

function trackedCheckoutFiles() {
  if (trackedCheckoutFilesCache !== undefined) return trackedCheckoutFilesCache;
  try {
    const output = execFileSync('git', ['ls-files', '-z'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    trackedCheckoutFilesCache = output
      .split('\0')
      .filter(Boolean)
      .filter((path) => existsSync(join(root, path)))
      .map((path) => path.split('\\').join('/'));
  } catch {
    trackedCheckoutFilesCache = [];
  }
  return trackedCheckoutFilesCache;
}

function filesUnder(directory, predicate) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'tmp', 'dist'].includes(entry.name)) return [];
        return filesUnder(path, predicate);
      }
      return predicate(entry.name) ? [path] : [];
    })
    .sort();
}

function workflowFiles(directory) {
  return filesUnder(directory, (name) => /\.ya?ml$/.test(name));
}

function dockerfiles(directory) {
  return filesUnder(directory, (name) => name === 'Dockerfile' || name.startsWith('Dockerfile.'));
}

function runtimeScriptFiles(directory) {
  return filesUnder(directory, (name) => /\.(?:mjs|sh)$/.test(name));
}

function composeFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^docker-compose(?:\.[^.]+)?\.ya?ml$/.test(entry.name))
    .map((entry) => join(directory, entry.name))
    .sort();
}

function relativePath(path, rootDirectory = root) {
  return relative(rootDirectory, path).split('\\').join('/');
}

function isImmutableImage(image) {
  const at = image.lastIndexOf('@');
  return at > 0 && digestRef.test(image.slice(at + 1));
}

function scanImageReference(
  findings,
  image,
  path,
  scope,
  rootDirectory,
  { allowLocal = false } = {}
) {
  if (allowLocal && localComposeImage.test(image)) return false;
  if (!isImmutableImage(image)) {
    findings.push(
      `${relativePath(path, rootDirectory)}: ${scope} image ${image} is not pinned to a sha256 image digest`
    );
    return false;
  }
  return true;
}

const releaseImageArchives = ['/tmp/api-image.tar', '/tmp/worker-image.tar', '/tmp/spa-image.tar'];
const releaseImages = [
  {
    name: 'API',
    id: 'api',
    dockerfile: 'apps/api/Dockerfile',
    archive: '/tmp/api-image.tar',
    localReference: 'cvg-his-v4-api:${{ env.RELEASE_SHA }}',
    candidateVariable: 'API_CANDIDATE_IMAGE',
    digestVariable: 'API_DIGEST'
  },
  {
    name: 'worker',
    id: 'worker',
    dockerfile: 'apps/worker/Dockerfile',
    archive: '/tmp/worker-image.tar',
    localReference: 'cvg-his-v4-worker:${{ env.RELEASE_SHA }}',
    candidateVariable: 'WORKER_CANDIDATE_IMAGE',
    digestVariable: 'WORKER_DIGEST'
  },
  {
    name: 'SPA',
    id: 'spa',
    dockerfile: 'apps/spa/Dockerfile',
    archive: '/tmp/spa-image.tar',
    localReference: 'cvg-his-v4-spa:${{ env.RELEASE_SHA }}',
    candidateVariable: 'SPA_CANDIDATE_IMAGE',
    digestVariable: 'SPA_DIGEST'
  }
];

function workflowSteps(content) {
  return content.split(/(?=^ {6}-\s)/m).filter((section) => /^ {6}-\s/.test(section));
}

function parseWorkflowYaml(content) {
  try {
    const document = parseDocument(content, {
      maxAliasCount: 1000,
      merge: true,
      version: '1.2'
    });
    if (document.errors.length > 0) return null;
    return document.toJS({ maxAliasCount: 1000 });
  } catch {
    return null;
  }
}

function githubExpressionNumber(value) {
  if (isGithubInvalidStaticJson(value)) throw new Error('invalid static JSON');
  if (isGithubStaticUndefined(value)) return 0;
  if (value === null) return 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized === '') return 0;
    if (/^[+-]?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/.test(normalized)) {
      return Number(normalized);
    }
    if (/^0x[0-9a-fA-F]+$/.test(normalized)) {
      return parseGithubRadixInteger(normalized.slice(2), 16);
    }
    if (/^0o[0-7]+$/.test(normalized)) {
      return parseGithubRadixInteger(normalized.slice(2), 8);
    }
    if (normalized === 'Infinity') return Number.POSITIVE_INFINITY;
    if (normalized === '-Infinity') return Number.NEGATIVE_INFINITY;
    return Number.NaN;
  }
  if (Array.isArray(value) || (value !== null && typeof value === 'object')) {
    return Number.NaN;
  }
  return Number.NaN;
}

function parseGithubRadixInteger(digits, radix) {
  const parsed = Number.parseInt(digits, radix);
  if (!Number.isFinite(parsed) || parsed > 0xffffffff) return Number.NaN;
  return parsed > 0x7fffffff ? parsed - 0x100000000 : parsed;
}

function githubExpressionString(value) {
  return value.toLowerCase();
}

function parseGithubNumericLiteral(literal) {
  const negative = literal.startsWith('-');
  const unsigned = /^[+-]/.test(literal) ? literal.slice(1) : literal;
  const value = /^0[xX]/.test(unsigned)
    ? parseGithubRadixInteger(unsigned.slice(2), 16)
    : /^0[bB]/.test(unsigned)
      ? parseGithubRadixInteger(unsigned.slice(2), 2)
      : /^0[oO]/.test(unsigned)
        ? parseGithubRadixInteger(unsigned.slice(2), 8)
        : Number(unsigned);
  return negative ? -value : value;
}

function parseGithubJsonNumericLiteral(literal) {
  validateGithubJsonNumericLiteral(literal);
  const negative = literal.startsWith('-');
  const signed = /^[+-]/.test(literal);
  const unsigned = /^[+-]/.test(literal) ? literal.slice(1) : literal;
  if (/^0[bBoO]/.test(unsigned)) throw new Error('non-decimal JSON numbers are not supported');
  if (!signed && /^0[xX]/.test(unsigned)) {
    return Number(githubJsonSignedInt64(BigInt(unsigned)));
  }
  if (!signed && /^0[0-7]+$/.test(unsigned) && unsigned.length > 1) {
    return Number(githubJsonSignedInt64(BigInt(`0o${unsigned.slice(1)}`)));
  }
  if (!signed && /^0[89]/.test(unsigned)) {
    throw new Error('invalid legacy octal JSON number');
  }
  return Number(literal);
}

function parseGithubStringLiteral(expression, offset) {
  const quote = expression[offset];
  if (quote !== "'" && quote !== '"') return null;
  let value = '';
  for (let index = offset + 1; index < expression.length; index += 1) {
    if (expression[index] !== quote) {
      value += expression[index];
      continue;
    }
    if (expression[index + 1] === quote) {
      value += quote;
      index += 1;
      continue;
    }
    return { end: index + 1, value };
  }
  return null;
}

function parseGithubFunctionCall(expression, offset) {
  const match = expression
    .slice(offset)
    .match(
      /^(fromJSON|toJSON|contains|startsWith|endsWith|format|join|hashFiles|success|failure|cancelled|always)\s*\(/i
    );
  if (!match) return null;
  const name = match[1].toLowerCase();
  const opening = offset + match[0].length - 1;
  let quote = null;
  let depth = 0;
  for (let index = opening; index < expression.length; index += 1) {
    const character = expression[index];
    if (quote) {
      if (character === quote) {
        if (expression[index + 1] === quote) {
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === '(') depth += 1;
    if (character !== ')') continue;
    depth -= 1;
    if (depth !== 0) continue;
    const source = expression.slice(opening + 1, index);
    const args = [];
    let argumentStart = 0;
    quote = null;
    depth = 0;
    for (let argumentIndex = 0; argumentIndex <= source.length; argumentIndex += 1) {
      const argumentCharacter = source[argumentIndex];
      if (quote) {
        if (argumentCharacter === quote) {
          if (source[argumentIndex + 1] === quote) {
            argumentIndex += 1;
          } else {
            quote = null;
          }
        }
        continue;
      }
      if (argumentCharacter === "'" || argumentCharacter === '"') {
        quote = argumentCharacter;
        continue;
      }
      if (argumentCharacter === '(') depth += 1;
      if (argumentCharacter === ')') depth -= 1;
      if (argumentCharacter !== ',' || depth !== 0) continue;
      args.push(source.slice(argumentStart, argumentIndex).trim());
      argumentStart = argumentIndex + 1;
    }
    if (source.trim() || args.length > 0) args.push(source.slice(argumentStart).trim());
    return { args, end: index + 1, name };
  }
  return null;
}

function githubExpressionTruthy(value) {
  if (isGithubInvalidStaticJson(value)) throw new Error('invalid static JSON');
  if (isGithubStaticUndefined(value)) return false;
  if (value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return !Number.isNaN(value) && value !== 0;
  if (typeof value === 'string') return value.length > 0;
  return true;
}

function normalizeGithubReference(reference) {
  const bracket = reference.match(/^([A-Za-z_][A-Za-z0-9_.-]*)\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]$/);
  return bracket ? `${bracket[1]}.${bracket[2]}` : reference;
}

function parseGithubReferenceExpression(expression, offset, knownValues = {}) {
  const base = expression.slice(offset).match(/^[A-Za-z_][A-Za-z0-9_.-]*/);
  if (!base) return null;
  let index = offset + base[0].length;
  let key = base[0];
  while (expression[index] === '[') {
    let quote = null;
    let depth = 0;
    let closing = -1;
    for (let cursor = index; cursor < expression.length; cursor += 1) {
      const character = expression[cursor];
      if (quote) {
        if (character === quote) {
          if (expression[cursor + 1] === quote) cursor += 1;
          else quote = null;
        }
        continue;
      }
      if (character === "'" || character === '"') {
        quote = character;
        continue;
      }
      if (character === '[' || character === '(') depth += 1;
      if (character === ']' || character === ')') {
        depth -= 1;
        if (character === ']' && depth === 0) {
          closing = cursor;
          break;
        }
      }
    }
    if (closing < 0) return null;
    const selector = parseStaticExpressionValue(expression.slice(index + 1, closing), knownValues);
    if (selector === null || !isGithubPrimitive(selector.value)) {
      return { end: closing + 1, key: null, value: undefined };
    }
    key = `${key}.${githubExpressionValueString(selector.value)}`;
    index = closing + 1;
  }
  return {
    end: index,
    key,
    value: lookupCaseInsensitiveValue(knownValues, key).value
  };
}

function evaluateStaticGithubFunctionValue(call, knownValues = {}) {
  const values = call.args.map((argument) => parseStaticExpressionValue(argument, knownValues));
  if (values.some((value) => value === null)) return null;
  if (values.some(({ value }) => isGithubInvalidStaticJson(value))) {
    return { value: createGithubInvalidStaticJson() };
  }

  if (call.args.length === 0) {
    if (call.name === 'success' || call.name === 'always') return { value: true };
    if (call.name === 'failure' || call.name === 'cancelled') return { value: false };
  }

  if (call.name === 'fromjson' && call.args.length === 1) {
    if (isOpaqueStaticText(values[0].value)) return null;
    const json = githubExpressionValueString(values[0].value);
    try {
      return {
        value: normalizeGithubJsonValue(
          parseGithubJsonPrefix(json)
        )
      };
    } catch {
      return { value: createGithubInvalidStaticJson() };
    }
  }
  if (call.name === 'tojson' && call.args.length === 1) {
    if (isOpaqueStaticText(values[0].value)) return { value: createOpaqueStaticString() };
    try {
      return { value: githubToJson(values[0].value) };
    } catch {
      return null;
    }
  }
  if (call.name === 'hashfiles' && call.args.length > 0) {
    if (values.some(({ value }) => isOpaqueStaticText(value))) return null;
    const patterns = values.map(({ value }) => githubExpressionValueString(value).trim());
    const files = trackedCheckoutFiles();
    const globToRegExp = (pattern) => {
      let source = '^';
      for (let index = 0; index < pattern.length; index += 1) {
        const character = pattern[index];
        if (character === '*' && pattern[index + 1] === '*') {
          const atSegmentStart = index === 0 || pattern[index - 1] === '/';
          const atSegmentEnd = index + 2 === pattern.length || pattern[index + 2] === '/';
          if (atSegmentStart && pattern[index + 2] === '/') {
            source += '(?:.*/)?';
            index += 2;
          } else if (atSegmentStart && atSegmentEnd) {
            source += '.*';
            index += 1;
          } else {
            source += '[^/]*';
            index += 1;
          }
        } else if (character === '*') {
          source += '[^/]*';
        } else if (character === '?') {
          source += '[^/]';
        } else if (character === '[') {
          const closing = pattern.indexOf(']', index + 1);
          if (closing < 0) {
            source += '\\[';
          } else {
            let characterClass = pattern.slice(index + 1, closing);
            const negated = characterClass.startsWith('!') || characterClass.startsWith('^');
            if (negated) characterClass = characterClass.slice(1);
            characterClass = characterClass.replace(/[\\\[]/g, '\\$&').replace(/\]/g, '\\]');
            source += `[${negated ? '^' : ''}${characterClass}]`;
            index = closing;
          }
        } else {
          source += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
      }
      return new RegExp(`${source}$`);
    };
    const matched = new Set();
    for (const value of patterns) {
      let pattern = value;
      let negative = false;
      while (pattern.startsWith('!')) {
        negative = !negative;
        pattern = pattern.slice(1).trimStart();
      }
      pattern = pattern.trim();
      if (pattern.startsWith('#')) continue;
      const matcher = globToRegExp(pattern);
      if (!matcher) return null;
      for (const file of files) {
        if (matcher.test(file)) {
          if (negative) matched.delete(file);
          else matched.add(file);
        }
      }
    }
    return { value: matched.size > 0 ? createOpaqueStaticHash() : '' };
  }
  if (call.name === 'format' && call.args.length >= 1) {
    if (isOpaqueStaticHash(values[0].value)) return { value: createOpaqueStaticHash() };
    if (isOpaqueStaticString(values[0].value)) return { value: createOpaqueStaticString() };
    const template = githubExpressionValueString(values[0].value);
    const replacementValues = values.slice(1).map(({ value }) => value);
    let hasOpaqueReplacement = false;
    let formatted = '';
    for (let index = 0; index < template.length; index += 1) {
      const character = template[index];
      if (character === '{' && template[index + 1] === '{') {
        formatted += '{';
        index += 1;
        continue;
      }
      if (character === '}' && template[index + 1] === '}') {
        formatted += '}';
        index += 1;
        continue;
      }
      if (character === '{') {
        let cursor = index + 1;
        const digitStart = cursor;
        while (/\d/.test(template[cursor] ?? '')) cursor += 1;
        if (cursor === digitStart) return null;
        const replacementIndex = Number(template.slice(digitStart, cursor));
        if (replacementIndex > 255 || replacementIndex >= replacementValues.length) return null;

        let formatSpecifiers = '';
        if (template[cursor] === '}') {
          // No format specifiers.
        } else if (template[cursor] === ':') {
          cursor += 1;
          let closed = false;
          while (cursor < template.length) {
            if (template[cursor] !== '}') {
              formatSpecifiers += template[cursor];
              cursor += 1;
            } else if (template[cursor + 1] === '}') {
              formatSpecifiers += '}';
              cursor += 2;
            } else {
              closed = true;
              break;
            }
          }
          if (!closed) return null;
        } else {
          return null;
        }
        if (formatSpecifiers !== '') return null;
        const replacement = replacementValues[replacementIndex];
        if (isOpaqueStaticText(replacement)) hasOpaqueReplacement = true;
        else formatted += githubExpressionValueString(replacement);
        index = cursor;
        continue;
      }
      if (character === '}') return null;
      formatted += character;
    }
    return { value: hasOpaqueReplacement ? createOpaqueStaticString() : formatted };
  }
  if (call.name === 'join' && (call.args.length === 1 || call.args.length === 2)) {
    const left = values[0].value;
    if (isOpaqueStaticText(left)) return { value: left };
    const separator =
      call.args.length === 2 && isGithubPrimitive(values[1].value)
        ? githubExpressionValueString(values[1].value)
        : ',';
    if (Array.isArray(left)) {
      if (left.some((item) => isOpaqueStaticText(item))) return { value: createOpaqueStaticString() };
      if (call.args.length === 2 && isOpaqueStaticText(values[1].value)) {
        if (left.length === 0) return { value: '' };
        if (left.length === 1) return { value: githubExpressionValueString(left[0]) };
        return { value: createOpaqueStaticString() };
      }
      return { value: left.map((item) => githubExpressionValueString(item)).join(separator) };
    }
    return { value: isGithubPrimitive(left) ? githubExpressionValueString(left) : '' };
  }
  if (call.args.length !== 2) return null;
  const [left, right] = values.map(({ value }) => value);
  if (call.name === 'contains') {
    if (isOpaqueStaticText(left)) {
      if (isGithubPrimitive(right) && githubExpressionValueString(right) === '') return { value: true };
      return null;
    }
    if (isOpaqueStaticText(right)) {
      if (isGithubPrimitive(left) && githubExpressionValueString(left) === '') return { value: false };
      return null;
    }
    if (Array.isArray(left)) {
      if (left.length === 0 || !isGithubPrimitive(right)) return { value: false };
      for (const item of left) {
        if (!isGithubPrimitive(item)) continue;
        const equal = evaluateStaticLiteralComparison(item, right, '==');
        if (equal === true) return { value: true };
      }
      return { value: false };
    }
    if (!isGithubPrimitive(left) || !isGithubPrimitive(right)) return { value: false };
    return {
      value: githubExpressionValueString(left)
        .toLowerCase()
        .includes(githubExpressionValueString(right).toLowerCase())
    };
  }
  if (isOpaqueStaticText(left)) {
    if (isGithubPrimitive(right) && githubExpressionValueString(right) === '') return { value: true };
    return null;
  }
  if (isOpaqueStaticText(right)) {
    if (isGithubPrimitive(left) && githubExpressionValueString(left) === '') return { value: false };
    return null;
  }
  if (!isGithubPrimitive(left) || !isGithubPrimitive(right)) return { value: false };
  const leftString = githubExpressionValueString(left).toLowerCase();
  const rightString = githubExpressionValueString(right).toLowerCase();
  if (call.name === 'startswith') return { value: leftString.startsWith(rightString) };
  if (call.name === 'endswith') return { value: leftString.endsWith(rightString) };
  return null;
}

function parseStaticExpressionValue(source, knownValues = {}) {
  const result = evaluateStaticExpressionValueModern(source, knownValues);
  return result?.known ? { value: result.value } : null;
}

function evaluateStaticLiteralComparison(left, right, operator) {
  if (isGithubInvalidStaticJson(left) || isGithubInvalidStaticJson(right)) {
    throw new Error('invalid static JSON');
  }
  const leftHash = isOpaqueStaticHash(left);
  const rightHash = isOpaqueStaticHash(right);
  const leftOpaqueString = isOpaqueStaticString(left);
  const rightOpaqueString = isOpaqueStaticString(right);
  if (leftHash || rightHash || leftOpaqueString || rightOpaqueString) {
    if ((leftHash || leftOpaqueString) && (rightHash || rightOpaqueString)) return null;
    const other = leftHash || leftOpaqueString ? right : left;
    if (typeof other === 'string') {
      if (leftOpaqueString || rightOpaqueString) {
        if (operator === '==' || operator === '===') return other === '' ? false : null;
        if (operator === '!=' || operator === '!==') return other === '' ? true : null;
        return null;
      }
      const couldBeHash = staticDigest.test(other);
      if (operator === '==' || operator === '===') return couldBeHash ? null : false;
      if (operator === '!=' || operator === '!==') return couldBeHash ? null : true;
      return null;
    }
    if (leftOpaqueString || rightOpaqueString) return null;
    if (operator === '==' || operator === '===') return false;
    if (operator === '!=' || operator === '!==') return true;
    return null;
  }
  if (operator === '==' || operator === '===') {
    if (operator === '===' && typeof left !== typeof right) return false;
    if (typeof left === 'string' && typeof right === 'string') {
      return githubExpressionString(left) === githubExpressionString(right);
    }
    if (operator === '===') return left === right;
    const leftNumber = githubExpressionNumber(left);
    const rightNumber = githubExpressionNumber(right);
    return !Number.isNaN(leftNumber) && !Number.isNaN(rightNumber) && leftNumber === rightNumber;
  }
  if (operator === '!=' || operator === '!==') {
    const equality = evaluateStaticLiteralComparison(left, right, operator === '!=' ? '==' : '===');
    return equality === null ? null : !equality;
  }
  if (typeof left === 'string' && typeof right === 'string') {
    const leftString = githubExpressionString(left);
    const rightString = githubExpressionString(right);
    if (operator === '<') return leftString < rightString;
    if (operator === '<=') return leftString <= rightString;
    if (operator === '>') return leftString > rightString;
    if (operator === '>=') return leftString >= rightString;
    return null;
  }
  const leftNumber = githubExpressionNumber(left);
  const rightNumber = githubExpressionNumber(right);
  if (Number.isNaN(leftNumber) || Number.isNaN(rightNumber)) return false;
  if (operator === '<') return leftNumber < rightNumber;
  if (operator === '<=') return leftNumber <= rightNumber;
  if (operator === '>') return leftNumber > rightNumber;
  if (operator === '>=') return leftNumber >= rightNumber;
  return null;
}

function evaluateStaticExpressionValueModern(expression, knownValues = {}) {
  if (expression.trim() === '') return null;
  let index = 0;
  const unknown = () => ({ value: undefined, known: false });

  const parseLiteral = (offset) => {
    const source = expression.slice(offset);
    const booleanLiteral = source.match(/^(true|false)(?![A-Za-z0-9_.-])/i);
    if (booleanLiteral) {
      return {
        end: offset + booleanLiteral[0].length,
        value: booleanLiteral[1].toLowerCase() === 'true'
      };
    }
    const nullLiteral = source.match(/^(?:null|~)(?![A-Za-z0-9_.-])/i);
    if (nullLiteral) return { end: offset + nullLiteral[0].length, value: null };
    const specialNumberLiteral = source.match(/^(?:[+-]?Infinity|NaN)(?![A-Za-z0-9_.-])/);
    if (specialNumberLiteral) {
      return {
        end: offset + specialNumberLiteral[0].length,
        value: parseGithubNumericLiteral(specialNumberLiteral[0])
      };
    }
    const numericLiteral = source.match(
      /^[+-]?(?:(?:0[xX][0-9a-fA-F]+)|(?:0[bB][01]+)|(?:0[oO][0-7]+)|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(?![A-Za-z0-9_.-])/
    );
    if (numericLiteral) {
      return {
        end: offset + numericLiteral[0].length,
        value: parseGithubNumericLiteral(numericLiteral[0])
      };
    }
    return parseGithubStringLiteral(expression, offset);
  };

  const skipWhitespace = () => {
    while (/\s/.test(expression[index] ?? '')) index += 1;
  };

  const consumeUnknownCall = () => {
    if (expression[index] !== '(') return;
    let quote = null;
    let depth = 0;
    for (let cursor = index; cursor < expression.length; cursor += 1) {
      const character = expression[cursor];
      if (quote) {
        if (character === quote) {
          if (expression[cursor + 1] === quote) cursor += 1;
          else quote = null;
        }
        continue;
      }
      if (character === "'" || character === '"') {
        quote = character;
        continue;
      }
      if (character === '(') depth += 1;
      if (character !== ')') continue;
      depth -= 1;
      if (depth === 0) {
        index = cursor + 1;
        return;
      }
    }
  };

  const applyStaticProperty = (base, property, selectorValue = property) => {
    if (!base.known) return unknown();
    const value = base.value;
    if (isGithubInvalidStaticJson(value)) return { value, known: true };
    if (value === null || value === undefined) return { value: null, known: true };
    if (isFilteredStaticArray(value)) {
      if (!isGithubPrimitive(selectorValue)) return { value: createFilteredStaticArray([]), known: true };
      const numericIndex = githubExpressionNumber(selectorValue);
      const propertyKey = githubExpressionValueString(selectorValue);
      const hasIntegerIndex =
        Number.isFinite(numericIndex) && numericIndex >= 0 && numericIndex <= 0x7fffffff;
      return {
        value: createFilteredStaticArray(
          value.flatMap((item) => {
            if (Array.isArray(item)) {
              if (!hasIntegerIndex) return [];
              const integerIndex = Math.floor(numericIndex);
              return integerIndex < item.length ? [item[integerIndex]] : [];
            }
            if (item && typeof item === 'object') {
              const property = lookupGithubObjectProperty(item, propertyKey);
              return property.found ? [property.value] : [];
            }
            return [];
          })
        ),
        known: true
      };
    }
    if (Array.isArray(value)) {
      const indexValue = githubExpressionNumber(selectorValue);
      if (Number.isFinite(indexValue) && indexValue >= 0) {
        const integerIndex = Math.floor(indexValue);
        return { value: value[integerIndex] ?? null, known: true };
      }
      return { value: null, known: true };
    }
    if (typeof value === 'object') {
      if (!isGithubPrimitive(selectorValue)) return { value: null, known: true };
      const propertyKey = githubExpressionValueString(selectorValue);
      const property = lookupGithubObjectProperty(value, propertyKey);
      return {
        value: property.found ? property.value : null,
        known: true
      };
    }
    return { value: null, known: true };
  };

  const applyStaticPostfixes = (base) => {
    let value = base;
    while (value) {
      skipWhitespace();
      if (expression[index] === '.') {
        if (expression[index + 1] === '*') {
          index += 2;
          if (!value.known) {
            value = unknown();
          } else if (isFilteredStaticArray(value.value)) {
            value = {
              value: createFilteredStaticArray(
                value.value.flatMap((item) =>
                  Array.isArray(item)
                    ? item
                    : item && typeof item === 'object'
                      ? Object.values(item)
                      : []
                )
              ),
              known: true
            };
          } else if (Array.isArray(value.value)) {
            value = { value: createFilteredStaticArray(value.value), known: true };
          } else if (value.value && typeof value.value === 'object') {
            value = { value: createFilteredStaticArray(Object.values(value.value)), known: true };
          } else {
            value = { value: createFilteredStaticArray([]), known: true };
          }
          continue;
        }
        const property = expression.slice(index + 1).match(/^[A-Za-z_][A-Za-z0-9_-]*/)?.[0];
        if (!property) return value;
        index += property.length + 1;
        value = applyStaticProperty(value, property);
        continue;
      }
      if (expression[index] !== '[') return value;
      let quote = null;
      let depth = 0;
      let closing = -1;
      for (let cursor = index; cursor < expression.length; cursor += 1) {
        const character = expression[cursor];
        if (quote) {
          if (character === quote) {
            if (expression[cursor + 1] === quote) cursor += 1;
            else quote = null;
          }
          continue;
        }
        if (character === "'" || character === '"') {
          quote = character;
          continue;
        }
        if (character === '[' || character === '(') depth += 1;
        if (character !== ']' && character !== ')') continue;
        depth -= 1;
        if (character === ']' && depth === 0) {
          closing = cursor;
          break;
        }
      }
      if (closing < 0) return value;
      const selector = parseStaticExpressionValue(
        expression.slice(index + 1, closing),
        knownValues
      );
      index = closing + 1;
      if (selector === null) {
        value = unknown();
        continue;
      }
      value = applyStaticProperty(value, String(selector.value), selector.value);
    }
    return value;
  };

  const parseOperand = () => {
    skipWhitespace();
    if (expression[index] === '(') {
      index += 1;
      const nested = parseOr();
      skipWhitespace();
      if (expression[index] !== ')') return null;
      index += 1;
      return applyStaticPostfixes(nested ?? unknown());
    }

    const functionCall = parseGithubFunctionCall(expression, index);
    if (functionCall) {
      index = functionCall.end;
      const value = evaluateStaticGithubFunctionValue(functionCall, knownValues);
      return applyStaticPostfixes(
        value === null ? unknown() : { value: value.value, known: true }
      );
    }

    const literal = parseLiteral(index);
    if (literal) {
      index = literal.end;
      return applyStaticPostfixes({ value: literal.value, known: true });
    }

    const reference = parseGithubReferenceExpression(expression, index, knownValues);
    if (!reference) return null;
    index = reference.end;
    if (expression[index] === '(') consumeUnknownCall();
    return applyStaticPostfixes(
      reference.value === undefined
        ? unknown()
        : { value: reference.value, known: true }
    );
  };

  const parseUnary = () => {
    skipWhitespace();
    if (expression[index] !== '!') return parseOperand();
    index += 1;
    const operand = parseUnary();
    if (!operand || !operand.known) return unknown();
    return { value: !githubExpressionTruthy(operand.value), known: true };
  };

  const parseComparison = () => {
    const left = parseUnary();
    if (!left) return null;
    skipWhitespace();
    const operator = expression.slice(index).match(/^(===|!==|==|!=|<=|>=|<|>)/)?.[1];
    if (!operator) return left;
    index += operator.length;
    const right = parseUnary();
    if (!right || !left.known || !right.known) return unknown();
    const comparison = evaluateStaticLiteralComparison(left.value, right.value, operator);
    return comparison === null ? unknown() : { value: comparison, known: true };
  };

  function parseAnd() {
    let value = parseComparison();
    while (value && index < expression.length) {
      skipWhitespace();
      if (!expression.startsWith('&&', index)) return value;
      index += 2;
      const right = parseComparison();
      if (!right) return null;
      if (!value.known) {
        value = right.known && !githubExpressionTruthy(right.value) ? right : unknown();
      } else if (!githubExpressionTruthy(value.value)) {
        // GitHub's logical operators return operands, so preserve a known falsey left value.
      } else {
        value = right;
      }
    }
    return value;
  }

  function parseOr() {
    let value = parseAnd();
    while (value && index < expression.length) {
      skipWhitespace();
      if (!expression.startsWith('||', index)) return value;
      index += 2;
      const right = parseAnd();
      if (!right) return null;
      if (!value.known) {
        value = right.known && githubExpressionTruthy(right.value) ? right : unknown();
      } else if (githubExpressionTruthy(value.value)) {
        // GitHub's logical operators return operands, so preserve a known truthy left value.
      } else {
        value = right;
      }
    }
    return value;
  }

  const value = parseOr();
  skipWhitespace();
  return index === expression.length ? value : null;
}

function evaluateStaticBooleanExpressionModern(expression, knownValues = {}) {
  const result = evaluateStaticExpressionValueModern(expression, knownValues);
  return result?.known ? githubExpressionTruthy(result.value) : null;
}

function staticallyEvaluateBooleanExpression(expression, knownValues = {}) {
  try {
    return evaluateStaticBooleanExpressionModern(expression, knownValues);
  } catch {
    return false;
  }
}

function extractYamlCondition(content, patterns) {
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const match = patterns.map((pattern) => lines[index].match(pattern)).find(Boolean);
    if (!match) continue;

    let condition = match[1].trim();
    const foldedScalarMarker = condition.match(/^([>|])([-+]?)(?:\s+#.*)?$/);
    if (foldedScalarMarker) {
      const lineIndent = lines[index].match(/^\s*/)?.[0].length ?? 0;
      const baseIndent = lineIndent + (lines[index].trimStart().startsWith('-') ? 2 : 0);
      const foldedLines = [];
      for (let next = index + 1; next < lines.length; next += 1) {
        if (!lines[next].trim()) continue;
        const indent = lines[next].match(/^\s*/)?.[0].length ?? 0;
        if (indent <= baseIndent) break;
        foldedLines.push(lines[next].trim());
      }
      condition = foldedLines.join(' ');
    }
    return condition;
  }
  return null;
}

function workflowUsesWorkflowRunTrigger(content) {
  const parsed = parseWorkflowYaml(content);
  if (parsed && Object.prototype.hasOwnProperty.call(parsed, 'on')) {
    const trigger = parsed.on;
    if (trigger === 'workflow_run') return true;
    if (Array.isArray(trigger)) return trigger.includes('workflow_run');
    if (trigger && typeof trigger === 'object') {
      return Object.prototype.hasOwnProperty.call(trigger, 'workflow_run');
    }
    return false;
  }

  const lines = content.split(/\r?\n/);
  let onIndent = null;
  for (const line of lines) {
    const indentation = line.match(/^\s*/)?.[0].length ?? 0;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const onMatch = line.match(/^(\s*)(?:on|['"]on['"])\s*:\s*(.*)$/);
    if (onMatch) {
      onIndent = onMatch[1].length;
      if (/\bworkflow_run\b/.test(onMatch[2])) return true;
      continue;
    }
    if (onIndent === null) continue;
    if (indentation <= onIndent) {
      onIndent = null;
      continue;
    }
    if (/^(?:\s*)(?:workflow_run|['"]workflow_run['"])\s*:/.test(line)) return true;
  }
  return false;
}

function inspectReleaseWorkflowTriggerPolicy(content, path) {
  const expectedMessage = `${path}: release workflow trigger must be exactly workflow_run with workflows [CI] and types [completed]`;
  const parsed = parseWorkflowYaml(content);
  if (!parsed || !parsed.on || typeof parsed.on !== 'object' || Array.isArray(parsed.on)) {
    return [expectedMessage];
  }

  const triggerNames = Object.keys(parsed.on);
  if (triggerNames.length !== 1 || triggerNames[0] !== 'workflow_run') {
    return [expectedMessage];
  }

  const workflowRun = parsed.on.workflow_run;
  const isObject = workflowRun && typeof workflowRun === 'object' && !Array.isArray(workflowRun);
  const hasExactList = (value, expected) =>
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every((item, index) => item === expected[index]);
  if (
    !isObject ||
    Object.keys(workflowRun).length !== 2 ||
    !hasExactList(workflowRun.workflows, ['CI']) ||
    !hasExactList(workflowRun.types, ['completed'])
  ) {
    return [expectedMessage];
  }
  return [];
}

function evaluateYamlConditionValue(value, knownValues) {
  if (value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
  if (typeof value !== 'string') return null;
  const normalized = normalizeWorkflowCondition(value);
  const expression = normalized.match(/^\$\{\{([\s\S]*)\}\}$/)?.[1]?.trim() ?? normalized;
  return staticallyEvaluateBooleanExpression(expression, knownValues);
}

function isFailureDiagnosticsStep(step) {
  return (
    step &&
    typeof step === 'object' &&
    step.name === 'Preserve failed assurance diagnostics' &&
    typeof step.uses === 'string' &&
    step.uses.startsWith('actions/upload-artifact@')
  );
}

function isFailureDiagnosticsCondition(value) {
  if (typeof value !== 'string') return false;
  const normalized = normalizeWorkflowCondition(value);
  const expression = normalized.match(/^\$\{\{([\s\S]*)\}\}$/)?.[1]?.trim() ?? normalized;
  return /^failure\(\)$/i.test(expression);
}

function workflowYamlHasStaticallyFalseCondition(content, knownValues = {}) {
  const parsed = parseWorkflowYaml(content);
  if (!parsed || !parsed.jobs || typeof parsed.jobs !== 'object') return false;

  const stepsHaveFalseCondition = (steps) => {
    if (!Array.isArray(steps)) return false;
    for (const step of steps) {
      if (!step || typeof step !== 'object') continue;
      if (
        Object.prototype.hasOwnProperty.call(step, 'if') &&
        evaluateYamlConditionValue(step.if, knownValues) === false &&
        !(isFailureDiagnosticsStep(step) && isFailureDiagnosticsCondition(step.if))
      ) {
        return true;
      }
      if (stepsHaveFalseCondition(step.steps)) return true;
    }
    return false;
  };

  for (const job of Object.values(parsed.jobs)) {
    if (!job || typeof job !== 'object') continue;
    if (
      Object.prototype.hasOwnProperty.call(job, 'if') &&
      evaluateYamlConditionValue(job.if, knownValues) === false
    ) {
      return true;
    }
    if (stepsHaveFalseCondition(job.steps)) return true;
  }
  return false;
}

function normalizeWorkflowCondition(condition) {
  const source = condition.trim();
  let quote = null;
  let commentIndex = source.length;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) {
        if (source[index + 1] === quote) {
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === '#' && (index === 0 || /\s/.test(source[index - 1] ?? ''))) {
      commentIndex = index;
      break;
    }
  }
  const normalized = source.slice(0, commentIndex).trim();
  if (normalized.startsWith('#')) return '';
  if (/^(['"])\1$/.test(normalized)) return normalized;
  return normalized.replace(/^(['"])([\s\S]*)\1$/, '$2').trim();
}

function workflowStepHasStaticallyFalseCondition(step, knownValues = {}) {
  const condition = extractYamlCondition(step, [
    /^ {6}-\s+(?:if|['"]if['"])\s*:\s*(.*?)\s*$/,
    /^ {8}(?:if|['"]if['"])\s*:\s*(.*?)\s*$/
  ]);
  if (condition === null) return false;

  const normalized = normalizeWorkflowCondition(condition);
  const expression = normalized.match(/^\$\{\{([\s\S]*)\}\}$/)?.[1]?.trim() ?? normalized;
  if (
    /^failure\(\)$/i.test(expression) &&
    /name:\s*Preserve failed assurance diagnostics\b/.test(step) &&
    /uses:\s*actions\/upload-artifact@/.test(step)
  ) {
    return false;
  }
  return staticallyEvaluateBooleanExpression(expression, knownValues) === false;
}

function workflowJobHasStaticallyFalseCondition(content, knownValues = {}) {
  const condition = extractYamlCondition(content, [
    /^ {4}(?:if|['"]if['"])\s*:\s*(.*?)\s*$/
  ]);
  if (condition === null) return false;
  const normalized = normalizeWorkflowCondition(condition);
  const expression = normalized.match(/^\$\{\{([\s\S]*)\}\}$/)?.[1]?.trim() ?? normalized;
  return staticallyEvaluateBooleanExpression(expression, knownValues) === false;
}

function workflowStepIndex(content, step) {
  return step ? content.indexOf(step) : -1;
}

function workflowHasExactLine(step, line) {
  const escaped = line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${escaped}\\s*$`, 'm').test(step ?? '');
}

export function inspectReleaseWorkflowPolicy(
  content,
  path = '.github/workflows/release-artifacts.yml'
) {
  const findings = [];
  const steps = workflowSteps(content);
  const hasWorkflowRunTrigger = workflowUsesWorkflowRunTrigger(content);
  const knownValues = hasWorkflowRunTrigger
    ? { 'github.event_name': 'workflow_run' }
    : {};
  findings.push(...inspectReleaseWorkflowTriggerPolicy(content, path));
  const prepublicationGateIndex = content.indexOf('name: Run pre-publication candidate assurance');
  const blockingGateIndex = content.indexOf('name: Run blocking Triple-A release gate');
  const scannerSteps = steps.filter((step) =>
    /uses:\s*aquasecurity\/trivy-action@[0-9a-f]{40}\b/.test(step)
  );
  const buildSteps = steps.filter((step) =>
    /uses:\s*docker\/build-push-action@[0-9a-f]{40}\b/.test(step)
  );
  if (
    workflowJobHasStaticallyFalseCondition(content, knownValues) ||
    workflowYamlHasStaticallyFalseCondition(content, knownValues)
  ) {
    findings.push(`${path}: release jobs must be reachable and cannot use a statically false condition`);
  }
  if (steps.some((step) => workflowStepHasStaticallyFalseCondition(step, knownValues))) {
    findings.push(`${path}: release-path steps must be reachable and cannot use a statically false condition`);
  }
  const publicationMatches = [
    ...content.matchAll(/^\s*push:\s*true\s*$/gm),
    ...content.matchAll(
      /^\s*(?:docker\s+(?:image\s+)?push|docker\s+buildx\s+build\b.*--push|oras\s+(?:cp|copy)\b).*$/gm
    )
  ].sort((left, right) => (left.index ?? 0) - (right.index ?? 0));
  const firstPublicationIndex = publicationMatches[0]?.index ?? -1;

  if (prepublicationGateIndex < 0) {
    findings.push(`${path}: release workflow has no blocking pre-publication assurance gate`);
  }
  if (blockingGateIndex < 0) {
    findings.push(`${path}: release workflow has no blocking final Triple-A gate`);
  }

  const quarantineReferences =
    content.match(
      /^\s*(?:API|WORKER|SPA)_CANDIDATE_IMAGE:\s*ghcr\.io\/.*:quarantine-\$\{\{ github\.run_id \}\}-\$\{\{ github\.event\.workflow_run\.head_sha \}\}\s*$/gm
    ) ?? [];
  if (quarantineReferences.length !== releaseImageArchives.length) {
    findings.push(`${path}: all image candidates must use run-scoped quarantine tags`);
  }

  const digestOnlyRepositories =
    content.match(
      /^\s*(?:API|WORKER|SPA)_IMAGE:\s*ghcr\.io\/\$\{\{ github\.repository_owner \}\}\/cvg-his-v4-(?:api|worker|spa)\s*$/gm
    ) ?? [];
  if (digestOnlyRepositories.length !== releaseImageArchives.length) {
    findings.push(`${path}: release image references must be repository names without tags`);
  }

  if (scannerSteps.length !== releaseImageArchives.length) {
    findings.push(
      `${path}: release workflow must scan exactly ${releaseImageArchives.length} image candidates with a SHA-pinned Trivy action`
    );
  }

  if (buildSteps.length !== releaseImages.length) {
    findings.push(
      `${path}: release workflow must build exactly ${releaseImages.length} OCI image candidates`
    );
  }

  const imageFlowSteps = [];
  const matchedScannerSteps = [];
  for (const image of releaseImages) {
    const buildStep = buildSteps.find(
      (step) =>
        workflowHasExactLine(step, `id: ${image.id}`) &&
        workflowHasExactLine(step, `file: ${image.dockerfile}`) &&
        workflowHasExactLine(step, `outputs: type=oci,dest=${image.archive}`)
    );
    if (
      !buildStep ||
      !workflowHasExactLine(buildStep, 'platforms: linux/amd64') ||
      !workflowHasExactLine(buildStep, 'push: false')
    ) {
      findings.push(
        `${path}: ${image.name} candidate must be built once as a non-pushed linux/amd64 OCI archive`
      );
    }
    const scannerStep = scannerSteps.find((step) =>
      workflowHasExactLine(step, `input: ${image.archive}`)
    );
    if (!scannerStep) {
      findings.push(
        `${path}: release image candidate ${image.archive} is not scanned before publication`
      );
      continue;
    }
    matchedScannerSteps.push(scannerStep);
    imageFlowSteps.push(buildStep, scannerStep);
    if (
      buildStep &&
      workflowStepIndex(content, buildStep) >= workflowStepIndex(content, scannerStep)
    ) {
      findings.push(`${path}: ${image.name} OCI archive is scanned before it is built`);
    }
    if (!/^\s*scanners:\s*vuln\s*$/m.test(scannerStep)) {
      findings.push(
        `${path}: vulnerability scanner for ${image.archive} does not explicitly enable vuln scanning`
      );
    }
    if (!/^\s*severity:\s*(?:HIGH,CRITICAL|CRITICAL,HIGH)\s*$/m.test(scannerStep)) {
      findings.push(
        `${path}: vulnerability scanner for ${image.archive} does not block HIGH and CRITICAL findings`
      );
    }
    if (!/^\s*exit-code:\s*['"]?1['"]?\s*$/m.test(scannerStep)) {
      findings.push(`${path}: vulnerability scanner for ${image.archive} is not fail-closed`);
    }
    if (!/^\s*ignore-unfixed:\s*['"]?false['"]?\s*$/m.test(scannerStep)) {
      findings.push(
        `${path}: vulnerability scanner for ${image.archive} ignores an unspecified vulnerability set`
      );
    }
  }
  if (new Set(matchedScannerSteps).size !== releaseImages.length) {
    findings.push(`${path}: each OCI archive must have one dedicated vulnerability scan`);
  }

  const loadCommands = content.match(/^\s*docker load\b.*$/gm) ?? [];
  const loadStep = steps.find((step) =>
    releaseImages.every((image) =>
      workflowHasExactLine(step, `docker load --platform linux/amd64 --input ${image.archive}`)
    )
  );
  if (
    !loadStep ||
    loadCommands.length !== releaseImages.length ||
    releaseImages.some(
      (image) =>
        !loadCommands.some(
          (command) =>
            command.trim() === `docker load --platform linux/amd64 --input ${image.archive}`
        )
    )
  ) {
    findings.push(`${path}: exactly three scanned linux/amd64 OCI archives must be loaded`);
  }
  if (loadStep) imageFlowSteps.push(loadStep);

  const runtimeValidationSteps = steps.filter((step) =>
    /^\s*run:\s*pnpm validate:release-images\s*$/m.test(step)
  );
  const runtimeValidationStep = runtimeValidationSteps[0];
  const requiredRuntimeValidationBindings = [
    'RELEASE_IMAGE_MODE: prebuilt',
    'RELEASE_SOURCE_SHA: ${{ env.RELEASE_SHA }}',
    'RELEASE_IMAGE_EVIDENCE_OUTPUT: artifacts/release/runtime-image-validation.json',
    ...releaseImages.flatMap((image) => [
      `RELEASE_${image.id.toUpperCase()}_IMAGE_REF: ${image.localReference}`,
      `RELEASE_${image.id.toUpperCase()}_OCI_DIGEST: \${{ steps.${image.id}.outputs.digest }}`,
      `RELEASE_${image.id.toUpperCase()}_OCI_ARCHIVE: ${image.archive}`
    ])
  ];
  if (
    runtimeValidationSteps.length !== 1 ||
    requiredRuntimeValidationBindings.some(
      (binding) => !workflowHasExactLine(runtimeValidationStep, binding)
    )
  ) {
    findings.push(
      `${path}: exact prebuilt image references, digests, archives, source SHA, and runtime evidence must feed release image validation`
    );
  }
  if (runtimeValidationStep) imageFlowSteps.push(runtimeValidationStep);

  if (
    loadStep &&
    runtimeValidationStep &&
    workflowStepIndex(content, loadStep) >= workflowStepIndex(content, runtimeValidationStep)
  ) {
    findings.push(`${path}: exact OCI archives must be loaded before runtime validation`);
  }

  if (/^\s*push:\s*true\s*$/m.test(content)) {
    findings.push(`${path}: release images must not be rebuilt and pushed after local scanning`);
  }

  if (firstPublicationIndex < 0) {
    findings.push(`${path}: release workflow has no explicit image publication step`);
  } else {
    const lastScannerIndex = Math.max(
      ...scannerSteps.map((step) => content.indexOf(step) + step.length),
      -1
    );
    if (prepublicationGateIndex < 0 || firstPublicationIndex < prepublicationGateIndex) {
      findings.push(`${path}: image publication occurs before the pre-publication assurance gate`);
    }
    if (lastScannerIndex < 0 || firstPublicationIndex < lastScannerIndex) {
      findings.push(`${path}: image publication occurs before all vulnerability scans complete`);
    }
    if (
      imageFlowSteps.some(
        (step) => !step || workflowStepIndex(content, step) + step.length > firstPublicationIndex
      )
    ) {
      findings.push(
        `${path}: OCI builds, scans, loads, and exact-image runtime validation must complete before publication`
      );
    }
  }

  if (
    /^\s*(?:run:\s*)?(?:oras\s+(?:cp|copy)\b.*"\$\{(?:API|WORKER|SPA)_IMAGE\}"|(?:oras|docker)\s+tag\b).*$/m.test(
      content
    )
  ) {
    findings.push(`${path}: release repository references must never be published as mutable tags`);
  }

  for (const artifactStepName of [
    'name: Generate complete Triple-A evidence package',
    'name: Publish certified release manifest and evidence'
  ]) {
    const artifactStep = steps.find((step) => step.includes(artifactStepName));
    if (!artifactStep || content.indexOf(artifactStep) < blockingGateIndex) {
      findings.push(
        `${path}: ${artifactStepName.slice(6)} occurs before the blocking Triple-A gate`
      );
    } else if (/^\s*if:\s*always\(\)\s*$/m.test(artifactStep)) {
      findings.push(
        `${path}: ${artifactStepName.slice(6)} may expose a release manifest after a failed gate`
      );
    }
  }

  if (!/oras\s+(?:cp|copy)\s+--recursive\s+--from-oci-layout/.test(content)) {
    findings.push(
      `${path}: vetted OCI candidates are not published recursively from their scanned layouts`
    );
  }

  const orasCopyCommands = content.match(/^\s*oras\s+copy\b.*$/gm) ?? [];
  const orasResolveChecks = content.match(/^\s*test\s+"\$\(oras resolve\b.*$/gm) ?? [];
  const publicationStep = steps.find((step) => /^\s*oras\s+copy\b/m.test(step));
  const expectedPublicationCommands = releaseImages.flatMap((image) => [
    `oras copy --recursive --from-oci-layout "/tmp/${image.id}-image:\${RELEASE_SHA}" "\${${image.candidateVariable}}"`,
    `test "$(oras resolve "\${${image.candidateVariable}}")" = "\${${image.digestVariable}}"`
  ]);
  const requiredPublicationDigestBindings = releaseImages.map(
    (image) => `${image.digestVariable}: \${{ steps.${image.id}.outputs.digest }}`
  );
  if (
    orasCopyCommands.length !== releaseImages.length ||
    orasResolveChecks.length !== releaseImages.length ||
    expectedPublicationCommands.some(
      (command) => !workflowHasExactLine(publicationStep, command)
    ) ||
    requiredPublicationDigestBindings.some(
      (binding) => !workflowHasExactLine(publicationStep, binding)
    )
  ) {
    findings.push(
      `${path}: publication must copy and resolve all three vetted OCI archives against their build digests`
    );
  }

  const certifiedUploadStep = steps.find((step) =>
    step.includes('name: Publish certified release manifest and evidence')
  );
  if (
    !workflowHasExactLine(
      runtimeValidationStep,
      'RELEASE_IMAGE_EVIDENCE_OUTPUT: artifacts/release/runtime-image-validation.json'
    ) ||
    !certifiedUploadStep ||
    !/^\s*artifacts\/release\/\s*$/m.test(certifiedUploadStep)
  ) {
    findings.push(
      `${path}: runtime image evidence must be written under and uploaded from artifacts/release`
    );
  }

  return findings;
}

function dockerInstructions(content) {
  const instructions = [];
  let logicalLine = '';
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!logicalLine && (!line || line.startsWith('#'))) continue;
    const continues = line.endsWith('\\');
    const fragment = continues ? line.slice(0, -1).trim() : line;
    logicalLine = `${logicalLine} ${fragment}`.trim();
    if (continues) continue;
    const match = logicalLine.match(/^([A-Za-z]+)\s+([\s\S]+)$/);
    if (match) {
      instructions.push({ keyword: match[1].toUpperCase(), value: match[2].trim() });
    }
    logicalLine = '';
  }
  return instructions;
}

function finalDockerStage(instructions) {
  const finalFromIndex = instructions.findLastIndex(({ keyword }) => keyword === 'FROM');
  return finalFromIndex >= 0 ? instructions.slice(finalFromIndex) : instructions;
}

function lastInstruction(instructions, keyword) {
  return instructions.findLast((instruction) => instruction.keyword === keyword)?.value;
}

function failClosedWgetHealthcheck(value, url) {
  const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `^(?:--[^\\s]+\\s+)*CMD\\s+wget\\s+-qO-\\s+["']?${escapedUrl}["']?(?:\\s+>\\/dev\\/null)?\\s+\\|\\|\\s+exit\\s+1$`,
    'i'
  ).test(value ?? '');
}

function runReopensAppPayload(run) {
  for (const command of run.split(/&&|;/)) {
    if (!/(?:^|\s)\/app(?:\/|\s|$)/.test(command)) continue;
    if (
      /\b(?:chown|touch|cp|mv|install|mkdir|rm|ln|tee)\b/i.test(command) ||
      /\bsed\b[^;&]*\s-i(?:\s|$)/i.test(command) ||
      /(?:^|\s)>{1,2}\s*\/app(?:\/|\s|$)/.test(command)
    ) {
      return true;
    }

    const chmod = command.match(/\bchmod\b\s+(?:-[^\s]+\s+)*([^\s]+)\s+/i);
    if (!chmod) continue;
    const mode = chmod[1];
    if (/^0?[0-7]{3,4}$/.test(mode)) {
      if (/[2367]/.test(mode.slice(-3))) return true;
      continue;
    }
    if (/^[ugoa]*-[rwxXst]+(?:,[ugoa]*-[rwxXst]+)*$/.test(mode)) continue;
    if (/[+=][^,]*w/.test(mode)) return true;
    return true;
  }
  return false;
}

export function inspectProductionRuntimeDockerfilePolicy(
  content,
  {
    path,
    packageName,
    deployDirectory,
    healthcheck = false,
    healthcheckPortVariable = 'PORT',
    databaseMaintenance = false
  }
) {
  const findings = [];
  const instructions = dockerInstructions(content);
  const finalStage = finalDockerStage(instructions);
  const allRuns = instructions
    .filter(({ keyword }) => keyword === 'RUN')
    .map(({ value }) => value)
    .join('\n');
  const finalRuns = finalStage
    .filter(({ keyword }) => keyword === 'RUN')
    .map(({ value }) => value)
    .join('\n');
  const payloadHardeningIndex = finalStage.findIndex(
    ({ keyword, value }) => keyword === 'RUN' && value.includes('chmod -R a-w /app')
  );

  if (!allRuns.includes(`pnpm --filter ${packageName} deploy --prod /prod/${deployDirectory}`)) {
    findings.push(`${path}: production runtime is not assembled from a pnpm --prod deploy closure`);
  }
  if (
    databaseMaintenance &&
    !allRuns.includes('pnpm --filter @cvg-his/db deploy --prod /prod/api/packages/db')
  ) {
    findings.push(`${path}: API image omits the database maintenance deploy closure`);
  }
  if (
    !/^node:[^\s]+-alpine[^\s]*@sha256:[0-9a-f]{64}\s+AS\s+runner$/i.test(
      finalStage[0]?.value ?? ''
    )
  ) {
    findings.push(`${path}: final Node runtime must use an immutable Alpine runner`);
  }
  const finalArtifactTransfers = finalStage.filter(({ keyword }) =>
    ['COPY', 'ADD'].includes(keyword)
  );
  if (
    finalArtifactTransfers.length !== 1 ||
    finalArtifactTransfers[0]?.keyword !== 'COPY' ||
    finalArtifactTransfers[0]?.value !== `--from=builder /prod/${deployDirectory} ./`
  ) {
    findings.push(`${path}: final runtime does not copy only the production deploy closure`);
  }
  if (finalArtifactTransfers.some(({ value }) => /--chown=(?:node|\d+)/i.test(value))) {
    findings.push(`${path}: application payload must remain root-owned at runtime`);
  }
  for (const forbiddenToolPath of [
    '/usr/local/lib/node_modules/npm',
    '/usr/local/lib/node_modules/corepack',
    '/usr/local/bin/npm',
    '/usr/local/bin/npx',
    '/usr/local/bin/corepack',
    '/usr/local/lib/node_modules/pnpm',
    '/usr/local/bin/pnpm',
    '/usr/local/bin/yarn',
    '/usr/local/bin/yarnpkg',
    '/opt/yarn-v1.22.22'
  ]) {
    if (!finalRuns.includes(forbiddenToolPath)) {
      findings.push(`${path}: final runtime cleanup omits ${forbiddenToolPath}`);
    }
  }
  if (/\bchown\b[^\n;&]*\s\/app(?:\/|\s|$)/i.test(finalRuns) || payloadHardeningIndex < 0) {
    findings.push(`${path}: application payload is not immutable to the runtime principal`);
  }
  if (
    payloadHardeningIndex >= 0 &&
    finalStage
      .slice(payloadHardeningIndex + 1)
      .some(({ keyword, value }) => keyword === 'RUN' && runReopensAppPayload(value))
  ) {
    findings.push(`${path}: a RUN after payload hardening makes /app writable again`);
  }
  if (lastInstruction(finalStage, 'USER') !== 'node') {
    findings.push(`${path}: final runtime is not configured for the non-root node user`);
  }
  if (
    !/^\[\s*["']node["']\s*,\s*["']dist\/index\.js["']\s*\]$/.test(
      lastInstruction(finalStage, 'CMD') ?? ''
    )
  ) {
    findings.push(`${path}: final runtime command does not execute the deployed application root`);
  }
  if (
    healthcheck &&
    !failClosedWgetHealthcheck(
      lastInstruction(finalStage, 'HEALTHCHECK'),
      `http://127.0.0.1:\${${healthcheckPortVariable}}/ready`
    )
  ) {
    findings.push(`${path}: API healthcheck must use wget and fail closed in the Alpine runtime`);
  }

  return findings;
}

export function inspectSpaRuntimeDockerfilePolicy(content, path = 'apps/spa/Dockerfile') {
  const findings = [];
  const instructions = dockerInstructions(content);
  const finalStage = finalDockerStage(instructions);
  const finalRuns = finalStage
    .filter(({ keyword }) => keyword === 'RUN')
    .map(({ value }) => value)
    .join('\n');
  if (
    !/^nginx:[^\s]+-alpine[^\s]*@sha256:[0-9a-f]{64}\s+AS\s+runner$/i.test(
      finalStage[0]?.value ?? ''
    )
  ) {
    findings.push(`${path}: final SPA runtime must use an immutable Alpine nginx runner`);
  }
  const finalArtifactTransfers = finalStage.filter(({ keyword }) =>
    ['COPY', 'ADD'].includes(keyword)
  );
  const expectedArtifactTransfers = [
    {
      keyword: 'COPY',
      value: 'infra/helm/cvg-his-v2/files/spa-nginx.conf /etc/nginx/conf.d/default.conf'
    },
    { keyword: 'COPY', value: '--from=builder /app/apps/spa/dist .' }
  ];
  if (
    finalArtifactTransfers.length !== expectedArtifactTransfers.length ||
    expectedArtifactTransfers.some(
      (expected) =>
        !finalArtifactTransfers.some(
          (actual) => actual.keyword === expected.keyword && actual.value === expected.value
        )
    )
  ) {
    findings.push(`${path}: final SPA runtime must copy only the built static assets`);
  }
  const nginxTemplateCopies = finalStage.filter(
    ({ keyword, value }) =>
      keyword === 'COPY' && value.includes('infra/helm/cvg-his-v2/files/spa-nginx.conf')
  );
  if (
    nginxTemplateCopies.length !== 1 ||
    nginxTemplateCopies[0]?.value !==
      'infra/helm/cvg-his-v2/files/spa-nginx.conf /etc/nginx/conf.d/default.conf' ||
    !finalRuns.includes('s!__API_RESOLVER__!resolver 127.0.0.11 valid=10s ipv6=off;!') ||
    !finalRuns.includes('s!__API_UPSTREAM__!cvg-his-v2-api:3001 resolve!')
  ) {
    findings.push(
      `${path}: Docker SPA runtime must render the canonical nginx template for Compose DNS`
    );
  }
  if (/chown\s+[^\n]*(?:\/usr\/share\/nginx\/html|\/etc\/nginx)/i.test(finalRuns)) {
    findings.push(`${path}: SPA content and configuration must remain root-owned`);
  }
  if (
    !finalRuns.includes('pid /tmp/nginx.pid;') ||
    !finalRuns.includes('chown -R nginx:nginx /var/cache/nginx') ||
    !finalRuns.includes(
      'chmod -R a-w /usr/share/nginx/html /etc/nginx/conf.d /etc/nginx/nginx.conf'
    )
  ) {
    findings.push(`${path}: nginx writable runtime paths and immutable payload are incomplete`);
  }
  if (lastInstruction(finalStage, 'USER') !== 'nginx') {
    findings.push(`${path}: final SPA runtime is not configured for the non-root nginx user`);
  }
  if (lastInstruction(finalStage, 'CMD') !== '["nginx", "-g", "daemon off;"]') {
    findings.push(`${path}: final SPA runtime command does not start nginx`);
  }
  if (
    !failClosedWgetHealthcheck(lastInstruction(finalStage, 'HEALTHCHECK'), 'http://127.0.0.1:3002/')
  ) {
    findings.push(`${path}: SPA healthcheck must fail closed in the final runtime stage`);
  }
  return findings;
}

function shellCommands(content, commandPrefix) {
  const lines = content.split(/\r?\n/);
  const commands = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index]?.trimStart().startsWith(commandPrefix)) continue;
    const commandLines = [];
    while (index < lines.length) {
      const line = lines[index];
      commandLines.push(line.trim());
      if (!line.trimEnd().endsWith('\\')) break;
      index += 1;
    }
    commands.push(commandLines.join(' '));
  }
  return commands;
}

function shellStructuralLines(content) {
  const lines = content.split(/\r?\n/);
  const result = [];
  const stack = [];
  let quote = null;
  let heredocDelimiter = null;
  let pendingFunctionDeclaration = null;
  const activeFunction = () =>
    stack.findLast((scope) => scope.startsWith('function:'))?.slice('function:'.length) ?? null;

  for (const raw of lines) {
    if (heredocDelimiter) {
      if (raw.trim() === heredocDelimiter) heredocDelimiter = null;
      result.push({ raw, code: '', topLevel: stack.length === 0, functionName: activeFunction() });
      continue;
    }

    const declaredHeredoc = raw.match(
      /(?<!<)<<(?!<)-?\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))/
    );
    const nextHeredocDelimiter =
      declaredHeredoc?.[1] ?? declaredHeredoc?.[2] ?? declaredHeredoc?.[3] ?? null;

    let code = '';
    for (let index = 0; index < raw.length; index += 1) {
      const character = raw[index];
      if (quote) {
        if (character === quote && (quote === "'" || raw[index - 1] !== '\\')) {
          quote = null;
        }
        code += ' ';
        continue;
      }
      if (character === '#' && (index === 0 || /\s/.test(raw[index - 1] ?? ''))) break;
      if (character === "'" || character === '"') {
        quote = character;
        code += ' ';
        continue;
      }
      if (character === '\\') {
        code += '  ';
        index += 1;
        continue;
      }
      code += character;
    }
    heredocDelimiter = nextHeredocDelimiter;

    const statement = code.trim();
    const inlineFunction = statement.match(
      /^(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)\s*\{\s*$/
    );
    const namedInlineFunction = statement.match(/^function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{\s*$/);
    const splitFunction = statement.match(
      /^(?:(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)|function\s+([A-Za-z_][A-Za-z0-9_]*))\s*$/
    );
    const definedFunction =
      inlineFunction?.[1] ?? namedInlineFunction?.[1] ?? splitFunction?.[1] ?? splitFunction?.[2];

    let openedPendingFunction = false;
    if (pendingFunctionDeclaration && statement) {
      if (/^\{\s*$/.test(statement)) {
        stack.push(`function:${pendingFunctionDeclaration}`);
        openedPendingFunction = true;
      }
      pendingFunctionDeclaration = null;
    }
    if (/^(?:fi|done|esac)\b/.test(statement) || /^}\s*$/.test(statement)) stack.pop();
    result.push({
      raw,
      code,
      topLevel: stack.length === 0,
      functionName: activeFunction(),
      definesFunction: definedFunction ?? null
    });

    if (inlineFunction || namedInlineFunction) {
      stack.push(`function:${definedFunction}`);
    } else if (splitFunction) {
      pendingFunctionDeclaration = definedFunction;
    } else if (/^if(?:\s|$)/.test(statement)) {
      stack.push('if');
    } else if (/^(?:for|while|until|select)(?:\s|$)/.test(statement)) {
      stack.push('loop');
    } else if (/^case(?:\s|$)/.test(statement)) {
      stack.push('case');
    } else if (!openedPendingFunction && /^\{\s*$/.test(statement)) {
      stack.push('group');
    }
  }

  return result;
}

function shellStatements(raw) {
  const statements = [];
  let statement = '';
  let quote = null;

  const flush = () => {
    if (statement.trim()) statements.push(statement.trim());
    statement = '';
  };

  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    if (quote) {
      statement += character;
      if (character === quote && (quote === "'" || raw[index - 1] !== '\\')) quote = null;
      continue;
    }
    if (character === '#' && (index === 0 || /\s/.test(raw[index - 1] ?? ''))) break;
    if (character === "'" || character === '"') {
      quote = character;
      statement += character;
      continue;
    }
    if (character === '\\' && index + 1 < raw.length) {
      statement += character + raw[index + 1];
      index += 1;
      continue;
    }
    if (character === ';' || ['&&', '||'].includes(raw.slice(index, index + 2))) {
      flush();
      if (character !== ';') index += 1;
      continue;
    }
    statement += character;
  }
  flush();
  return statements;
}

function shellCommandStatement(statement) {
  return statement.replace(/^(?:(?:then|do|else|elif|\{)\s+)+/, '').trim();
}

function shellWords(command) {
  const words = [];
  let word = '';
  let quote = null;
  let escaped = false;
  const flush = () => {
    if (word || words.length > 0) words.push(word);
    word = '';
  };

  for (const character of command) {
    if (escaped) {
      word += character;
      escaped = false;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      else word += character;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (/\s/.test(character)) {
      flush();
      continue;
    }
    word += character;
  }
  if (word) flush();
  return words;
}

function shellTrapAction(command) {
  const match = command.match(/^(?:(?:builtin|command)\s+)?trap\b([\s\S]*)$/);
  if (!match) return null;
  const words = shellWords(match[1].trim());
  if (words[0] === '--') words.shift();
  const action = words.shift();
  if (
    !action ||
    action.startsWith('-') ||
    !words.some((signal) => signal === 'EXIT' || signal === '0')
  ) {
    return null;
  }
  return action;
}

function shellCommandCallsFunction(command, functionName) {
  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    new RegExp(
      `^(?:(?:if|while|until)\\s+)?(?:!\\s+)?(?:command\\s+)?${escaped}(?:\\s|$)`
    ).test(command) || new RegExp(`\\$\\(\\s*${escaped}(?:\\s|\\))`).test(command)
  );
}

function shellTrapCallsFunction(command, functionName) {
  const action = shellTrapAction(command);
  if (!action) return false;

  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^A-Za-z0-9_])${escaped}(?:[^A-Za-z0-9_]|$)`).test(action);
}

function shellStatusZeroMutation(statement) {
  const arithmetic = statement.match(/^\(\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*0\s*\)\)$/);
  if (arithmetic?.[1] === 'status') return { local: false };

  const assignment = statement.match(
    /^(?:(local|export|readonly)\s+)*status=(?:(['"])0\2|0)\s*$/
  );
  if (!assignment) return null;
  return { local: assignment[1] === 'local' };
}

function successfulReachableTermination(structuralLines) {
  const inheritedExitStatus = Symbol('inherited-exit-status');
  const definedFunctions = new Set(
    structuralLines.map(({ definesFunction }) => definesFunction).filter(Boolean)
  );
  const reachableFunctions = new Set();
  let discoveredFunction = true;
  while (discoveredFunction) {
    discoveredFunction = false;
    for (const { raw, functionName } of structuralLines) {
      if (functionName && !reachableFunctions.has(functionName)) continue;
      for (const statement of shellStatements(raw)) {
        const command = shellCommandStatement(statement);
        for (const candidate of definedFunctions) {
          if (shellCommandCallsFunction(command, candidate) || shellTrapCallsFunction(command, candidate)) {
            if (!reachableFunctions.has(candidate)) {
              reachableFunctions.add(candidate);
              discoveredFunction = true;
            }
          }
        }
      }
    }
  }

  const functionCalls = new Map();
  const functionsWithLocalStatus = new Set();
  const directStatusMutators = new Set();
  for (const functionName of definedFunctions) {
    functionCalls.set(functionName, new Set());
  }
  for (const { raw, functionName } of structuralLines) {
    if (!functionName) continue;
    const statements = shellStatements(raw).map(shellCommandStatement);
    if (statements.some((statement) => /^local\s+status(?:=|\s|$)/.test(statement))) {
      functionsWithLocalStatus.add(functionName);
    }
  }
  for (const { raw, functionName } of structuralLines) {
    if (!functionName) continue;
    const statements = shellStatements(raw).map(shellCommandStatement);
    for (const statement of statements) {
      const mutation = shellStatusZeroMutation(statement);
      if (mutation && !mutation.local && !functionsWithLocalStatus.has(functionName)) {
        directStatusMutators.add(functionName);
      }
      for (const candidate of definedFunctions) {
        if (shellCommandCallsFunction(statement, candidate)) {
          functionCalls.get(functionName)?.add(candidate);
        }
      }
    }
  }

  const statusMutatingFunctions = new Set(directStatusMutators);
  let discoveredStatusMutator = true;
  while (discoveredStatusMutator) {
    discoveredStatusMutator = false;
    for (const functionName of definedFunctions) {
      if (functionsWithLocalStatus.has(functionName) || statusMutatingFunctions.has(functionName)) {
        continue;
      }
      if ([...(functionCalls.get(functionName) ?? [])].some((candidate) =>
        statusMutatingFunctions.has(candidate)
      )) {
        statusMutatingFunctions.add(functionName);
        discoveredStatusMutator = true;
      }
    }
  }

  const successfulExit = (statement, scopeVariables) => {
    const exit = statement.match(/^(?:builtin\s+)?exit(?:\s+(.+?))?\s*$/);
    if (!exit) return null;
    const argument = (exit[1] ?? '').trim().replace(/^(['"])(.*)\1$/, '$2');
    if (!argument) return 'exit';

    let status;
    if (/^[+-]?\d+$/.test(argument)) {
      status = BigInt(argument);
    } else {
      const variable = argument.match(
        /^\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))$/
      );
      status = scopeVariables.get(variable?.[1] ?? variable?.[2]);
    }
    if (status === inheritedExitStatus) return null;
    if (status === undefined || status % 256n === 0n) return 'exit';
    return null;
  };

  const integerVariables = new Map();

  for (const { raw, functionName } of structuralLines) {
    if (functionName && !reachableFunctions.has(functionName)) continue;
    const scopeVariables = integerVariables.get(functionName ?? '') ?? new Map();
    integerVariables.set(functionName ?? '', scopeVariables);
    for (const rawStatement of shellStatements(raw)) {
      const statement = shellCommandStatement(rawStatement);
      const trapAction = shellTrapAction(statement);
      if (trapAction) {
        const trapVariables = new Map();
        for (const actionStatement of shellStatements(trapAction)) {
          const action = shellCommandStatement(actionStatement);
          for (const candidate of statusMutatingFunctions) {
            if (shellCommandCallsFunction(action, candidate)) trapVariables.set('status', 0n);
          }
          if (/^(?:(?:builtin|command)\s+)?exec(?:\s|$)/.test(action)) return 'exec';
          const trapTermination = successfulExit(action, trapVariables);
          if (trapTermination) return trapTermination;
        }
        continue;
      }
      const inheritedExitStatusAssignment = statement.match(
        /^(?:(?:local|export|readonly)\s+)*([A-Za-z_][A-Za-z0-9_]*)=\$\?\s*$/
      );
      if (inheritedExitStatusAssignment) {
        scopeVariables.set(inheritedExitStatusAssignment[1], inheritedExitStatus);
        continue;
      }
      const assignment = statement.match(
        /^(?:export\s+|readonly\s+)?([A-Za-z_][A-Za-z0-9_]*)=(?:(["'])([+-]?\d+)\2|([+-]?\d+))\s*$/
      );
      if (assignment) {
        scopeVariables.set(assignment[1], BigInt(assignment[3] ?? assignment[4]));
        continue;
      }
      const arithmetic = statement.match(/^\(\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*0\s*\)\)$/);
      if (arithmetic) {
        scopeVariables.set(arithmetic[1], 0n);
        continue;
      }
      const assignedName = statement.match(
        /^(?:(?:local|export|readonly)\s+)*([A-Za-z_][A-Za-z0-9_]*)=/
      )?.[1];
      if (assignedName) scopeVariables.delete(assignedName);

      if (/^(?:(?:builtin|command)\s+)?exec(?:\s|$)/.test(statement)) return 'exec';

      if (functionName) {
        for (const candidate of statusMutatingFunctions) {
          if (shellCommandCallsFunction(statement, candidate)) scopeVariables.set('status', 0n);
        }
      }
      const termination = successfulExit(statement, scopeVariables);
      if (termination) return termination;

    }
  }

  return null;
}

export function inspectReleaseImageValidationPolicy(
  content,
  path = 'scripts/validate-release-images.sh'
) {
  const findings = [];
  const structuralLines = shellStructuralLines(content);
  const unquotedCode = structuralLines.map(({ code }) => code).join('\n');
  const requiredTopLevelOperations = [
    'case "${release_image_mode}" in',
    'if [[ -z "${RELEASE_IMAGE_DATABASE_URL:-}" ]]',
    'if [[ "${RELEASE_IMAGE_DATABASE_URL}" != "${expected_release_database_url}" ]]',
    'postgres_container="$(docker compose -f docker-compose.test.yml ps -q postgres-test',
    'if [[ -z "${postgres_container}" ]]',
    'postgres_health="$(docker inspect --format',
    'if [[ "${postgres_health}" != \'healthy\' ]]',
    'if [[ "${release_image_mode}" == \'build\' ]]; then',
    '"${helm_bin}" template cvg-his-v2-prod infra/helm/cvg-his-v2',
    'docker run --rm --network host',
    'docker run --detach --name "${api_container}"',
    'docker run --detach --name "${worker_container}"',
    'docker run --detach --name "${spa_container}"',
    'wait_for_http "http://127.0.0.1:${api_port}/ready"',
    'wait_for_http "http://127.0.0.1:${worker_port}/ready"',
    'wait_for_http "http://127.0.0.1:${spa_port}/api/live"'
  ];
  if (
    requiredTopLevelOperations.some(
      (marker) =>
        !structuralLines.some(({ raw, topLevel }) => topLevel && raw.trimStart().startsWith(marker))
    )
  ) {
    findings.push(
      `${path}: critical release validation operations must execute at top level, not inside a conditional, loop, or function`
    );
  }
  if (
    /(?:^|[;&|]\s*)false\s*&&/m.test(unquotedCode) ||
    /(?:^|[;&|]\s*)true\s*\|\|/m.test(unquotedCode) ||
    /^\s*(?:if|while)\s+(?:false|\(\(\s*0\s*\)\))(?:\s*;\s*then|\s*;\s*do|\s*$)/m.test(
      unquotedCode
    ) ||
    /^\s*until\s+(?:true|\(\(\s*1\s*\)\))(?:\s*;\s*do|\s*$)/m.test(unquotedCode)
  ) {
    findings.push(`${path}: constant shell control flow can bypass release image validation`);
  }

  const modeBranches = content.match(
    /^if \[\[ "\$\{release_image_mode\}" == 'build' \]\]; then\s*\n([\s\S]*?)^else\s*\n([\s\S]*?)^fi\s*$/m
  );
  const buildBranch = modeBranches?.[1] ?? '';
  const prebuiltBranch = modeBranches?.[2] ?? '';
  const expectedBuildCommands = [
    'docker build --progress plain --file apps/api/Dockerfile --tag "${api_image}" .',
    'docker build --progress plain --file apps/worker/Dockerfile --tag "${worker_image}" .',
    'docker build --progress plain --file apps/spa/Dockerfile --tag "${spa_image}" .'
  ];
  const actualBuildCommands = (buildBranch.match(/^\s*docker build\b.*$/gm) ?? []).map((line) =>
    line.trim()
  );
  const allBuildCommands = unquotedCode.match(/^\s*docker build\b.*$/gm) ?? [];
  if (
    !modeBranches ||
    actualBuildCommands.length !== expectedBuildCommands.length ||
    expectedBuildCommands.some((command) => !actualBuildCommands.includes(command)) ||
    allBuildCommands.length !== expectedBuildCommands.length
  ) {
    findings.push(`${path}: build mode must build exactly the API, worker, and SPA images`);
  }
  if (/^\s*docker build\b/m.test(prebuiltBranch)) {
    findings.push(`${path}: prebuilt mode must not rebuild release images`);
  }

  const prebuiltConfiguration =
    content.match(/^\s*prebuilt\)\s*\n([\s\S]*?)^\s*;;\s*$/m)?.[1] ?? '';
  const requiredPrebuiltInputs = [
    'RELEASE_API_IMAGE_REF',
    'RELEASE_WORKER_IMAGE_REF',
    'RELEASE_SPA_IMAGE_REF',
    'RELEASE_API_OCI_DIGEST',
    'RELEASE_WORKER_OCI_DIGEST',
    'RELEASE_SPA_OCI_DIGEST',
    'RELEASE_API_OCI_ARCHIVE',
    'RELEASE_WORKER_OCI_ARCHIVE',
    'RELEASE_SPA_OCI_ARCHIVE'
  ];
  const requiredPrebuiltAssignments = [
    'api_image="${RELEASE_API_IMAGE_REF}"',
    'worker_image="${RELEASE_WORKER_IMAGE_REF}"',
    'spa_image="${RELEASE_SPA_IMAGE_REF}"',
    'api_oci_digest="${RELEASE_API_OCI_DIGEST}"',
    'worker_oci_digest="${RELEASE_WORKER_OCI_DIGEST}"',
    'spa_oci_digest="${RELEASE_SPA_OCI_DIGEST}"'
  ];
  if (
    !prebuiltConfiguration ||
    !prebuiltConfiguration.includes('if [[ -z "${!variable_name:-}" ]]') ||
    requiredPrebuiltInputs.some((input) => !prebuiltConfiguration.includes(input)) ||
    requiredPrebuiltAssignments.some((assignment) => !prebuiltConfiguration.includes(assignment)) ||
    !prebuiltConfiguration.includes('if [[ ! "${digest}" =~ ^sha256:[0-9a-f]{64}$ ]]')
  ) {
    findings.push(
      `${path}: prebuilt mode must require and bind three image references, OCI digests, and archives`
    );
  }

  const requiredBindingCalls = [
    'API "${api_image}" "${api_oci_digest}" "${RELEASE_API_OCI_ARCHIVE}"',
    'worker "${worker_image}" "${worker_oci_digest}" "${RELEASE_WORKER_OCI_ARCHIVE}"',
    'SPA "${spa_image}" "${spa_oci_digest}" "${RELEASE_SPA_OCI_ARCHIVE}"'
  ];
  const requiredBindingChecks = [
    'observed_image_id="$(docker image inspect --format \'{{.Id}}\' "${image}")"',
    'observed_repo_digests="$(docker image inspect --format \'{{range .RepoDigests}}{{println .}}{{end}}\' "${image}")"',
    'descriptor.digest === expectedDigest',
    'rootDescriptors.length !== 1',
    'hash(bytes) !== digest',
    '"${observed_image_id}" != "${expected_digest}" &&',
    '"${observed_image_id}" != "${config_digest}" &&',
    '"${observed_repo_digests}" != *"@${expected_digest}"*'
  ];
  if (
    requiredBindingCalls.some((call) => !prebuiltBranch.includes(call)) ||
    requiredBindingChecks.some((check) => !content.includes(check))
  ) {
    findings.push(
      `${path}: prebuilt images must be inspected and bound to their OCI archive digests`
    );
  }
  const firstBuildIndex = content.indexOf('docker build');
  const requiredPrebuildMarkers = [
    'if [[ -z "${RELEASE_IMAGE_DATABASE_URL:-}" ]]',
    'if [[ "${RELEASE_IMAGE_DATABASE_URL}" != "${expected_release_database_url}" ]]',
    'postgres_container="$(docker compose -f docker-compose.test.yml ps -q postgres-test',
    '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}',
    'if [[ "${postgres_health}" != \'healthy\' ]]'
  ];
  if (
    firstBuildIndex < 0 ||
    requiredPrebuildMarkers.some((marker) => {
      const markerIndex = content.indexOf(marker);
      return markerIndex < 0 || markerIndex > firstBuildIndex;
    })
  ) {
    findings.push(
      `${path}: local disposable database identity and health must be required before building images`
    );
  }
  if (
    !content.includes(
      'expected_release_database_url="postgres://postgres:postgres@127.0.0.1:5433/${release_database}"'
    )
  ) {
    findings.push(
      `${path}: release image validation database URL is not bound to the local fixture`
    );
  }
  const successfulTermination = successfulReachableTermination(structuralLines);
  if (successfulTermination === 'exit') {
    findings.push(`${path}: reachable successful exit can bypass release image validation`);
  } else if (successfulTermination === 'exec') {
    findings.push(`${path}: reachable process replacement can bypass release image validation`);
  }
  const immutableAppPayloadChecks = [
    'writable_payload="$(find /app -type f -perm /222 -print -quit)"',
    'test -z "${writable_payload}"'
  ];
  const hasImmutableAppPayloadCheck = immutableAppPayloadChecks.every((check) =>
    structuralLines.some(
      ({ raw, functionName }) => functionName === 'assert_node_image' && raw.trim() === check
    )
  );
  const hasNodeImageAssertion = (image) =>
    structuralLines.some(
      ({ raw, topLevel }) =>
        topLevel && raw.trimStart().startsWith(`assert_node_image "\${${image}_image}"`)
    );
  if (
    !hasImmutableAppPayloadCheck ||
    !hasNodeImageAssertion('api') ||
    !hasNodeImageAssertion('worker')
  ) {
    findings.push(
      `${path}: API and worker validation must reject every writable regular file under /app`
    );
  }
  const commands = shellCommands(content, 'docker run');
  const findCommand = (needle) => commands.find((command) => command.includes(needle));
  const requireHelmContainerContext = (label, command, { storage = false } = {}) => {
    if (!command) {
      findings.push(`${path}: ${label} validation command is missing`);
      return;
    }
    if (!command.includes('--read-only') || !command.includes('--user 10000:10000')) {
      findings.push(
        `${path}: ${label} does not reproduce the Helm read-only UID/GID 10000 context`
      );
    }
    if (
      !command.includes('--cap-drop ALL') ||
      !command.includes('--security-opt no-new-privileges')
    ) {
      findings.push(
        `${path}: ${label} does not reproduce the Helm dropped-capability/no-new-privileges context`
      );
    }
    if (
      storage &&
      !command.includes(
        '--tmpfs /srv/cvg-his-v2/storage:rw,noexec,nosuid,size=32m,uid=10000,gid=10000,mode=0750'
      )
    ) {
      findings.push(`${path}: ${label} does not reproduce the Helm writable storage volume`);
    }
  };

  requireHelmContainerContext(
    'database migration',
    findCommand('node packages/db/dist/migrate.js')
  );
  requireHelmContainerContext(
    'runtime-role reconciliation',
    findCommand('node packages/db/dist/reconcile-runtime-roles.js')
  );
  requireHelmContainerContext('API readiness', findCommand('--name "${api_container}"'));
  requireHelmContainerContext('worker readiness', findCommand('--name "${worker_container}"'));
  requireHelmContainerContext('SPA readiness', findCommand('--name "${spa_container}"'));

  const apiCommand = findCommand('--name "${api_container}"');
  if (!apiCommand?.includes('--network-alias cvg-his-v2-prod-cvg-his-v2-api')) {
    findings.push(
      `${path}: API runtime lacks the release-scoped Helm Service alias for proxy validation`
    );
  }
  const helmSpaCommand = commands.find(
    (command) =>
      command.includes('--name "${spa_container}"') &&
      command.includes('${spa_proxy_config_dir}/default.conf:/etc/nginx/conf.d/default.conf:ro')
  );
  requireHelmContainerContext('Helm-rendered SPA proxy readiness', helmSpaCommand);
  if (!helmSpaCommand?.includes('--network "${validation_network}"')) {
    findings.push(`${path}: Helm-rendered SPA proxy is not tested on the API validation network`);
  }

  for (const marker of [
    'template cvg-his-v2-prod infra/helm/cvg-his-v2',
    'cvg-his-v2-prod-cvg-his-v2-spa-config-nginx',
    'server cvg-his-v2-prod-cvg-his-v2-api:3001;',
    '${spa_port}/api/live'
  ]) {
    if (!content.includes(marker)) {
      findings.push(`${path}: Helm-rendered SPA proxy check is missing ${marker}`);
    }
  }

  for (const [label, endpoint] of [
    ['API', '${api_port}/ready'],
    ['worker', '${worker_port}/ready']
  ]) {
    if (!content.includes(endpoint)) {
      findings.push(`${path}: ${label} production readiness endpoint is not exercised`);
    }
  }
  return findings;
}

export function inspectSupplyChain({ rootDirectory = root } = {}) {
  const findings = [];
  const workflowRoot = resolve(rootDirectory, '.github/workflows');
  const workflowPaths = workflowFiles(workflowRoot);
  let actionCount = 0;
  let workflowImageCount = 0;
  let composeImageCount = 0;
  let helmImageCount = 0;
  let dockerBaseCount = 0;
  let runtimeImageCount = 0;

  for (const path of workflowPaths) {
    const content = readFileSync(path, 'utf8');
    const relativeWorkflow = relative(rootDirectory, path).split('\\').join('/');
    const actions = content.match(/^\s*(?:-\s*)?uses:\s*[^\s#]+/gm) ?? [];
    actionCount += actions.length;
    for (const match of content.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)) {
      const reference = match[1];
      const at = reference.lastIndexOf('@');
      const ref = at >= 0 ? reference.slice(at + 1) : '';
      if (!reference.startsWith('./') && !shaRef.test(ref)) {
        findings.push(`${relativeWorkflow}: ${reference} is not pinned to a full commit SHA`);
      }
    }
    for (const match of content.matchAll(/^\s*image:\s*([^\s#]+)(?:\s+#.*)?$/gm)) {
      workflowImageCount += 1;
      scanImageReference(findings, match[1], path, 'workflow', rootDirectory);
    }
    if (relativeWorkflow === '.github/workflows/release-artifacts.yml') {
      findings.push(...inspectReleaseWorkflowPolicy(content, relativeWorkflow));
    }
  }

  for (const path of composeFiles(rootDirectory)) {
    const content = readFileSync(path, 'utf8');
    for (const match of content.matchAll(/^\s*image:\s*([^\s#]+)(?:\s+#.*)?$/gm)) {
      composeImageCount += 1;
      scanImageReference(findings, match[1], path, 'Compose', rootDirectory, { allowLocal: true });
    }
  }

  const helmRoot = resolve(rootDirectory, 'infra/helm');
  for (const path of filesUnder(helmRoot, (name) => /\.ya?ml$/.test(name))) {
    const content = readFileSync(path, 'utf8');
    for (const match of content.matchAll(/^\s*image:\s*([^\s#{}]+)(?:\s+#.*)?$/gm)) {
      helmImageCount += 1;
      scanImageReference(findings, match[1], path, 'Helm', rootDirectory);
    }
  }

  for (const path of dockerfiles(rootDirectory)) {
    const content = readFileSync(path, 'utf8');
    for (const match of content.matchAll(
      /^\s*FROM\s+(?:--platform=[^\s]+\s+)?([^\s]+)(?:\s+AS\s+[^\s]+)?\s*$/gim
    )) {
      dockerBaseCount += 1;
      scanImageReference(findings, match[1], path, 'Docker base', rootDirectory);
    }
  }

  const npmrcPath = resolve(rootDirectory, '.npmrc');
  if (
    !existsSync(npmrcPath) ||
    !/^inject-workspace-packages=true\s*$/m.test(readFileSync(npmrcPath, 'utf8'))
  ) {
    findings.push(
      '.npmrc: inject-workspace-packages=true is required for production deploy closures'
    );
  }

  const rootManifest = resolve(rootDirectory, 'package.json');
  const enforceRepositoryRuntimeContract =
    existsSync(rootManifest) &&
    JSON.parse(readFileSync(rootManifest, 'utf8')).name === 'cvg-his-v2';
  for (const spec of [
    {
      path: 'apps/api/Dockerfile',
      packageName: '@cvg-his-v2/api',
      deployDirectory: 'api',
      healthcheck: true,
      databaseMaintenance: true
    },
    {
      path: 'apps/worker/Dockerfile',
      packageName: '@cvg-his-v2/worker',
      deployDirectory: 'worker',
      healthcheck: true,
      healthcheckPortVariable: 'WORKER_HEALTH_PORT'
    }
  ]) {
    const absolutePath = resolve(rootDirectory, spec.path);
    if (existsSync(absolutePath)) {
      findings.push(
        ...inspectProductionRuntimeDockerfilePolicy(readFileSync(absolutePath, 'utf8'), spec)
      );
    } else if (enforceRepositoryRuntimeContract) {
      findings.push(`${spec.path}: required production Dockerfile is missing`);
    }
  }

  const spaDockerfile = resolve(rootDirectory, 'apps/spa/Dockerfile');
  if (existsSync(spaDockerfile)) {
    findings.push(
      ...inspectSpaRuntimeDockerfilePolicy(
        readFileSync(spaDockerfile, 'utf8'),
        'apps/spa/Dockerfile'
      )
    );
  } else if (enforceRepositoryRuntimeContract) {
    findings.push('apps/spa/Dockerfile: required production Dockerfile is missing');
  }

  const releaseImageValidator = resolve(rootDirectory, 'scripts/validate-release-images.sh');
  if (existsSync(releaseImageValidator)) {
    findings.push(
      ...inspectReleaseImageValidationPolicy(
        readFileSync(releaseImageValidator, 'utf8'),
        'scripts/validate-release-images.sh'
      )
    );
  } else if (enforceRepositoryRuntimeContract) {
    findings.push(
      'scripts/validate-release-images.sh: required release image validator is missing'
    );
  }

  const runtimeScriptsRoot = resolve(rootDirectory, 'infra/scripts');
  for (const path of runtimeScriptFiles(runtimeScriptsRoot)) {
    const content = readFileSync(path, 'utf8');
    for (const match of content.matchAll(
      /(?<![/:])\b(?:postgres|redis)(?::[0-9][^\s'"`\\)]*|@sha256:[0-9a-f]{64})/g
    )) {
      runtimeImageCount += 1;
      scanImageReference(findings, match[0], path, 'runtime script', rootDirectory);
    }
  }

  return {
    findings,
    counts: {
      actionCount,
      workflowImageCount,
      composeImageCount,
      helmImageCount,
      dockerBaseCount,
      runtimeImageCount
    }
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const result = inspectSupplyChain();
  console.log(`Supply-chain action references scanned: ${result.counts.actionCount}`);
  console.log(`Supply-chain workflow images scanned: ${result.counts.workflowImageCount}`);
  console.log(`Supply-chain Compose images scanned: ${result.counts.composeImageCount}`);
  console.log(`Supply-chain Helm static images scanned: ${result.counts.helmImageCount}`);
  console.log(`Supply-chain Docker base images scanned: ${result.counts.dockerBaseCount}`);
  console.log(`Supply-chain runtime script images scanned: ${result.counts.runtimeImageCount}`);
  if (result.findings.length === 0) {
    console.log('PASS: all external actions and container images are immutable.');
  } else {
    console.error(`FAIL: ${result.findings.length} mutable supply-chain reference(s) found.`);
    for (const finding of result.findings) console.error(`- ${finding}`);
    process.exitCode = 1;
  }
}
