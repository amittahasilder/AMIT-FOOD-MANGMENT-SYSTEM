"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const PORT = Number(process.env.PORT) || 5000;
const server = app_1.default.listen(PORT, () => {
    console.log(`AMITFOOD API running at http://localhost:${PORT}`);
});
server.on("error", (error) => {
    console.error("Failed to start AMITFOOD API:", error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map