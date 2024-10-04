import express from "express";
import path from 'path'
import http from 'http'
import fs from "fs";
import { Server } from "socket.io";

const app = express()
const server = http.createServer(app)
const port = 3000

// socket
const io = new Server(server)

// litening 'connection' event
io.on('connection', (socket) =>{
   console.log('user connected');
   io.emit('chat message', 'test socket');
})

// default use
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname,'../public')))


app.get('/',(req , res)=> {
    res.sendFile(path.join(__dirname,'index.html'))
})

server.listen(port, ()=>{
    console.log( 'server running at port: ',port );
})
