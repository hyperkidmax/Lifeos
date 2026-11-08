"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAndFinalizeReset = exports.executeResetChunk = exports.startGlobalReset = exports.getSyncGeneration = exports.batchRecordTombstones = exports.deleteRecord = void 0;
var tombstones_1 = require("./tombstones");
Object.defineProperty(exports, "deleteRecord", { enumerable: true, get: function () { return tombstones_1.deleteRecord; } });
Object.defineProperty(exports, "batchRecordTombstones", { enumerable: true, get: function () { return tombstones_1.batchRecordTombstones; } });
var reset_1 = require("./reset");
Object.defineProperty(exports, "getSyncGeneration", { enumerable: true, get: function () { return reset_1.getSyncGeneration; } });
Object.defineProperty(exports, "startGlobalReset", { enumerable: true, get: function () { return reset_1.startGlobalReset; } });
Object.defineProperty(exports, "executeResetChunk", { enumerable: true, get: function () { return reset_1.executeResetChunk; } });
Object.defineProperty(exports, "verifyAndFinalizeReset", { enumerable: true, get: function () { return reset_1.verifyAndFinalizeReset; } });
//# sourceMappingURL=index.js.map