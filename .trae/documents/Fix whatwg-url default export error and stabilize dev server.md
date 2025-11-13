## Diagnosis
- The error means a dependency is importing `whatwg-url` as a default, but `whatwg-url/lib/public-api.js` only provides named exports.
- This stops React from mounting, causing a blank page.

## Implementation Steps
1. Create shim `src/shims/whatwg-url.js` that adds a default export while re-exporting named APIs:
   - `import * as api from 'whatwg-url/lib/public-api.js'`
   - `export default api`
   - `export * from 'whatwg-url/lib/public-api.js'`
2. Add Vite aliases so any import of `whatwg-url` or its `lib/public-api.js` resolves to the shim:
   - In `vite.config.ts` `resolve.alias` add:
     - `'whatwg-url/lib/public-api.js': path.resolve(__dirname, 'src/shims/whatwg-url.js')`
     - `'whatwg-url': path.resolve(__dirname, 'src/shims/whatwg-url.js')`
3. Keep the existing `global`, `process.env`, and `process.hrtime` polyfills in `vite.config.ts` as pure JS strings (already adjusted), which unblocks Magenta/Tone.
4. Keep jsfxr loaded via `<script src="https://unpkg.com/jsfxr@1.2.2/sfxr.js"></script>` in `index.html` and use the global `sfxr` (already declared) to avoid ESM packaging issues.
5. Restart the dev server and hard-refresh (`Cmd-Shift-R`).

## Verification
- Open `http://localhost:3000/` and check the Console: the `whatwg-url` default export error should be gone.
- Elements tab should show the app UI mounted under `#root`.
- Click anywhere in the page to satisfy Chrome autoplay, then test “Generate Voice” to confirm AudioContext resumes and the Gemini key works.

## Optional Cleanup (later)
- Remove the import map from `index.html` and rely solely on Vite’s module resolution to reduce conflicts.
- Install Tailwind locally (tailwindcss + @tailwindcss/vite) to eliminate the CDN warning if you want production builds without warnings.