/**
 * Entry value a production build ships when no host descriptor is available.
 *
 * Its own dependency-free module because BOTH the Vite config (Node, at build
 * time) and the runtime resolver (browser, at runtime) need it. One definition
 * means the value the build compiles in and the value the resolver checks for
 * cannot drift apart.
 *
 * Deliberately not a URL. A production build that shipped
 * `http://localhost:5500/remoteEntry.js` would, on a host that predates the
 * descriptor, try to connect to the END USER's own loopback address.
 */
export const CYWEB_HOST_REQUIRED = 'cyweb:__CYWEB_HOST_REQUIRED__'
