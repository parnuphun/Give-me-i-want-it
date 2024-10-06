import express from "express";
import path from "path";
import http from "http";
import { Server } from "socket.io";

import scraping from "./services/scraping";
import indexChange from "./utils/indexChange";

const app = express();
const server = http.createServer(app);
const port = 3001;

// socket
const io = new Server(server);
io.on("connection", (socket) => {
   console.log("user connected!!");

   // check client connection
   io.emit("client check", "client checked!!");
});

// indexChange(io)
scraping(io)

// default use
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

// end point
app.get("/", (req, res) => {
   res.sendFile(path.join(__dirname, "index.html"));
});

server.listen(port, () => {
   console.log("server running at port: ", port);
});
