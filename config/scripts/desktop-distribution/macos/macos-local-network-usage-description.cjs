// Shared by packaged and `pnpm dev` bundles: without it macOS 15+ silently blocks LAN connections.
const MACOS_LOCAL_NETWORK_USAGE_DESCRIPTION =
  'Orca allows terminal-launched developer tools to discover and connect to local development servers when you request it.'

module.exports = { MACOS_LOCAL_NETWORK_USAGE_DESCRIPTION }
