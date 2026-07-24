const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add web to platforms so Metro resolves .web.js platform-specific files
if (!config.resolver.platforms.includes('web')) {
  config.resolver.platforms.push('web');
}

// Custom resolver to fix broken react-native-paper FAB/utils extraction on Windows
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Fix: on web, bare `react-native` imports must resolve to react-native-web,
  // not the real react-native package (whose internals are native-only and
  // pull in ios/android-only files that don't exist for web, e.g.
  // PlatformColorValueTypes, legacySendAccessibilityEvent).
  if (platform === 'web' && (moduleName === 'react-native' || moduleName.startsWith('react-native/'))) {
    const rest = moduleName === 'react-native' ? '' : moduleName.slice('react-native'.length);
    return context.resolveRequest(context, 'react-native-web' + rest, platform);
  }

  // Fix: react-native-paper's npm package failed to extract several
  // lib/commonjs/components/*/utils.js files on Windows (only the .js.map
  // survived). Fall back to the equivalent file under lib/module, which is
  // intact, whenever a relative "utils" import resolves inside that tree
  // to a missing file.
  if (
    /(^|\/)utils$/.test(moduleName) &&
    context.originModulePath.includes(path.join('react-native-paper', 'lib', 'commonjs'))
  ) {
    const resolvedCommonjs = path.resolve(path.dirname(context.originModulePath), moduleName) + '.js';
    if (!require('fs').existsSync(resolvedCommonjs)) {
      const moduleFallback = resolvedCommonjs.replace(
        path.join('lib', 'commonjs'),
        path.join('lib', 'module')
      );
      if (require('fs').existsSync(moduleFallback)) {
        return { filePath: moduleFallback, type: 'sourceFile' };
      }
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
