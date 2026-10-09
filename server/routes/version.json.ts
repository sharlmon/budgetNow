// What is deployed right now. Open copies of the app compare this with the version they are running and offer an update.
// Never cached: a stale answer would hide a new release.
export default defineEventHandler((event) => {
  const { appVersion, buildId } = useRuntimeConfig(event).public
  setResponseHeaders(event, { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex' })
  return { version: appVersion, build: buildId }
})
