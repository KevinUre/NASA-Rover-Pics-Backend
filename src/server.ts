import express, { Request, Response, NextFunction } from 'express';
import { getPicturesByRoverAndDate } from './picture-service';

const app = express();

app.get('/pictures', getPicturesByRoverAndDate)

export default app;
