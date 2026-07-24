const fs = require('fs');
const path = require('path');
const babel = require('../node_modules/@babel/core');

const srcBase = path.join(__dirname, 'node_modules/react-native-paper/src');
const modBase = path.join(__dirname, 'node_modules/react-native-paper/lib/module');

function findMissing(srcDir, modDir) {
  const missing = [];
  if (!fs.existsSync(srcDir) || !fs.existsSync(modDir)) return missing;
  const entries = fs.readdirSync(srcDir);
  entries.forEach(f => {
    const srcPath = path.join(srcDir, f);
    if (!fs.existsSync(srcPath)) return;
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      missing.push(...findMissing(srcPath, path.join(modDir, f)));
    } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      const jsName = f.replace(/\.tsx?$/, '.js');
      const modPath = path.join(modDir, jsName);
      if (!fs.existsSync(modPath)) {
        missing.push({ src: srcPath, out: modPath });
      }
    }
  });
  return missing;
}

const missing = findMissing(srcBase, modBase);
console.log('Missing files:', missing.length);

let compiled = 0, failed = 0;
missing.forEach(({ src, out }) => {
  try {
    const code = fs.readFileSync(src, 'utf8');
    const result = babel.transformSync(code, {
      presets: [
        [path.join(__dirname, '../node_modules/@babel/preset-typescript'), { allExtensions: true, isTSX: true }],
      ],
      filename: src,
    });
    const outDir = path.dirname(out);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(out, result.code);
    compiled++;
  } catch (e) {
    console.error('FAIL:', out.replace(modBase, ''), e.message.slice(0, 80));
    failed++;
  }
});

console.log(`Done: ${compiled} compiled, ${failed} failed`);
