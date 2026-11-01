import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { sortBoardColumns, isValidOrder } from './columnSorting.js';

describe('isValidOrder helper', () => {
  test('accepts finite numbers, zero, and negative numbers', () => {
    assert.equal(isValidOrder(0), true);
    assert.equal(isValidOrder(1), true);
    assert.equal(isValidOrder(-1), true);
    assert.equal(isValidOrder(42.5), true);
    assert.equal(isValidOrder(-100), true);
  });

  test('rejects NaN, Infinity, and -Infinity', () => {
    assert.equal(isValidOrder(NaN), false);
    assert.equal(isValidOrder(Infinity), false);
    assert.equal(isValidOrder(-Infinity), false);
  });

  test('rejects non-numeric types', () => {
    assert.equal(isValidOrder(null), false);
    assert.equal(isValidOrder(undefined), false);
    assert.equal(isValidOrder(true), false);
    assert.equal(isValidOrder(false), false);
    assert.equal(isValidOrder(''), false);
    assert.equal(isValidOrder('   '), false);
    assert.equal(isValidOrder('1'), false);
    assert.equal(isValidOrder('0'), false);
    assert.equal(isValidOrder([]), false);
    assert.equal(isValidOrder({}), false);
  });
});

describe('sortBoardColumns', () => {
  test('1. sorts valid orders in ascending numerical order', () => {
    const input = [
      { title: 'Done', order: 2 },
      { title: 'Todo', order: 0 },
      { title: 'In Progress', order: 1 },
    ];
    const result = sortBoardColumns(input);
    assert.deepEqual(
      result.map((col) => col.title),
      ['Todo', 'In Progress', 'Done']
    );
  });

  test('2. correctly sorts negative and zero order values', () => {
    const input = [
      { title: 'Fourth', order: 10 },
      { title: 'Second', order: -5 },
      { title: 'Third', order: 0 },
      { title: 'First', order: -20 },
    ];
    const result = sortBoardColumns(input);
    assert.deepEqual(
      result.map((col) => col.title),
      ['First', 'Second', 'Third', 'Fourth']
    );
  });

  test('3. preserves stable original order for duplicate valid order values', () => {
    const input = [
      { title: 'First with 1', order: 1, id: 'a' },
      { title: 'Early zero', order: 0, id: 'b' },
      { title: 'Second with 1', order: 1, id: 'c' },
      { title: 'Third with 1', order: 1, id: 'd' },
      { title: 'Late zero', order: 0, id: 'e' },
    ];
    const result = sortBoardColumns(input);
    assert.deepEqual(
      result.map((col) => col.id),
      ['b', 'e', 'a', 'c', 'd']
    );
  });

  test('4. places columns with missing order after valid columns in original order', () => {
    const input = [
      { title: 'Missing 1', id: 'm1' },
      { title: 'Valid 2', order: 2, id: 'v2' },
      { title: 'Missing 2', id: 'm2' },
      { title: 'Valid 0', order: 0, id: 'v0' },
      { title: 'Missing 3', id: 'm3' },
    ];
    const result = sortBoardColumns(input);
    assert.deepEqual(
      result.map((col) => col.id),
      ['v0', 'v2', 'm1', 'm2', 'm3']
    );
  });

  test('5. places invalid order values (null, NaN, Infinity, booleans, objects, arrays, empty strings, whitespace) after valid columns while preserving input order', () => {
    const input = [
      { title: 'Null Order', order: null, id: 'i1' },
      { title: 'Valid 1', order: 1, id: 'v1' },
      { title: 'NaN Order', order: NaN, id: 'i2' },
      { title: 'Infinity Order', order: Infinity, id: 'i3' },
      { title: '-Infinity Order', order: -Infinity, id: 'i4' },
      { title: 'Boolean True', order: true, id: 'i5' },
      { title: 'Boolean False', order: false, id: 'i6' },
      { title: 'Object Order', order: { val: 1 }, id: 'i7' },
      { title: 'Array Order', order: [1], id: 'i8' },
      { title: 'Empty String', order: '', id: 'i9' },
      { title: 'Whitespace String', order: '   ', id: 'i10' },
      { title: 'Valid 0', order: 0, id: 'v0' },
    ];
    const result = sortBoardColumns(input);
    assert.deepEqual(
      result.map((col) => col.id),
      ['v0', 'v1', 'i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7', 'i8', 'i9', 'i10']
    );
  });

  test('6. treats numeric strings as invalid order since backend schema explicitly requires Number', () => {
    const input = [
      { title: 'String One', order: '1', id: 's1' },
      { title: 'Valid Zero', order: 0, id: 'v0' },
      { title: 'String Zero', order: '0', id: 's0' },
      { title: 'Valid Two', order: 2, id: 'v2' },
    ];
    const result = sortBoardColumns(input);
    assert.deepEqual(
      result.map((col) => col.id),
      ['v0', 'v2', 's1', 's0']
    );
  });

  test('7. filters malformed entries and safely handles non-array inputs', () => {
    // Malformed entries inside array
    const mixedInput = [
      null,
      undefined,
      'string primitive',
      123,
      true,
      [],
      {},
      { order: 0 }, // missing title
      { title: 123, order: 1 }, // title is not string
      { title: 'Valid Item', order: 0, id: 'v1' },
      { title: 'No Order Item', id: 'v2' },
    ];
    const mixedResult = sortBoardColumns(mixedInput);
    assert.deepEqual(
      mixedResult.map((col) => col.id),
      ['v1', 'v2']
    );

    // Non-array inputs
    assert.deepEqual(sortBoardColumns(null), []);
    assert.deepEqual(sortBoardColumns(undefined), []);
    assert.deepEqual(sortBoardColumns('not an array'), []);
    assert.deepEqual(sortBoardColumns(42), []);
    assert.deepEqual(sortBoardColumns(true), []);
    assert.deepEqual(sortBoardColumns({ columns: [] }), []);
    assert.deepEqual(sortBoardColumns([]), []);
  });

  test('8. does not mutate original array or column objects', () => {
    const originalInput = Object.freeze([
      Object.freeze({ title: 'Column C', order: 2 }),
      Object.freeze({ title: 'Column A', order: 0 }),
      Object.freeze({ title: 'Column B', order: 1 }),
    ]);

    // Should not throw even though array and objects are frozen
    const result = sortBoardColumns(originalInput);

    assert.deepEqual(
      result.map((c) => c.title),
      ['Column A', 'Column B', 'Column C']
    );
    assert.notEqual(result, originalInput);
    assert.equal(originalInput[0].title, 'Column C');
    assert.equal(originalInput[1].title, 'Column A');
    assert.equal(originalInput[2].title, 'Column B');
  });

  test('9. correctly sorts and normalizes dynamic columns providing name property (Task 10)', () => {
    const input = [
      { name: 'Testing', key: 'testing', order: 3 },
      { name: 'To Do', key: 'todo', order: 0 },
      { name: 'In Progress', key: 'in-progress', order: 1 },
      { name: 'Review', key: 'review', order: 2 },
      { name: 'Done', key: 'done', order: 4 },
    ];
    const result = sortBoardColumns(input);
    assert.equal(result.length, 5);
    assert.deepEqual(
      result.map((c) => c.name),
      ['To Do', 'In Progress', 'Review', 'Testing', 'Done']
    );
    assert.deepEqual(
      result.map((c) => c.title),
      ['To Do', 'In Progress', 'Review', 'Testing', 'Done']
    );
  });

  test('10. handles mixed name and title properties across up to 5 dynamic columns', () => {
    const input = [
      { title: 'Done', key: 'done', order: 4 },
      { name: 'QA Review', key: 'qa-review', order: 3 },
      { title: 'In Progress', key: 'in-progress', order: 1 },
      { name: 'Code Review', key: 'code-review', order: 2 },
      { title: 'Backlog', key: 'backlog', order: 0 },
    ];
    const result = sortBoardColumns(input);
    assert.equal(result.length, 5);
    assert.deepEqual(
      result.map((c) => c.key),
      ['backlog', 'in-progress', 'code-review', 'qa-review', 'done']
    );
    assert.equal(result[1].name, 'In Progress');
    assert.equal(result[1].title, 'In Progress');
    assert.equal(result[2].name, 'Code Review');
    assert.equal(result[2].title, 'Code Review');
  });
});
