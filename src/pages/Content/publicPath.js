/* global __webpack_public_path__ */
// Assets emitted by webpack live inside the extension package, not on the page's
// origin, so the public path has to be resolved at runtime.
__webpack_public_path__ = chrome.runtime.getURL('');
