import app from './server';

const port = 1337;

app.listen(port, () => {
	console.log(`Application is listening on port ${port}.`);
});
