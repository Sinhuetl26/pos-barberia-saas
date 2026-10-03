"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
var client_1 = require("@prisma/client");
var path = require("path");
var currentDir = typeof __dirname !== 'undefined'
    ? __dirname
    : path.resolve(process.cwd(), 'packages', 'database');
var defaultDbPath = path.resolve(currentDir, 'prisma', 'dev.db');
var rawUrl = process.env.DATABASE_URL;
var finalDbUrl = undefined;
if (!rawUrl || (rawUrl.startsWith('file:') && !path.isAbsolute(rawUrl.replace(/^file:/, '')))) {
    finalDbUrl = "file:".concat(defaultDbPath.replace(/\\/g, '/'));
}
else {
    finalDbUrl = rawUrl;
}
exports.prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: finalDbUrl
        }
    }
});
__exportStar(require("@prisma/client"), exports);
