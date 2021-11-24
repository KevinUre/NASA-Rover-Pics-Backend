import { validateRequestParameters, getPicturesByRoverAndDate } from "./picture-service"
import { Request, Response, NextFunction } from 'express';
import * as pictureServiceModule from "./picture-service";
import axios from 'axios';

describe('Picture Service', () => {
  describe('validateRequestParameters', () => {
    it('passes validation with good params', () => {
      const request:Request = {
        query: {
          rover: 'curiosity',
          date: '2015-12-30'
        }
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
          date: '2015-12-30'
        }
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
          date: '2015-12-30'
        }
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
          date: '2015-12-30'
        }
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
          rover: 'Curiosity'
        }
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
          date: '15-12-30'
        }
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

  describe('getPicturesByRoverAndDate', () => {
    it('calls the nasa API and passes along the response', async () => {
      const request:Request = {
        query: {
          rover: 'Curiosity',
          date: '15-12-30'
        }} as unknown as Request;
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const NasaDataStub = { data: { key: 'value' } };
      const validateSpy = jest.spyOn(pictureServiceModule,'validateRequestParameters').mockReturnValue({valid: true});
      const getUrlSpy = jest.spyOn(pictureServiceModule,'getUrl').mockReturnValue('stub url');
      const axiosGetSpy = jest.spyOn(axios,'get').mockReturnValue(Promise.resolve(NasaDataStub));
  
      await getPicturesByRoverAndDate(request,mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(NasaDataStub.data);
      expect(validateSpy).toHaveBeenCalled();
      expect(getUrlSpy).toHaveBeenCalled();
      expect(axiosGetSpy).toHaveBeenCalledWith('stub url');

      validateSpy.mockClear();
      getUrlSpy.mockClear();
      axiosGetSpy.mockClear();
    });
    
    it('does not bother nasa if the request is bad', async () => {
      const request:Request = {
        query: {
          rover: 'Curiosity',
          date: '15-12-30'
        }} as unknown as Request;
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const NasaDataStub = { data: { key: 'value' } };
      const validateSpy = jest.spyOn(pictureServiceModule,'validateRequestParameters').mockReturnValue({
        valid: false,
        reason: 'invalid'
      })
      const getUrlSpy = jest.spyOn(pictureServiceModule,'getUrl').mockReturnValue('stub url');
      const axiosGetSpy = jest.spyOn(axios,'get').mockReturnValue(Promise.resolve(NasaDataStub));
  
      await getPicturesByRoverAndDate(request,mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
      expect(validateSpy).toHaveBeenCalled();
      expect(getUrlSpy).not.toHaveBeenCalled();
      expect(axiosGetSpy).not.toHaveBeenCalled();

      validateSpy.mockClear();
      getUrlSpy.mockClear();
      axiosGetSpy.mockClear();
    });
  });
});