# Offline Layer Todo List

## Critical Issues

1. ✅ **Import Path Error**: In `index.js`, there's an import from `'./utils.js'` but the file is actually named `util.js` (without the 's')
2. ✅ **Missing StatusUI Import**: `index.js` uses `StatusUI` but doesn't import it
3. ✅ **XHR Import Path**: In `xhr.js`, the import path for `network.js` is incorrect (no `.js` extension)
4. ✅ **Response Cloning Issue**: In `cache.js`, response is cloned but `text()` is consumed immediately which could cause errors
5. ✅ **Form Input Persistence**: `InputTracker` lacks cleanup mechanism for stored input values
6. ✅ **Error Handling**: Many promises are missing proper error handling

## Architectural Improvements

7. **Redis Integration**: Implement Redis integration instead of stubbed DB (mentioned in cache.js TODO)
8. ✅ **Offline Detection Reliability**: `navigator.onLine` is not always reliable - need better offline detection
9. ✅ **Storage Limits**: No handling for storage quota limits in IndexedDB and localStorage
10. **Request Priority**: Queue processing doesn't prioritize important requests
11. **Security Concerns**: No validation of cached responses or queued requests
12. ✅ **Expired Cache Handling**: No mechanism to expire or validate cached responses
13. **Performance**: No batching for multiple queued requests on reconnection

## UX Improvements

14. ✅ **Connection Status**: Better user feedback on connection status
15. ✅ **StatusUI Initialization**: StatusUI requires document.body to be available
16. ✅ **Retry Mechanism**: No user-facing retry mechanism for failed operations
17. ✅ **Progress Indication**: No indication of sync progress when processing queued items
18. **Conflict Resolution**: No strategy for handling conflicts on reconnection
