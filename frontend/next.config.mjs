import {fileURLToPath} from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Share the reviewed data/accessibility.v1.json with the Python catalogue.
  turbopack: {root:fileURLToPath(new URL('../',import.meta.url))},
};

export default nextConfig;
