import axios from 'axios';
import { Request, Response, NextFunction } from 'express';
import { API_KEY } from './config';
import * as thisModule from './picture-service'

const LIST_OF_ROVERS = ['curiosity', 'opportunity', 'spirit']

export function validateRequestParameters(request:Request):{valid: boolean, reason?: string} {
  const rover = request.query.rover as string;
  const dateString = request.query.date as string;
  if (!rover) {
    return {valid: false, reason: 'No Rover Provided'};
  }
  if (!LIST_OF_ROVERS.includes(rover.toLowerCase())) {
    return {valid: false, reason: `Invalid Rover Provided. Valid Rovers are: ${LIST_OF_ROVERS}. Provided: ${rover}`};
  }
  if (!dateString) {
    return {valid: false, reason: 'No Date Provided'};
  }
  if(!/^\d{4}-\d{2}-\d{2}$/g.test(dateString)) {
    return {valid: false, reason: `Invalid Date Provided. Valid Dates must be in the form YYYY-MM-DD. Provided: ${dateString}`};
  }
  return {valid: true};
}

export function getUrl(rover:string, date: string, apiKey: string):string {
  return `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover.toLowerCase()}/photos?earth_date=${date}&api_key=${API_KEY}` 
}

export async function getPicturesByRoverAndDate(request:Request, response: Response):Promise<void> {
  const {valid, reason} = thisModule.validateRequestParameters(request)
  if(!valid){
    response.status(400).json({Error: reason});
    return Promise.resolve();
  }
  const rover = request.query.rover as string;
  const dateString = request.query.date as string;

  await axios.get(thisModule.getUrl(rover,dateString,API_KEY))
  .then(apiResponse => {
    response.status(200).json(apiResponse.data);
  })
  .catch(error => {
    response.status(500).json({Error: error})
  })
};
