/**
 * Validates whether an order value is a valid finite numeric value.
 *
 * Strict rules:
 * - Must be of type 'number' and Number.isFinite(value).
 * - Finite negative numbers and zero are valid.
 * - null, NaN, Infinity, -Infinity, booleans, arrays, objects, empty strings,
 *   whitespace-only strings, and numeric strings are treated as invalid
 *   because the backend schema explicitly defines order as a Number.
 *
 * @param {unknown} order
 * @returns {boolean}
 */
export function isValidOrder(order) {
  return typeof order === 'number' && Number.isFinite(order);
}

/**
 * Filters and deterministically sorts a board's columns array.
 *
 * Behavior:
 * 1. Safe input: If columns is not an array, returns an empty array [].
 * 2. Filtering: Preserves only valid objects with a string title property.
 *    Non-objects, null, arrays, and objects missing a string title are filtered out.
 * 3. Strict ordering:
 *    - Columns with valid finite numeric orders are sorted in ascending numerical order.
 *    - Equal order values preserve their original relative input order (stable sort).
 *    - Columns with missing or invalid orders are placed after all valid columns.
 *    - Columns with missing/invalid orders preserve their original relative input order.
 * 4. Immutability: Neither the input array nor any column object is mutated.
 *
 * @param {Array<Object>|unknown} columns
 * @returns {Array<Object>} Deterministically sorted array of valid columns
 */
export function sortBoardColumns(columns) {
  if (!Array.isArray(columns)) {
    return [];
  }

  const validOrderItems = [];
  const invalidOrderItems = [];

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];

    // Preserve rule: each entry must be an object (not null/array) with a string title or name
    if (!col || typeof col !== 'object' || Array.isArray(col)) {
      continue;
    }
    const hasValidTitle = typeof col.title === 'string';
    const hasValidName = typeof col.name === 'string';
    if (!hasValidTitle && !hasValidName) {
      continue;
    }

    const displayName = hasValidName ? col.name : col.title;
    const normalizedCol = {
      ...col,
      name: hasValidName ? col.name : displayName,
      title: hasValidTitle ? col.title : displayName,
    };

    if (isValidOrder(normalizedCol.order)) {
      validOrderItems.push({ col: normalizedCol, index: i });
    } else {
      invalidOrderItems.push(normalizedCol);
    }
  }

  // Sort columns with valid order ascending; break ties using original input index
  validOrderItems.sort((a, b) => {
    if (a.col.order !== b.col.order) {
      return a.col.order - b.col.order;
    }
    return a.index - b.index;
  });

  return [
    ...validOrderItems.map((item) => item.col),
    ...invalidOrderItems,
  ];
}

export default sortBoardColumns;
