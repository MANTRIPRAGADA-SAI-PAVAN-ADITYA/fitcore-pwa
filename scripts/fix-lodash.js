const fs = require('fs');
const dir = 'C:/Users/Admin/Desktop/LooP/node_modules/lodash';

const files = {
  'set.js': `var baseSet = require('./_baseSet'),
    isObject = require('./isObject');
function set(object, path, value) {
  return object == null ? object : baseSet(object, path, value);
}
module.exports = set;`,

  'setWith.js': `var baseSet = require('./_baseSet');
function setWith(object, path, value, customizer) {
  customizer = typeof customizer == 'function' ? customizer : undefined;
  return object == null ? object : baseSet(object, path, value, customizer);
}
module.exports = setWith;`,

  'shuffle.js': `var arrayShuffle = require('./_arrayShuffle'),
    baseShuffle = require('./_baseShuffle');
function shuffle(collection) {
  var func = Array.isArray(collection) ? arrayShuffle : baseShuffle;
  return func(collection);
}
module.exports = shuffle;`,

  'size.js': `var baseKeys = require('./_baseKeys'),
    isArrayLike = require('./isArrayLike'),
    isString = require('./isString'),
    stringSize = require('./_stringSize');
function size(collection) {
  if (collection == null) { return 0; }
  if (isArrayLike(collection)) {
    return isString(collection) ? stringSize(collection) : collection.length;
  }
  return baseKeys(collection).length;
}
module.exports = size;`,

  'slice.js': `var baseSlice = require('./_baseSlice'),
    toInteger = require('./toInteger'),
    isIterateeCall = require('./_isIterateeCall');
function slice(array, start, end) {
  var length = array == null ? 0 : array.length;
  if (!length) { return []; }
  if (end && typeof end != 'number' && isIterateeCall(array, start, end)) {
    start = 0;
    end = length;
  } else {
    start = start == null ? 0 : toInteger(start);
    end = end === undefined ? length : toInteger(end);
  }
  return baseSlice(array, start, end);
}
module.exports = slice;`,

  'some.js': `var arraySome = require('./_arraySome'),
    baseIteratee = require('./_baseIteratee'),
    baseSome = require('./_baseSome'),
    isArray = require('./isArray'),
    isIterateeCall = require('./_isIterateeCall');
function some(collection, predicate, guard) {
  var func = isArray(collection) ? arraySome : baseSome;
  if (guard && isIterateeCall(collection, predicate, guard)) {
    predicate = undefined;
  }
  return func(collection, baseIteratee(predicate, 3));
}
module.exports = some;`,

  'sortBy.js': `var baseFlatten = require('./_baseFlatten'),
    baseOrderBy = require('./_baseOrderBy'),
    baseRest = require('./_baseRest'),
    isIterateeCall = require('./_isIterateeCall');
var sortBy = baseRest(function(collection, iteratees) {
  if (collection == null) { return []; }
  var length = iteratees.length;
  if (length > 1 && isIterateeCall(collection, iteratees[0], iteratees[1])) {
    iteratees = [];
  } else if (length > 2 && isIterateeCall(iteratees[0], iteratees[1], iteratees[2])) {
    iteratees = [iteratees[0]];
  }
  return baseOrderBy(collection, baseFlatten(iteratees, 1), []);
});
module.exports = sortBy;`,

  'sortedIndex.js': `var baseSortedIndex = require('./_baseSortedIndex');
function sortedIndex(array, value) {
  return baseSortedIndex(array, value);
}
module.exports = sortedIndex;`,

  'sortedIndexBy.js': `var baseSortedIndexBy = require('./_baseSortedIndexBy'),
    baseIteratee = require('./_baseIteratee');
function sortedIndexBy(array, value, iteratee) {
  return baseSortedIndexBy(array, value, baseIteratee(iteratee, 2));
}
module.exports = sortedIndexBy;`,

  'sortedIndexOf.js': `var baseSortedIndex = require('./_baseSortedIndex'),
    eq = require('./eq');
function sortedIndexOf(array, value) {
  var length = array == null ? 0 : array.length;
  if (length) {
    var index = baseSortedIndex(array, value);
    if (index < length && eq(array[index], value)) {
      return index;
    }
  }
  return -1;
}
module.exports = sortedIndexOf;`,

  'sortedLastIndex.js': `var baseSortedIndex = require('./_baseSortedIndex');
function sortedLastIndex(array, value) {
  return baseSortedIndex(array, value, true);
}
module.exports = sortedLastIndex;`,

  'sortedLastIndexBy.js': `var baseSortedIndexBy = require('./_baseSortedIndexBy'),
    baseIteratee = require('./_baseIteratee');
function sortedLastIndexBy(array, value, iteratee) {
  return baseSortedIndexBy(array, value, baseIteratee(iteratee, 2), true);
}
module.exports = sortedLastIndexBy;`,

  'sortedLastIndexOf.js': `var baseSortedIndex = require('./_baseSortedIndex'),
    eq = require('./eq');
function sortedLastIndexOf(array, value) {
  var length = array == null ? 0 : array.length;
  if (length) {
    var index = baseSortedIndex(array, value, true) - 1;
    if (eq(array[index], value)) {
      return index;
    }
  }
  return -1;
}
module.exports = sortedLastIndexOf;`,

  'sortedUniq.js': `var baseSortedUniq = require('./_baseSortedUniq');
function sortedUniq(array) {
  return (array && array.length) ? baseSortedUniq(array) : [];
}
module.exports = sortedUniq;`,

  'sortedUniqBy.js': `var baseSortedUniq = require('./_baseSortedUniq'),
    baseIteratee = require('./_baseIteratee');
function sortedUniqBy(array, iteratee) {
  return (array && array.length)
    ? baseSortedUniq(array, baseIteratee(iteratee, 2))
    : [];
}
module.exports = sortedUniqBy;`,

  'spread.js': `var apply = require('./_apply'),
    arrayPush = require('./_arrayPush'),
    baseRest = require('./_baseRest'),
    castSlice = require('./_castSlice'),
    toInteger = require('./toInteger');
var FUNC_ERROR_TEXT = 'Expected a function';
function spread(func, start) {
  if (typeof func != 'function') { throw new TypeError(FUNC_ERROR_TEXT); }
  start = start == null ? 0 : Math.max(toInteger(start), 0);
  return baseRest(function(args) {
    var array = args[start],
        otherArgs = castSlice(args, 0, start);
    if (array) { arrayPush(otherArgs, array); }
    return apply(func, this, otherArgs);
  });
}
module.exports = spread;`,

  'subtract.js': `var createMathOperation = require('./_createMathOperation');
var subtract = createMathOperation(function(augend, addend) {
  return augend - addend;
}, 0);
module.exports = subtract;`,

  'sum.js': `var baseSum = require('./_baseSum'),
    identity = require('./identity');
function sum(array) {
  return (array && array.length) ? baseSum(array, identity) : 0;
}
module.exports = sum;`,

  'sumBy.js': `var baseIteratee = require('./_baseIteratee'),
    baseSum = require('./_baseSum');
function sumBy(array, iteratee) {
  return (array && array.length)
    ? baseSum(array, baseIteratee(iteratee, 2))
    : 0;
}
module.exports = sumBy;`,

  'tail.js': `var baseSlice = require('./_baseSlice');
function tail(array) {
  var length = array == null ? 0 : array.length;
  return length ? baseSlice(array, 1, length) : [];
}
module.exports = tail;`,

  'take.js': `var baseSlice = require('./_baseSlice'),
    toInteger = require('./toInteger');
function take(array, n, guard) {
  if (!(array && array.length)) { return []; }
  n = (guard || n === undefined) ? 1 : toInteger(n);
  return baseSlice(array, 0, n < 0 ? 0 : n);
}
module.exports = take;`,

  'takeRight.js': `var baseSlice = require('./_baseSlice'),
    toInteger = require('./toInteger');
function takeRight(array, n, guard) {
  var length = array == null ? 0 : array.length;
  if (!length) { return []; }
  n = (guard || n === undefined) ? 1 : toInteger(n);
  n = length - n;
  return baseSlice(array, n < 0 ? 0 : n, length);
}
module.exports = takeRight;`,
};

let created = 0, failed = 0;
Object.entries(files).forEach(([name, content]) => {
  try {
    fs.writeFileSync(dir + '/' + name, content);
    created++;
  } catch(e) {
    console.error('FAIL:', name, e.message);
    failed++;
  }
});
console.log('Created:', created, 'Failed:', failed);
