import express from 'express';
import path, { dirname } from 'path';
import http from 'http';
import { Server } from 'socket.io';
import scraper from './services/scraper';
import indexChange from './utils/indexChange';
import { Socket } from 'socket.io';
import { ScraperParams } from './model/reviews';

const app = express();
const server = http.createServer(app);
const port = 3001;

// socket
const io = new Server(server);
io.on('connection', (socket:Socket) => {
   console.log('user connected!!');

   socket.on('start scraping', (params:ScraperParams) => {
      console.log('start scraping');
      scraper(socket, params);
   });

   socket.on('disconnect', () => {
      console.log('user disconnected!');
   });
});

// default use
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// page reload for development
// indexChange(io)

// end point
app.get('/', (req, res) => {
   // res.render('index')
   res.sendFile(path.join(__dirname,'index.html'))
});

server.listen(port, () => {
   console.log('server running at port: ', port);
});
