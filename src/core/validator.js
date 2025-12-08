/**
 * Code Validator
 * Validates generated code for common issues
 */

import * as parser from '@babel/parser';

/**
 * Validate JSX/React code
 * @param {string} code - The code to validate
 * @returns {Object} Validation result with valid boolean and errors array
 */
export function validateJSX(code) {
  const errors = [];

  // 1. Check JSX syntax
  try {
    parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'classProperties'],
    });
  } catch (parseError) {
    errors.push({
      type: 'SYNTAX_ERROR',
      message: `Syntax error: ${parseError.message}`,
      fix: 'Fix the syntax error - check for missing brackets, quotes, or semicolons.',
    });
    return { valid: false, errors };
  }

  // 2. Check for href="#" patterns (problematic in Sandpack)
  if (/href\s*=\s*["']#[^"']*["']/.test(code)) {
    errors.push({
      type: 'NAVIGATION_ERROR',
      message: 'href="#" causes page reload in Sandpack. Use button with onClick instead.',
      fix: 'Replace <a href="#"> with: <button onClick={handleClick}>Text</button>',
    });
  }

  // 3. Check for mismatched tags (<button>...</a>)
  if (/<button[^>]*>(?:(?!<\/button>).)*?<\/a>/s.test(code)) {
    errors.push({
      type: 'MISMATCHED_TAGS',
      message: 'Mismatched tags: <button> opened but </a> closed.',
      fix: 'Use matching tags: <button onClick={handleClick}>Text</button>',
    });
  }

  // 4. Check for mismatched tags (<a>...</button>)
  if (/<a[^>]*>(?:(?!<\/a>).)*?<\/button>/s.test(code)) {
    errors.push({
      type: 'MISMATCHED_TAGS',
      message: 'Mismatched tags: <a> opened but </button> closed.',
      fix: 'Use matching tags: <button onClick={handleClick}>Text</button>',
    });
  }

  // 5. Check for duplicate className attributes
  if (/className\s*=\s*["'][^"']*["']\s+className\s*=\s*["'][^"']*["']/.test(code)) {
    errors.push({
      type: 'DUPLICATE_ATTRIBUTE',
      message: 'Duplicate className attributes on same element.',
      fix: 'Merge into single className: className="class1 class2"',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    checks: {
      validJSX: !errors.some((e) => e.type === 'SYNTAX_ERROR'),
      noHrefHash: !errors.some((e) => e.type === 'NAVIGATION_ERROR'),
      noMismatchedTags: !errors.some((e) => e.type === 'MISMATCHED_TAGS'),
      noDuplicateAttrs: !errors.some((e) => e.type === 'DUPLICATE_ATTRIBUTE'),
    },
  };
}

/**
 * Generic code validator - can be extended with custom validators
 * @param {string} code - The code to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateCode(code, options = {}) {
  const { language = 'jsx' } = options;

  switch (language) {
    case 'jsx':
    case 'tsx':
    case 'javascript':
    case 'typescript':
      return validateJSX(code);
    default:
      // For unsupported languages, just check if code exists
      return {
        valid: Boolean(code && code.trim().length > 0),
        errors: code ? [] : [{ type: 'EMPTY_CODE', message: 'No code generated' }],
      };
  }
}

export default { validateCode, validateJSX };
