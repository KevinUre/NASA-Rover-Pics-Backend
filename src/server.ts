import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { getPicturesByRoverAndDate, preloadCache } from './picture-service';


const app = express();

fs.readFile(path.join(__dirname, 'dates.txt'), 'utf8', (err, data) => {
	if (err) {
		console.warn(`Error preloading cache: ${err}`);
		return;
	}
	const dates = data.toString().split('\n');
	preloadCache(dates);
});

app.get('/pictures', getPicturesByRoverAndDate);

export default app;
