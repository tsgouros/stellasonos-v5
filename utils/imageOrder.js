// ─────────────────────────────────────────────────────────────────────────
// imageOrder.js
//
// Decides what ORDER the images appear in on the Home screen (both the big
// view and the grid view).
//
// Instead of the screens reading images.json straight through
// (position 0 → image 0, position 1 → image 1, ...), they go through an
// ORDER OBJECT that maps each display position to a real image index:
//
//     order = { 0: 412, 1: 7, 2: 233, ... }
//              ^ position on screen   ^ which entry of images.json to show
//
// The screens never care HOW that object was made — they just call
// applyOrder(images, order). So later, if we want a smarter ordering than
// "random" (e.g. group by year, by object type, featured first), the only
// thing that changes is the function that builds the object, in this file.
//
//
// TO CHANGE THE ORDERING METHOD LATER:
//   1. Add a function to ORDER_METHODS below that takes (count, rng) and
//      returns an order object (every number 0..count-1 used exactly once).
//   2. Point ORDER_METHOD at its name.
// Nothing outside this file needs to change. If a method returns something
// that isn't a valid ordering, createOrder() falls back to the original
// order instead of showing duplicated/missing images.
// ─────────────────────────────────────────────────────────────────────────

/**
 * createIdentityOrder
 * The "no reordering" order: position i shows image i.
 *
 * @param {number} count - how many images there are
 * @returns {Object<number, number>} { 0: 0, 1: 1, ... }
 */
export function createIdentityOrder(count) {
  const order = {};
  for (let i = 0; i < count; i++) order[i] = i;
  return order;
}

/**
 * createScrambledOrder
 * A random ordering (Fisher–Yates shuffle). Every image appears exactly once.
 *
 * @param {number} count - how many images there are
 * @param {function} [rng=Math.random] - returns a number in [0, 1). Passing
 *        your own makes the scramble repeatable (used for testing).
 * @returns {Object<number, number>} { position: realIndex }, a permutation of 0..count-1
 */
export function createScrambledOrder(count, rng = Math.random) {
  const indexes = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }
  const order = {};
  for (let position = 0; position < count; position++) {
    order[position] = indexes[position];
  }
  return order;
}

// All available ordering methods, by name. Add new ones here (see header).
const ORDER_METHODS = {
  original: (count) => createIdentityOrder(count),
  scramble: (count, rng) => createScrambledOrder(count, rng),
};

// Which method the app uses right now. 'scramble' = random order each launch
// and each reload; 'original' = same order as images.json.
export const ORDER_METHOD = "scramble";

/**
 * isValidOrder
 * True only if `order` uses every number 0..count-1 exactly once.
 *
 * @param {Object<number, number>} order
 * @param {number} count
 * @returns {boolean}
 */
export function isValidOrder(order, count) {
  if (!order || typeof order !== "object") return false;
  const seen = new Set();
  for (let position = 0; position < count; position++) {
    const realIndex = order[position];
    if (!Number.isInteger(realIndex) || realIndex < 0 || realIndex >= count) return false;
    if (seen.has(realIndex)) return false;
    seen.add(realIndex);
  }
  return seen.size === count;
}

/**
 * createOrder
 * The function the app calls. Builds an order object using ORDER_METHOD
 * and falls back to the original order if the
 * method misbehaves.
 *
 * @param {number} count - how many images there are
 * @param {string} [method=ORDER_METHOD] - key of ORDER_METHODS
 * @param {function} [rng=Math.random]
 * @returns {Object<number, number>} a valid order object
 */
export function createOrder(count, method = ORDER_METHOD, rng = Math.random) {
  const build = ORDER_METHODS[method];
  if (!build) {
    console.warn(`imageOrder: unknown method "${method}", using original order`);
    return createIdentityOrder(count);
  }
  const order = build(count, rng);
  if (!isValidOrder(order, count)) {
    console.warn(`imageOrder: method "${method}" returned an invalid order, using original order`);
    return createIdentityOrder(count);
  }
  return order;
}

/**
 * applyOrder
 * Puts `items` into display order. This is the ONE place the lookup happens.
 *
 * @param {Array} items - e.g. images.images, in images.json order
 * @param {Object<number, number>} order - from createOrder()
 * @returns {Array} new array: result[position] === items[order[position]]
 */
export function applyOrder(items, order) {
  return Array.from({ length: items.length }, (_, position) => items[order[position]]);
}