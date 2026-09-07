'use strict';

// ECMAScript line terminators; CRLF is one break. Preserve UTF16 columns
// within each line without normalizing the authenticated source bytes.
exports.splitSourceLines = (source) => source.split(/\r\n|[\n\r\u2028\u2029]/);
