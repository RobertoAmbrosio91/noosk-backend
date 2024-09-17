const DotEnv = require('dotenv');
DotEnv.config();

//const Server = require('./server');
// Server.startTheServer();

// const chatHandler = require("./service/chat/controller/chat.controller");
// chatHandler.setIO(Server.getIO());

// const notificationHandler = require("./service/user/controller/notification.controller");
// notificationHandler.setIO(Server.getIO());
const Server = require("./server");
const chatHandler = require("./service/chat/controller/chat.controller");
const notificationHandler = require("./service/user/controller/notification.controller");
const postHandler=require("./service/post/controller/post.controller");
Server.startTheServer((serverInstance) => {
  const io = serverInstance.getIO();
  chatHandler.setIO(io);
  notificationHandler.setIO(io);
  postHandler.setIo(io);
});