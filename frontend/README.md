# Frontend

Place the Next.js app files directly in this directory.

Before the CI/CD pipeline will build the frontend, update `next.config.ts` with:

```typescript
const nextConfig = {
  output: "export",
  basePath: "/indoor-heat-2026/app",
  assetPrefix: "/indoor-heat-2026/app/",
  trailingSlash: true,
  images: { unoptimized: true },
};
```

Then run `npm install` to generate `package-lock.json` and commit it.

The CI workflow auto-detects `package.json` — if present it builds and deploys the
app to `https://mit-sustainability.github.io/indoor-heat-2026/app/`.
