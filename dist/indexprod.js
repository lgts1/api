"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const index_1 = __importDefault(require("./logger/index"));
const routes_1 = __importDefault(require("./routes"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
require("dotenv/config");
// const privateKey = fs.readFileSync("server.key", "utf8")
// const certificate = fs.readFileSync("server.crt", "utf8")
// const credentials = {
//   key: privateKey,
//   cert: certificate,
// }
const app = (0, express_1.default)();
const httpServer = http_1.default.createServer(app);
const io = new socket_io_1.Server(httpServer);
const users = new Map();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/", express_1.default.static(path_1.default.join(__dirname, "public")));
app.use("/status", (req, res) => {
    res.json({ status: "operational" });
});
app.use(routes_1.default);
httpServer.listen(process.env.PORT, () => {
    index_1.default.info("SERVIDOR INICIADO API JOHN " + process.env.PORT);
});
