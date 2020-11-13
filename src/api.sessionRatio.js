import assert from 'assert';
import workerData from 'worker_threads';
import { parentPort } from 'worker_threads';

var rowDates = [];
var userCount = {};
var sessionCount = {};
var counter = 0;
var result = [];

parentPort.on('message', (data) =>
{
	//var { port } = data;
	sessionRatio();
});

function sessionRatio()
{
	try
	{
		workerData.workerData.csv.forEach(element => 
		{
			var rowDate = element.Date;

			if (rowDate in rowDates)
			{
				userCount[rowDate] = parseInt(userCount[rowDate], 10) + parseInt(element.Users, 10);
				sessionCount[rowDate] = parseInt(sessionCount[rowDate], 10) + parseInt(element.Sessions, 10);
			}
			else
			{
				userCount[rowDate] = parseInt(element.Users, 10);
				sessionCount[rowDate] = parseInt(element.Sessions, 10);

				assert.equal(userCount[rowDate] > 0, true);
				assert.equal(sessionCount[rowDate] > 0, true);

				rowDates.push(rowDate);
			}
		});

		calculateRatios();
	}
	catch (ex)
	{
		console.error(ex);
		//TODO: send the error to slack etc.
	}
}

function calculateRatios()
{
	var rowDate = rowDates[counter];
	var sessionRatio = Number(sessionCount[rowDate] / userCount[rowDate]).toFixed(2);

	if (typeof(rowDate) != 'undefined')
		result.push({ Date: rowDate, 'Sessions Per User': sessionRatio });

	if (counter < rowDates.length)
	{
		counter ++;
		setTimeout(calculateRatios, workerData.workerData.throttle);
	}
	else
	{
		var id = workerData.workerData.id;
		parentPort.postMessage({ id, result });
	}

	assert.equal(counter > 0, true);
}
