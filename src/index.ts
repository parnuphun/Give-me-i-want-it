import express from 'express';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import scraping from './services/scraping';
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
      scraping(socket, params);
   });

   socket.on('disconnect', () => {
      console.log('user disconnected!');
   });
});


// template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// default use
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

indexChange(io)

// end point
app.get('/', (req, res) => {
   res.render('index')
});

server.listen(port, () => {
   console.log('server running at port: ', port);
});
