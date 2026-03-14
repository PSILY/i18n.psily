// Entrypoint registered with Vercel.
// The full Express app is pre-bundled into bundle.js by esbuild during the build step.
// Vercel's nft traces bundle.js → picks up all npm package dependencies for the Lambda.
export { default } from './bundle.js';
