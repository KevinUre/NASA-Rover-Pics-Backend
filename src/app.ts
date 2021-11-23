import express, { Request, Response, NextFunction } from 'express';

const app = express();
const port = 3000;


const getHelloWorld = (request:Request, response: Response, next: NextFunction) => {
  response.status(200).json({Greeting: 'Hello World!'});
}

app.get('/hello', getHelloWorld);

app.listen(port, () => {
  console.log(`Application is listening on port ${port}.`);
});
