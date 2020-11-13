import assert from 'assert';
import workerData from 'worker_threads';
import { parentPort } from 'worker_threads';

var trafficTypes = [];
var pageViewTotals = {};
var recordCounts = {};
var averageCounter = 0;
var result = [];

parentPort.on('message', (data) =>
{
	//var { port } = data;
	averagePageViews();
});

function averagePageViews()
{
	try
	{
		workerData.workerData.csv.forEach(element => 
		{
			var trafficType = element['Traffic Type'];
			var pageViews = element.Pageviews;

			if (trafficType in pageViewTotals)
			{
				pageViewTotals[trafficType] = parseInt(pageViewTotals[trafficType], 10) + parseInt(pageViews, 10);
				recordCounts[trafficType] += 1;

				assert.equal(recordCounts[trafficType] > 0, true);
			}
			else
			{
				pageViewTotals[trafficType] = parseInt(pageViews, 10);
				recordCounts[trafficType] = 1;
				trafficTypes.push(trafficType);

				assert.equal(recordCounts[trafficType], 1);
			}
		});

		calculateAverages();
	}
	catch (ex)
	{
		console.error(ex);
		//TODO: send the error to slack etc.
	}
}

function calculateAverages()
{
	var trafficType = trafficTypes[averageCounter];
	var averagePageViews = Number(pageViewTotals[trafficType] / recordCounts[trafficType]).toFixed(2);

	if (typeof(trafficType) != 'undefined')
		result.push({ 'Traffic Type': trafficType, 'Average Page Views': averagePageViews });

	if (averageCounter < trafficTypes.length)
	{
		averageCounter ++;
		setTimeout(calculateAverages, workerData.workerData.throttle);
	}
	else
	{
		var id = workerData.workerData.id;
		parentPort.postMessage({ id, result });
	}
}
