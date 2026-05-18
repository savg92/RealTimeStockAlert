const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

// Project root (apps/mobile)
const projectRoot = __dirname;
// Workspace root (monorepo), adjust if your workspace layout differs
const workspaceRoot = path.resolve(projectRoot, '..', '..');

const config = getDefaultConfig(projectRoot);

// Ensure Metro watches the monorepo root so hoisted packages (node_modules) are
// visible and resolvable by the bundler (important for npm/yarn workspaces).
config.watchFolders = config.watchFolders || [];
if (!config.watchFolders.includes(workspaceRoot)) {
  config.watchFolders.push(workspaceRoot);
}

// Tell Metro to resolve modules from both the app's node_modules and the
// workspace root node_modules so hoisted packages like expo-linear-gradient
// are found at bundle-time.
config.resolver = config.resolver || {};
config.resolver.nodeModulesPaths = config.resolver.nodeModulesPaths || [];
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(workspaceRoot, 'node_modules'),
];

module.exports = config;
