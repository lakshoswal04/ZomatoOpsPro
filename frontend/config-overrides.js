const { override, addWebpackResolve, addWebpackAlias, disableEsLint } = require('customize-cra');
const path = require('path');

module.exports = override(
  // Disable the built-in ESLint to avoid conflicts
  disableEsLint(),
  
  // Add .jsx extension to the list of resolvable extensions
  addWebpackResolve({
    extensions: ['.js', '.jsx', '.json']
  }),
  
  // Allow index.jsx to be used as an entry point
  (config) => {
    // Find the entry point configuration
    const entry = config.entry;
    
    // If entry is an array, modify it
    if (Array.isArray(entry)) {
      // Replace any index.js references with a path that can resolve to either index.js or index.jsx
      config.entry = entry.map(entryPoint => {
        if (entryPoint.includes('index.js')) {
          return entryPoint.replace('index.js', 'index');
        }
        return entryPoint;
      });
    }
    
    return config;
  }
);
