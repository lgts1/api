import express, { Request, Response } from "express"
import helmet from "helmet"
import cors from "cors"
import fs from "fs"
import https from "https"
import http from "http"
import logger from "./logger/index"
import routes from "./routes"
import * as figlet from "figlet"
import path from "path"
import { Server, Socket } from "socket.io"
import allfunctions from "./functions/allfunctions"
import { emitirEventoInterno, adicionarListener } from "./serverEvents"

import "dotenv/config"

// const privateKey = fs.readFileSync("server.key", "utf8")
// const certificate = fs.readFileSync("server.crt", "utf8")
// const credentials = {
//   key: privateKey,
//   cert: certificate,
// }
const app = express()
const httpServer = http.createServer(app)
const io = new Server(httpServer)


declare module "express-serve-static-core" {
   interface Request {
      io: Server
   }
}
const users = new Map<string, any>()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use("/", express.static(path.join(__dirname, "public")))

app.use("/status", (req, res) => {
   res.json({ status: "operational" })
})
app.use(routes)
httpServer.listen(process.env.PORT, () => {
   logger.info("SERVIDOR INICIADO API JOHN " + process.env.PORT)
})
