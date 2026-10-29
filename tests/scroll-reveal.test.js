import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollReveal } from '../src/lib/site/scroll-reveal.js';

function fixture(t, reduced = false) {
  const listeners = new Map();
  const media = { matches: reduced, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  const root = { getBoundingClientRect: () => ({ bottom: 600 }) };
  const classes = new Set();
  const calls = [];
  const focus = new Map();
  let observer;
  let cancelled = 0;
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; observer = this; }
    observe(node) { this.node = node; }
    disconnect() { this.disconnected = true; }
  }
  for (const [key, value] of Object.entries({ innerHeight: 720, window: { IntersectionObserver: Observer }, IntersectionObserver: Observer, matchMedia: () => media, document: { activeElement: null } })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]);
  }
  const node = {
    closest: () => root,
    getBoundingClientRect: () => ({ top: 800 }),
    classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
    contains: element => element === node,
    animate: (...args) => { calls.push(args); return { cancel: () => cancelled++ }; },
    addEventListener: (name, fn) => focus.set(name, fn),
    removeEventListener: name => focus.delete(name)
  };
  return { node, root, calls, focus, listeners, media, get observer() { return observer; }, get cancelled() { return cancelled; } };
}

test('scroll reveal uses the reading panel and starts only on entry', t => {
  const f = fixture(t);
  const action = scrollReveal(f.node, { delay: 120 });
  assert.equal(f.node.classList.contains('scroll-reveal-pending'), true);
  assert.equal(f.observer.options.root, f.root);
  f.observer.callback([{ isIntersecting: false }]);
  assert.equal(f.calls.length, 0);
  f.observer.callback([{ isIntersecting: true }]);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0][1].delay, 120);
  assert.equal(f.calls[0][1].fill, 'backwards');
  assert.equal(f.observer.disconnected, true);
  assert.equal(f.node.classList.contains('scroll-reveal-pending'), false);
  f.observer.callback([{ isIntersecting: true }]);
  assert.equal(f.calls.length, 1);
  action.destroy();
  assert.equal(f.listeners.size, 0);
  assert.equal(f.focus.size, 0);
  assert.equal(f.cancelled, 1);
});

test('already visible content is never hidden for a late reveal', t => {
  const f = fixture(t);
  f.node.getBoundingClientRect = () => ({ top: 580 });
  assert.equal(scrollReveal(f.node), undefined);
  assert.equal(f.observer, undefined);
  assert.equal(f.node.classList.contains('scroll-reveal-pending'), false);
});

test('focusing a pending block reveals it and prevents a queued animation', t => {
  const f = fixture(t);
  const action = scrollReveal(f.node);
  f.focus.get('focusin')();
  assert.equal(f.node.classList.contains('scroll-reveal-pending'), false);
  f.observer.callback([{ isIntersecting: true }]);
  assert.equal(f.calls.length, 0);
  action.destroy();
});

test('reduced motion leaves content static without registering an observer', t => {
  const f = fixture(t, true);
  assert.equal(scrollReveal(f.node), undefined);
  assert.equal(f.observer, undefined);
  assert.equal(f.calls.length, 0);
});

test('enabling reduced motion cancels an active slide', t => {
  const f = fixture(t);
  const action = scrollReveal(f.node);
  f.observer.callback([{ isIntersecting: true }]);
  f.media.matches = true;
  f.listeners.get('change')();
  assert.equal(f.cancelled, 1);
  action.destroy();
});

test('keyboard focus is never concealed by a reveal', t => {
  const f = fixture(t);
  const action = scrollReveal(f.node);
  document.activeElement = f.node;
  f.observer.callback([{ isIntersecting: true }]);
  assert.equal(f.calls.length, 0);
  action.destroy();
});

test('focusing a sliding block immediately ends its animation', t => {
  const f = fixture(t);
  const action = scrollReveal(f.node);
  f.observer.callback([{ isIntersecting: true }]);
  f.focus.get('focusin')();
  assert.equal(f.cancelled, 1);
  action.destroy();
});
