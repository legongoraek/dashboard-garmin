import test from "node:test";
import assert from "node:assert/strict";
import * as lifecycle from "./runtimeLifecycle.js";

test("createShutdownHandler closes the server once and exits cleanly", async () => {
  assert.equal(typeof lifecycle.createShutdownHandler, "function");

  let closeCalls = 0;
  const exits = [];
  const server = {
    listening: true,
    close(callback) {
      closeCalls += 1;
      this.listening = false;
      callback();
    },
  };
  const shutdown = lifecycle.createShutdownHandler({
    server,
    exitFn: (code) => exits.push(code),
    logger: { log() {}, error() {} },
  });

  await Promise.all([shutdown("SIGTERM"), shutdown("SIGINT")]);

  assert.equal(closeCalls, 1);
  assert.deepEqual(exits, [0]);
});

test("createShutdownHandler exits nonzero when server close fails", async () => {
  const exits = [];
  const errors = [];
  const server = {
    listening: true,
    close(callback) {
      callback(new Error("close failed"));
    },
  };
  const shutdown = lifecycle.createShutdownHandler({
    server,
    exitFn: (code) => exits.push(code),
    logger: { log() {}, error(message) { errors.push(message); } },
  });

  await shutdown("SIGTERM");

  assert.deepEqual(exits, [1]);
  assert.match(errors.join(" "), /close failed/);
});

test("attachGracefulShutdown registers SIGTERM and SIGINT and can detach", async () => {
  const listeners = new Map();
  const removed = [];
  const processRef = {
    once(signal, handler) { listeners.set(signal, handler); },
    off(signal) { removed.push(signal); listeners.delete(signal); },
  };
  const exits = [];
  const server = {
    listening: true,
    close(callback) {
      this.listening = false;
      callback();
    },
  };

  const detach = lifecycle.attachGracefulShutdown({
    server,
    processRef,
    exitFn: (code) => exits.push(code),
    logger: { log() {}, error() {} },
  });

  assert.equal(typeof listeners.get("SIGTERM"), "function");
  assert.equal(typeof listeners.get("SIGINT"), "function");
  await listeners.get("SIGTERM")();
  assert.deepEqual(exits, [0]);

  detach();
  assert.deepEqual(removed.sort(), ["SIGINT", "SIGTERM"]);
});
