////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Solace Systems Messaging SDK for JavaScript
// Copyright 2010-2012 Solace Systems Inc. All rights reserved.
// http://www.SolaceSystems.com
//
//                              * solUIHelper *
//
// This file contains methods help painting the UI, and methods to aapend inputs to the log text area
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//alert("solUIHelper");

var js_username = null ;
var memberExchange = null;

function download() {
	//download source
	window.location = "./soldemosrc.zip";
}

function aboutSolace() {
	//About Solace
	window.open("http://www.solacesystems.com");
}

function readme() {
	//New window with documentation
	window.open("./readme.html");
}

function topics_doc() {
	//New window with documentation
	window.open("./topics.html");
}
function documentation() {
	//New window with documentation
	window.open("./api/index.html");
}

function padLeft(str, padChar, length) {
	str = str + "";
	while (str.length < length) {
		str = padChar + str;
	}
	return str;
}

function utils_currentTime() {
	var currentTime = new Date();
	return padLeft(currentTime.getHours(), '0', 2) + ":" +
			padLeft(currentTime.getMinutes(), '0', 2) + ":" +
			padLeft(currentTime.getSeconds(), '0', 2) + "." +
			padLeft(currentTime.getMilliseconds(), '0', 3);
}

function logUtil(line) {
	var message = utils_currentTime() + ":" + line + "\n";
	console.log(message);
	//alert(message);
	//var txtarea = document.getElementById("txaConsoleLog");
	//txtarea.value = message + txtarea.value;
}

function endsWithEven(str) {
    if(eval(str.substring(str.length-1)) %2 >0) 
    	return false;
    else
    	return true;  	
}

function stringReplaceAll(str, find, replace) {
    return str.replace(new RegExp(find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replace);
}

function initSolace() {
	var factoryProps = new solace.SolclientFactoryProperties();
    factoryProps.profile = solace.SolclientFactoryProfiles.version10;
    solace.SolclientFactory.init(factoryProps);

	connectSession();
	createSolCacheSession();

	//initializeOrdReqSessions();
}

function cleanupTables() {
	$("#tab_securities .tr_data").remove(); 
	$("#tab_TradeHistory .tr_data").remove(); 
}

function statusUpdate(statusText, statusColor) {
	
	//repaint divHello
	
	if (statusText == 'Disconnected') {
		document.getElementById("red").src = "img/red-on.png";
		document.getElementById("amber").src = "img/amber-off.png";
		document.getElementById("green").src = "img/green-off.png";
	}
	else if (statusText == 'Connecting') {
		document.getElementById("red").src = "img/red-off.png";
		document.getElementById("amber").src = "img/amber-on.png";
		document.getElementById("green").src = "img/green-off.png";
	}
	else if (statusText == 'Connected') {
		document.getElementById("divSvrStatus").innerHTML = "";
		document.getElementById("red").src = "img/red-off.png";
		document.getElementById("amber").src = "img/amber-off.png";
		document.getElementById("green").src = "img/green-on.png";

		//send a request to the portfolio manager

	}
			
}




//************************************************************************************






