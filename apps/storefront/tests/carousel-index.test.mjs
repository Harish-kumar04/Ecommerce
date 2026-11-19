// Run with: npm test  (node --experimental-strip-types --test tests/)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  circularOffset,
  discountPercent,
  nextIndex,
  prevIndex,
  wrapIndex,
} from "../lib/carousel-index.ts";

test("nextIndex advances and loops from last to first", () => {
  assert.equal(nextIndex(0, 5), 1);
  assert.equal(nextIndex(3, 5), 4);
  assert.equal(nextIndex(4, 5), 0);
});

test("prevIndex steps back and loops from first to last", () => {
  assert.equal(prevIndex(4, 5), 3);
  assert.equal(prevIndex(1, 5), 0);
  assert.equal(prevIndex(0, 5), 4);
});

test("full loop in both directions returns to the start", () => {
  let i = 0;
  for (let n = 0; n < 7; n++) i = nextIndex(i, 7);
  assert.equal(i, 0);
  for (let n = 0; n < 7; n++) i = prevIndex(i, 7);
  assert.equal(i, 0);
});

test("single and empty lists are safe", () => {
  assert.equal(nextIndex(0, 1), 0);
  assert.equal(prevIndex(0, 1), 0);
  assert.equal(nextIndex(0, 0), 0);
  assert.equal(prevIndex(0, 0), 0);
  assert.equal(wrapIndex(-13, 5), 2);
  assert.equal(wrapIndex(12, 5), 2);
});

test("circularOffset gives shortest signed distance on the loop", () => {
  assert.equal(circularOffset(2, 2, 5), 0);
  assert.equal(circularOffset(3, 2, 5), 1);
  assert.equal(circularOffset(1, 2, 5), -1);
  assert.equal(circularOffset(0, 4, 5), 1); // wraps right
  assert.equal(circularOffset(4, 0, 5), -1); // wraps left
  assert.equal(circularOffset(2, 0, 4), 2); // even-count opposite stays right
});

test("discountPercent is truthful per book", () => {
  assert.equal(discountPercent(20000, 19000), 5);
  assert.equal(discountPercent(20000, null), 0);
  assert.equal(discountPercent(20000, 20000), 0);
  assert.equal(discountPercent(20000, 25000), 0);
  assert.equal(discountPercent(0, 100), 0);
});
