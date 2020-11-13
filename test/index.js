import http from 'http';
import fs from 'fs';
import express from 'express';
import multer from 'multer';
import parse from 'csv-parser';
import { Worker } from 'worker_threads';
import { MessageChannel } from 'worker_threads';

//we keep track of each file that arrives so that we can assign it a unique ID
var sequenceNumber = 0;
var workerInstances1 = {};
var workerInstances2 = {};
var workerResults1 = {};
var workerResults2 = {};

//start the server
const app = express();
const port = 8080;
const throttle = 0;//1000
const { port1, port2 } = new MessageChannel();

app.listen(port, () =>
{
	console.log(`server started at http://localhost:${ port }`);
});

//multer helps to get uploaded files from the request
var storage = multer.memoryStorage();
var upload = multer({inMemory:true});

//handlers for csv parsing
const parser = parse({delimiter: ','});
var csvData = [];

parser.on('readable', function()
{
	let record;
	while (record = parser.read())
		csvData.push(record);
});

parser.on('error', function(err)
{
	console.error(err.message);
	//TODO: send the error to slack etc.
});

//define a page route handler for the endpoint
app.post("/", upload.single('file'), (req, res, next) =>
{
	try
	{
		//valid actions are: averagePageViews, maximumSessions, processStatus, sessionRatio, getStatus
		let action = req.query.action;

		//if getStatus is being called then the id is sent too
		let id = req.query.id;

		//send the uploaded file to the parser
		if (typeof(req.file) != 'undefined')
		{
			parser.write(req.file.buffer);
			parser.end();
		}

		if (action == 'getStatus')
		{
			if (workerResults1[id] == workerResults2[id])
				console.log('equal');
			else
				console.log('not equal!');
		}
		else
		{
			//select the logic or script based on the action
			var scriptName = './src/api.' + action + '.js';

			var worker1 = new Worker(scriptName, { workerData: { id: sequenceNumber, csv: csvData, throttle: throttle } });		
			var worker2 = new Worker(scriptName, { workerData: { id: sequenceNumber, csv: csvData, throttle: throttle } });		

			worker1.on('message', (data) => { workerResults1[data.id] = data.result });
			worker2.on('message', (data) => { workerResults2[data.id] = data.result });

			worker1.postMessage({});
			worker2.postMessage({});

			workerInstances1[sequenceNumber] = worker1;
			workerInstances2[sequenceNumber] = worker2;
			sequenceNumber ++;

			res.json({ result_code: '0', result_description: 'The file has been accepted for processing.', file_id: sequenceNumber });
		}
		else
		{
			res.json({ result_code: '2', result_description: 'The specified action wasn\'t valid.' });
		}
	}
	catch (ex)
	{
		res.json({ result_code: '99', result_description: 'The file upload failed due to a server error. Please contact support.', result_exception: ex.message });
		//TODO: send the error to slack etc.
	}
});
