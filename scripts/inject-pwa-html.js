// expo-router's +html.tsx root-document override only takes effect with
// `web.output: "static"` (SSR), which this app can't use (Supabase/AsyncStorage
// touch `window` at module load, which crashes Node-side prerendering). So for
// our `output: "single"` export, patch the PWA tags into dist/index.html here
// instead, right after `expo export -p web`.
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const tags = [
  '<link rel="manifest" href="/manifest.json" />',
  '<link rel="icon" href="/icons/icon-192.png" />',
  '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="apple-mobile-web-app-title" content="LooP" />',
].join('\n  ');

const swScript = `<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function (err) {
        console.error('SW registration failed:', err);
      });
    });
  }
</script>`;

if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', `  ${tags}\n</head>`);
}
if (!html.includes("register('/sw.js')")) {
  html = html.replace('</body>', `${swScript}\n</body>`);
}

fs.writeFileSync(indexPath, html);
console.log('Injected PWA tags into dist/index.html');
