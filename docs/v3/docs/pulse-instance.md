---
title: Pulse Instance
---

## Introduction

# Pulse Instance

Everything you write with Pulse will use the `App` instance. which is created with `new Pulse()`. With this you can create [State](), [Computed State](), [Collections](), [APIs]() and more.

The Pulse Instance is unique to your application, you only need one. It should be exported top-level and imported into core files.

```ts
const App = new Pulse();
```

The Pulse Instance provides helpful function to your application, and the way you write your [Core]().

- Queueing [State]() changes and preventing race conditions.
- Providing global awareness to [Computed State]() for automatic dependency tracking.
- Intergrating with persistent storage.
- Initializing the [Core]() structure.
- Issuing squashed updates to subscribed components via the [Pulse Runtime]().

## Configuration Options

Pulse takes an optional configuration object as the only parameter

```ts
const App = new Pulse({
  framework: React,
  storagePrefix: 'CoolApp'
});
```

> Here's a Typescript interface for quick refrence, however each property will be explained in more detail below.

```ts
interface PulseConfig {
  storage?: StorageMethods;
  computedDefault?: any;
  waitForMount?: boolean;
  framework?: any;
  logJobs?: boolean;
}
```

## Options Refrence

### `storage`

This option is for state persistence with local storage or a custom storage API such as React Native's AsyncStorage

```ts
interface StorageMethods {
  get: () => any;
  set: (key: string) => any;
  remove: (key: string) => any;
  async?: boolean; // Is the storage asynchronous
  prefix?: string; // a custom prefix for local storage keys
}
```

### `computedDefault`

The value provided here will be the fallback used when the result of a computed function is `null` or `undefined`.

### `waitForMount`

### `computedDefault`

### `framework`