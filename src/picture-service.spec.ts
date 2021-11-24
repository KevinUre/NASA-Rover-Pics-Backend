import { Request, Response } from 'express';
import axios from 'axios';
import { validateRequestParameters,
	getPicturesByRoverAndDate,
	checkCacheForPictures,
	getImagesFromPayload } from './picture-service';
import * as pictureServiceModule from './picture-service';
import { NasaApiResponse } from './nasa-api-model';

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
			pictureServiceModule.addDataToCache('1234-56-78', [ 'some', 'data' ]);
			const actual = checkCacheForPictures('1111-22-33');
			expect(actual).toBeFalsy();
		});
		it('returns data if there is some for the day', () => {
			pictureServiceModule.addDataToCache('1234-56-78', [ 'some', 'data' ]);
			const actual = checkCacheForPictures('1234-56-78');
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
			expect(actual).toContain(Buffer.from('data').toString('base64'));
			expect(axiosGetSpy).toHaveBeenCalledTimes(2);
			expect(axiosGetSpy).toHaveBeenNthCalledWith(1, 'url1');
			expect(axiosGetSpy).toHaveBeenNthCalledWith(2, 'url2');

			axiosGetSpy.mockClear();
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
			expect(getImagesSpy).toHaveBeenCalled();
			expect(addCacheSpy).toHaveBeenCalledWith('15-12-30', [ 'image' ]);
			expect(axiosGetSpy).toHaveBeenCalledWith('stub url');

			validateSpy.mockClear();
			getUrlSpy.mockClear();
			axiosGetSpy.mockClear();
			getCacheSpy.mockClear();
			addCacheSpy.mockClear();
			getImagesSpy.mockClear();
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
			expect(axiosGetSpy).not.toHaveBeenCalled();

			validateSpy.mockClear();
			getUrlSpy.mockClear();
			axiosGetSpy.mockClear();
			getCacheSpy.mockClear();
			addCacheSpy.mockClear();
			getImagesSpy.mockClear();
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
			expect(addCacheSpy).not.toHaveBeenCalledWith('15-12-30', [ 'image' ]);
			expect(axiosGetSpy).not.toHaveBeenCalledWith('stub url');

			validateSpy.mockClear();
			getUrlSpy.mockClear();
			axiosGetSpy.mockClear();
			getCacheSpy.mockClear();
			addCacheSpy.mockClear();
			getImagesSpy.mockClear();
		});
	});
});
