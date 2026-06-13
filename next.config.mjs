/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Local-embedding model (Transformers.js + ONNX runtime) must be required at
    // runtime, not webpacked into the serverless function bundle. Keeping it
    // external avoids bundling native/WASM artifacts and keeps the function lean.
    serverComponentsExternalPackages: ["@xenova/transformers"],
  },
};

export default nextConfig;
