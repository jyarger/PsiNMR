/**
 * Version information shown in the About dialog and used for release
 * verification. The values are injected at build time by Vite's `define`
 * (vite.config.ts): `version` is the package version, and `sha` is the git
 * commit the build was made from when CI provides it (Docker build arg
 * GIT_SHA), '' otherwise. A build that somehow misses the injection falls
 * back to 'HEAD'. The same information is served as /version.json so a
 * deployment can be checked remotely.
 */
const version =
  typeof __PSINMR_VERSION__ === 'string' && __PSINMR_VERSION__.length > 0
    ? `v${__PSINMR_VERSION__}`
    : 'HEAD';

const sha = typeof __PSINMR_GIT_SHA__ === 'string' ? __PSINMR_GIT_SHA__ : '';

export default { version, sha };
