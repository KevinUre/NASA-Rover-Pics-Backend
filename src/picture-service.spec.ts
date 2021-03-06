import { Request, Response } from 'express';
import axios from 'axios';
import { validateRequestParameters,
	getPicturesByRoverAndDate,
	checkCacheForPictures,
	getImagesFromPayload,
	preloadCache } from './picture-service';
import * as pictureServiceModule from './picture-service';
import { NasaApiResponse } from './nasa-api-model';

afterEach(() => {
	jest.clearAllMocks();
});

describe('Picture Service', () => {
	describe('validateRequestParameters', () => {
		it('passes validation with good params', () => {
			const request:Request = {
				query: {
					rover: 'curiosity',
					date: '2015-12-30',
				},
			} as unknown as Request;
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				json: jest.fn().mockReturnThis(),
			} as unknown as Response;

			const actual = validateRequestParameters(request);

			expect(actual.valid).toBeTruthy();
			expect(actual.reason).toBeUndefined();
		});

		it('passes validation if rover name has some caps in it', () => {
			const request:Request = {
				query: {
					rover: 'Curiosity',
					date: '2015-12-30',
				},
			} as unknown as Request;
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				json: jest.fn().mockReturnThis(),
			} as unknown as Response;

			const actual = validateRequestParameters(request);

			expect(actual.valid).toBeTruthy();
			expect(actual.reason).toBeUndefined();
		});

		it('fails validation if no rover is provided', () => {
			const request:Request = {
				query: {
					date: '2015-12-30',
				},
			} as unknown as Request;
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				json: jest.fn().mockReturnThis(),
			} as unknown as Response;

			const actual = validateRequestParameters(request);

			expect(actual.valid).toBeFalsy();
			expect(actual.reason).toBeDefined();
		});

		it('fails validation if an invalid rover is provided', () => {
			const request:Request = {
				query: {
					rover: 'Zhurong',
					date: '2015-12-30',
				},
			} as unknown as Request;
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				json: jest.fn().mockReturnThis(),
			} as unknown as Response;

			const actual = validateRequestParameters(request);

			expect(actual.valid).toBeFalsy();
			expect(actual.reason).toBeDefined();
		});

		it('fails validation if no date is provided', () => {
			const request:Request = {
				query: {
					rover: 'Curiosity',
				},
			} as unknown as Request;
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				json: jest.fn().mockReturnThis(),
			} as unknown as Response;

			const actual = validateRequestParameters(request);

			expect(actual.valid).toBeFalsy();
			expect(actual.reason).toBeDefined();
		});

		it('fails validation if an invalid rover is provided', () => {
			const request:Request = {
				query: {
					rover: 'Curiosity',
					date: '15-12-30',
				},
			} as unknown as Request;
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				json: jest.fn().mockReturnThis(),
			} as unknown as Response;

			const actual = validateRequestParameters(request);

			expect(actual.valid).toBeFalsy();
			expect(actual.reason).toBeDefined();
		});
	});

	describe('checkCacheForPictures', () => {
		it('returns false if the cache is empty for a specific day', () => {
			pictureServiceModule.addDataToCache('curiosity', '1234-56-78', [ 'some', 'data' ]);
			const actual = checkCacheForPictures('curiosity', '1111-22-33');
			expect(actual).toBeFalsy();
		});

		it('returns false if the cache is empty for a specific day even if a different rover has pics', () => {
			pictureServiceModule.addDataToCache('curiosity', '1234-56-78', [ 'some', 'data' ]);
			const actual = checkCacheForPictures('spirit', '1234-56-78');
			expect(actual).toBeFalsy();
		});

		it('returns data if there is some for the day', () => {
			pictureServiceModule.addDataToCache('curiosity', '1234-56-78', [ 'some', 'data' ]);
			const actual = checkCacheForPictures('curiosity', '1234-56-78');
			expect(actual).toStrictEqual([ 'some', 'data' ]);
		});
	});

	describe('getImagesFromPayload', () => {
		it('should call axios once per image', async () => {
			const apiResponse:NasaApiResponse = {
				photos: [ {
					img_src: 'url1',
				}, {
					img_src: 'url2',
				} ],
			};
			const axiosGetSpy = jest.spyOn(axios, 'get').mockReturnValue(Promise.resolve({ data: Buffer.from('data') }));

			const actual = await getImagesFromPayload(apiResponse);

			expect(actual.length).toBe(2);
			expect(actual).toContain(`data:image/jpeg;base64,${Buffer.from('data').toString('base64')}`);
			expect(axiosGetSpy).toHaveBeenCalledTimes(2);
			expect(axiosGetSpy).toHaveBeenNthCalledWith(1, 'url1', { responseType: 'arraybuffer' });
			expect(axiosGetSpy).toHaveBeenNthCalledWith(2, 'url2', { responseType: 'arraybuffer' });
		});
	});

	describe('getPicturesByRoverAndDate', () => {
		it('calls the nasa API and passes along the response', async () => {
			const request:Request = {
				query: {
					rover: 'Curiosity',
					date: '15-12-30',
				} } as unknown as Request;
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				json: jest.fn().mockReturnThis(),
				setHeader: jest.fn().mockReturnThis(),
			} as unknown as Response;
			const NasaDataStub = { data: [ 'image' ] };
			const validateSpy = jest.spyOn(pictureServiceModule, 'validateRequestParameters').mockReturnValue({ valid: true });
			const getUrlSpy = jest.spyOn(pictureServiceModule, 'getUrl').mockReturnValue('stub url');
			const getCacheSpy = jest.spyOn(pictureServiceModule, 'checkCacheForPictures').mockReturnValue(false);
			const addCacheSpy = jest.spyOn(pictureServiceModule, 'addDataToCache');
			const getImagesSpy = jest.spyOn(pictureServiceModule, 'getImagesFromPayload').mockReturnValue(Promise.resolve([ 'image' ]));
			const axiosGetSpy = jest.spyOn(axios, 'get').mockReturnValue(Promise.resolve(NasaDataStub));

			await getPicturesByRoverAndDate(request, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({ images: [ 'image' ] });
			expect(validateSpy).toHaveBeenCalled();
			expect(getCacheSpy).toHaveBeenCalled();
			expect(getUrlSpy).toHaveBeenCalled();
			expect(getImagesSpy).toHaveBeenCalled();
			expect(addCacheSpy).toHaveBeenCalledWith('curiosity', '15-12-30', [ 'image' ]);
			expect(axiosGetSpy).toHaveBeenCalledWith('stub url');
		});

		it('does not bother nasa if the request is bad', async () => {
			const request:Request = {
				query: {
					rover: 'Curiosity',
					date: '15-12-30',
				} } as unknown as Request;
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				json: jest.fn().mockReturnThis(),
				setHeader: jest.fn().mockReturnThis(),
			} as unknown as Response;
			const NasaDataStub = { data: { key: 'value' } };
			const validateSpy = jest.spyOn(pictureServiceModule, 'validateRequestParameters').mockReturnValue({
				valid: false,
				reason: 'invalid',
			});
			const getUrlSpy = jest.spyOn(pictureServiceModule, 'getUrl').mockReturnValue('stub url');
			const getCacheSpy = jest.spyOn(pictureServiceModule, 'checkCacheForPictures').mockReturnValue(false);
			const addCacheSpy = jest.spyOn(pictureServiceModule, 'addDataToCache');
			const getImagesSpy = jest.spyOn(pictureServiceModule, 'getImagesFromPayload').mockReturnValue(Promise.resolve([ 'image' ]));
			const axiosGetSpy = jest.spyOn(axios, 'get').mockReturnValue(Promise.resolve(NasaDataStub));

			await getPicturesByRoverAndDate(request, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalled();
			expect(validateSpy).toHaveBeenCalled();
			expect(getCacheSpy).not.toHaveBeenCalled();
			expect(getUrlSpy).not.toHaveBeenCalled();
			expect(addCacheSpy).not.toHaveBeenCalled();
			expect(getImagesSpy).not.toHaveBeenCalled();
			expect(axiosGetSpy).not.toHaveBeenCalled();
		});

		it('does not bother nasa if there is cached data', async () => {
			const request:Request = {
				query: {
					rover: 'Curiosity',
					date: '15-12-30',
				} } as unknown as Request;
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				json: jest.fn().mockReturnThis(),
				setHeader: jest.fn().mockReturnThis(),
			} as unknown as Response;
			const NasaDataStub = { data: [ 'image' ] };
			const validateSpy = jest.spyOn(pictureServiceModule, 'validateRequestParameters').mockReturnValue({ valid: true });
			const getUrlSpy = jest.spyOn(pictureServiceModule, 'getUrl').mockReturnValue('stub url');
			const getCacheSpy = jest.spyOn(pictureServiceModule, 'checkCacheForPictures').mockReturnValue([ 'image' ]);
			const addCacheSpy = jest.spyOn(pictureServiceModule, 'addDataToCache');
			const getImagesSpy = jest.spyOn(pictureServiceModule, 'getImagesFromPayload').mockReturnValue(Promise.resolve([ 'image' ]));
			const axiosGetSpy = jest.spyOn(axios, 'get').mockReturnValue(Promise.resolve(NasaDataStub));

			await getPicturesByRoverAndDate(request, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({ images: [ 'image' ] });
			expect(validateSpy).toHaveBeenCalled();
			expect(getCacheSpy).toHaveBeenCalled();
			expect(getImagesSpy).not.toHaveBeenCalled();
			expect(getUrlSpy).not.toHaveBeenCalled();
			expect(addCacheSpy).not.toHaveBeenCalled();
			expect(axiosGetSpy).not.toHaveBeenCalled();
		});
	});

	describe('preloadCache', () => {
		it('calls and stores for a given date', async () => {
			const axiosGetSpy = jest.spyOn(axios, 'get').mockReturnValue(Promise.resolve({ data: Buffer.from('data') }));
			const addCacheSpy = jest.spyOn(pictureServiceModule, 'addDataToCache');
			const getUrlSpy = jest.spyOn(pictureServiceModule, 'getUrl').mockReturnValue('stub url');
			const getImagesSpy = jest.spyOn(pictureServiceModule, 'getImagesFromPayload').mockReturnValue(Promise.resolve([ 'image' ]));

			await preloadCache([ '02/27/2017' ]);

			expect(axiosGetSpy).toHaveBeenCalledWith('stub url');
			expect(getImagesSpy).toHaveBeenCalledWith(Buffer.from('data'));
			expect(addCacheSpy).toHaveBeenCalledWith('Curiosity', '2017-02-27', [ 'image' ]);
			expect(getUrlSpy).toHaveBeenCalledWith('Curiosity', '2017-02-27');
		});

		it('processes each date given', async () => {
			const axiosGetSpy = jest.spyOn(axios, 'get').mockReturnValue(Promise.resolve({ data: Buffer.from('data') }));
			const addCacheSpy = jest.spyOn(pictureServiceModule, 'addDataToCache');
			const getUrlSpy = jest.spyOn(pictureServiceModule, 'getUrl').mockReturnValue('stub url');
			const getImagesSpy = jest.spyOn(pictureServiceModule, 'getImagesFromPayload').mockReturnValue(Promise.resolve([ 'image' ]));

			await preloadCache([ '02/27/2017', '04/14/2014' ]);

			expect(axiosGetSpy).toHaveBeenCalledTimes(2);
			expect(getImagesSpy).toHaveBeenCalledTimes(2);
			expect(addCacheSpy).toHaveBeenCalledTimes(2);
			expect(getUrlSpy).toHaveBeenCalledTimes(2);
		});

		it('handles a wide variety of formats and mistakes', async () => {
			jest.spyOn(axios, 'get').mockReturnValue(Promise.resolve({ data: Buffer.from('data') }));
			jest.spyOn(pictureServiceModule, 'addDataToCache');
			const getUrlSpy = jest.spyOn(pictureServiceModule, 'getUrl').mockReturnValue('stub url');
			jest.spyOn(pictureServiceModule, 'getImagesFromPayload').mockReturnValue(Promise.resolve([ 'image' ]));

			await preloadCache([ '02/27/17', 'June 2, 2018', 'Jul-13-2016', 'April 31, 2018' ]);

			expect(getUrlSpy).toHaveBeenCalledTimes(4);
			expect(getUrlSpy).toHaveBeenNthCalledWith(1, 'Curiosity', '2017-02-27');
			expect(getUrlSpy).toHaveBeenNthCalledWith(2, 'Curiosity', '2018-06-02');
			expect(getUrlSpy).toHaveBeenNthCalledWith(3, 'Curiosity', '2016-07-13');
			expect(getUrlSpy).toHaveBeenNthCalledWith(4, 'Curiosity', '2018-05-01');
		});
	});
});
