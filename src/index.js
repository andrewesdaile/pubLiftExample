import http from 'http';
import fs from 'fs';
import express from 'express';
import multer from 'multer';
import parse from 'csv-parser';
import { Worker } from 'worker_threads';
import { MessageChannel } from 'worker_threads';

//we keep track of each file that arrives so that we can assign it a unique ID
var sequenceNumber = 0;
var workerInstances = {};
var workerResults = {};

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

		//select the logic or script based on the action
		var scriptName = './src/api.' + action + '.js';

		if (action == 'getStatus')
		{
			if (id in workerResults)
			{
				res.json({ result_code: '1',
					result_description: 'The file has been been processed and the report is included.',
					file_id: id,
					result_data: workerResults[id] });
			}
			else if (id in workerInstances)
			{
				res.json({ result_code: '3',
					result_description: 'The file is currently being processed.',
					file_id: id });
			}
			else
			{
				res.json({ result_code: '4',
					result_description: 'The id provided does not seem to be valid.',
					file_id: id });
			}
		}
		else if (fs.existsSync(scriptName))
		{
			//a throttle is used for testing purposes so that you can check the status while it's still running
			var worker = new Worker(scriptName, { workerData: { id: sequenceNumber, csv: csvData, throttle: throttle } });		

			//results from the worker are placed in a dictionary to await the user to request them
			worker.on('message', (data) =>
			{
				workerResults[data.id] = data.result;
				console.log(action + ' finished working, the id number is: ' + data.id);
       			 	//console.log(data.result);
			});

			//instruct the worker to begin processing
			worker.postMessage({});

			//assign the next element (in real life, we would have code to cleanup the array / dictionary or fill empty slots)
			workerInstances[sequenceNumber] = worker;
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
