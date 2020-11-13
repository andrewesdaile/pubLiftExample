import assert from 'assert';
import workerData from 'worker_threads';
import { parentPort } from 'worker_threads';

var categories = [];
var sessionMaximum = {};
var counter = 0;
var result = [];

parentPort.on('message', (data) =>
{
	//var { port } = data;
	maximumSessions();
});

function maximumSessions()
{
	try
	{
		workerData.workerData.csv.forEach(element => 
		{
			var rowDate = element.Date;
			var weekNumber = rowDate.substring(0, 4) + '-' + getWeekNumber(parseDate(rowDate));
			var trafficType = element['Traffic Type'];
			var category = weekNumber + ',' + trafficType;
			var sessions = element.Sessions;

			if (category in sessionMaximum)
			{
				if (sessions > sessionMaximum[category])
					sessionMaximum[category] = sessions;
			}
			else
			{
				sessionMaximum[category] = sessions;
				categories.push(category);
			}
		});

		//console.log(categories);
		formatReport();
	}
	catch (ex)
	{
		console.error(ex);
		//TODO: send the error to slack etc.
	}
}

//get the week number for a given date (https://www.javatpoint.com/calculate-current-week-number-in-javascript)
function getWeekNumber(inputDate)
{
	var oneJan = new Date(inputDate.getFullYear(), 0, 1);
	var numberOfDays = Math.floor((inputDate - oneJan) / (24 * 60 * 60 * 1000));
	var result = Math.ceil((inputDate.getDay() + 1 + numberOfDays) / 7);
	return result;
}

//convert a date from YYYYMMDD string (https://stackoverflow.com/questions/10638529/how-to-parse-a-date-in-format-yyyymmdd-in-javascript)
function parseDate(str)
{
	var y = str.substr(0,4),
		m = str.substr(4,2) - 1,
		d = str.substr(6,2);
	var D = new Date(y, m, d);
	return (D.getFullYear() == y && D.getMonth() == m && D.getDate() == d) ? D : 'invalid date';
}

function formatReport()
{
	var category = categories[counter];

	if (typeof(category) != 'undefined')
	{
		var weekNumber = category.split(',')[0];
		var trafficType = category.split(',')[1];
		var sessionMax = sessionMaximum[category];

		result.push({ 'Week Number': weekNumber, 'Traffic Type': trafficType, 'Maximum Sessions': sessionMax });
	}

	if (counter < categories.length)
	{
		counter ++;
		setTimeout(formatReport, workerData.workerData.throttle);
	}
	else
	{
		var id = workerData.workerData.id;
		parentPort.postMessage({ id, result });
	}

	assert.equal(counter > 0, true);
}
