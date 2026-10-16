// The real "server-only" package throws when imported outside a React Server
// Component build. Unit tests run in plain Node, so it is aliased to this
// empty module in vitest.config.ts.
export {};
