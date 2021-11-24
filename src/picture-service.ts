import axios from 'axios';
import { Request, Response } from 'express';
import { API_KEY } from './config';
import { NasaApiResponse } from './nasa-api-model';
// TODO: find a better way of making it so that global functions can be mocked in tests
// eslint-disable-next-line
import * as thisModule from './picture-service';

const LIST_OF_ROVERS = [ 'curiosity', 'opportunity', 'spirit' ];

export function validateRequestParameters(request:Request):{valid: boolean, reason?: string} {
	const rover = request.query.rover as string;
	const dateString = request.query.date as string;
	if (!rover) {
		return { valid: false, reason: 'No Rover Provided' };
	}
	if (!LIST_OF_ROVERS.includes(rover.toLowerCase())) {
		return { valid: false, reason: `Invalid Rover Provided. Valid Rovers are: ${LIST_OF_ROVERS}. Provided: ${rover}` };
	}
	if (!dateString) {
		return { valid: false, reason: 'No Date Provided' };
	}
	if (!/^\d{4}-\d{2}-\d{2}$/g.test(dateString)) {
		return { valid: false, reason: `Invalid Date Provided. Valid Dates must be in the form YYYY-MM-DD. Provided: ${dateString}` };
	}
	return { valid: true };
}

export function getUrl(rover:string, date: string):string {
	return `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover.toLowerCase()}/photos?earth_date=${date}&api_key=${API_KEY}`;
}

const pictureCache:{[date:string]: string[]} = {};

export function checkCacheForPictures(date:string):string[] | boolean {
	if (!pictureCache[date]) {
		return false;
	}
	return pictureCache[date];
}

export function addDataToCache(date:string, pictures:string[]):void {
	pictureCache[date] = pictures;
}

export async function getImagesFromPayload(apiResponse:NasaApiResponse):Promise<string[]> {
	const urls: string[] = [];
	// eslint-disable-next-line camelcase
	apiResponse.photos.forEach(({ img_src }) => urls.push(img_src));
	const images: string[] = [];
	await Promise.all(urls.map(async url => {
		await axios.get(url, { responseType: 'arraybuffer' }).then(response => {
			const imageAsBase64 = Buffer.from(response.data, 'binary').toString('base64');
			const base64Uri = `data:image/jpeg;base64,${imageAsBase64}`;
			images.push(base64Uri);
		});
	}));
	return Promise.resolve(images);
}

export async function getPicturesByRoverAndDate(request:Request, response: Response):Promise<void> {
	response.setHeader('Access-Control-Allow-Origin', '*');
	const { valid, reason } = thisModule.validateRequestParameters(request);
	if (!valid) {
		response.status(400).json({ Error: reason });
		return Promise.resolve();
	}
	const rover = request.query.rover as string;
	const dateString = request.query.date as string;

	const cached = thisModule.checkCacheForPictures(dateString);
	if (!cached) {
		await axios.get(thisModule.getUrl(rover, dateString))
			.then(async apiResponse => {
				const images = await thisModule.getImagesFromPayload(apiResponse.data);
				thisModule.addDataToCache(dateString, images);
				response.status(200).json({ images });
				return Promise.resolve();
			})
			.catch(error => {
				response.status(500).json({ Error: error });
			});
	} else {
		response.status(200).json({ images: cached });
	}

	return Promise.resolve();
}
