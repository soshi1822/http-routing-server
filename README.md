# http-routing-server

Node.js http server routing module
 
## Description

An HTTP server written in Typescript that allows you to configure routing on Node.js.

## Usage

```:typescript
import { Server, Router } from 'http-routing-server';

const server = new Server();

// GET: /get
server.get('get', (req, res) => res.end('OK!'));

// GET: /get/:userName
server.get('get/:userName', (req, res) => res.end('Welcome to  ' + req.params?.userName));

// POST: /user
server.post(/^user\/$/, (req, res) => {
  // request body to json
  console.log(req.json());
  
  res.writeHead(204)
  res.end();
});


const router = new Router();

// GET: /user/get
router.get('get', (req, res) => res.end(req.url));

server.childRouter('user', router);

// http listen port 8800
server.listen(8800);
```


##  Install
`npm install https://github.com/soshi1822/http-routing-server`


##  Licence
[MIT](https://github.com/soshi1822/http-routing-server/blob/main/LICENSE)


##  Author
[soshi1822](https://github.com/soshi1822)
