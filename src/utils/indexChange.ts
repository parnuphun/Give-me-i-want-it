import fs from 'fs'
import { Server } from 'socket.io';
import path from 'path';

// detect index.html change
export default function indexChange(io:Server){
let timeout:any;
fs.watch(path.join(__dirname, "../index.html"), (eventType, filename) => {
   if (eventType === 'change') {
      clearTimeout(timeout);

      timeout = setTimeout(() => {
         io.emit("reload");
      }, 1500);
   }
});
}
