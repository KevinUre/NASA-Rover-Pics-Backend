import request from 'supertest';
import app from './server';

describe('Test the root path', () => {
	it('It should response the GET method', async () => {
		const response = await request(app).get('/pictures?rover=curiosity&date=2015-12-30');
		expect(response.statusCode).toBe(200);
		expect(response.body).toBeDefined();
	});
});
