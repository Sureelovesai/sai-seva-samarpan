const path = require("path");
const { getDefaultConfig } = require("@expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Allow Metro to watch the monorepo
config.watchFolders = [workspaceRoot];

// Make sure Metro resolves packages from the mobile app first (single React!)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.disableHierarchicalLookup = true;

config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_, name) => path.join(projectRoot, "node_modules", name),
  }
);

module.exports = config;
