import express from "express";
import path from "path";
import http from "http";
import { scrapingRoute } from "./routes/scraping.rount";
import { Server } from "socket.io";
import scraping from "./controller/scraping";

const app = express();
const server = http.createServer(app);
const port = 3001;

// socket
const io = new Server(server);
io.on("connection", (socket) => {
   console.log("user connected!!");

   //
   socket.on("start scraping",(url)=>{
      scraping()
   })

   //
   io.emit("client check", "client checked!!");
});

// default use
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

// end point
app.use("/api", scrapingRoute);
app.get("/", (req, res) => {
   res.sendFile(path.join(__dirname, "index.html"));
});

server.listen(port, () => {
   console.log("server running at port: ", port);
});
