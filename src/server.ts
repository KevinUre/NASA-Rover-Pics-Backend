import express, { Request, Response, NextFunction } from 'express';

const app = express();

const getHelloWorld = (request:Request, response: Response, next: NextFunction) => {
	response.status(200).json({ Greeting: 'Hello World!' });
};

app.get('/hello', getHelloWorld);

export default app;
