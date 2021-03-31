
//
// Solace Systems Messaging SDK for JavaScript
// Copyright 2010-2012 Solace Systems Inc. All rights reserved.
// http://www.SolaceSystems.com
//
//                              * SolPubSubHelper *
//
// This sample demonstrates:
//  - Subscribing to a topic for direct messages.
//  - Receiving messages with callbacks
//
// This is the helper JavaScripts code, where we show the basics of creating a session, connecting a session, subscribing to a topic,
// and publishing direct messages to a topic.
// This script is invoked by wrapper methods from GUI based applications, and correspondingly calls them back upon receiving messages
// from its event callbacks 
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//alert("solPubSubHelper");
    
    var ns = this;
    
    var mySessionProperties = null;
    var autoReconnect = true;
	
    var mySession = null;
	var myCacheSession = null;

//    var autoReconnect = false;
//    var mySession = null;

    /** Forward declarations of session callback and message callback methods
    * sessionEvenCb - a callback method defined later in this file, 
    * 		which is called by Solace in case a session event such as connect, disconnect, reconnect etc occurs
    *
    * messageEventCb - - a callback method defined later in this file,
    *		which is called by Solace to push messages into, whenever a new message matches the added subscriptions on the session
    */
    var sessionEventCb; // forward declaration
    var messageEventCb; // forward declaration
	var cacheReqCb; // forward declaration


    // An array of subscriptions that cannot be sent temporarily due to network congestion
    // They will be re-sent upon receiving CAN_ACCEPT_DATA event.
    // The array will be cleared when session is disconnected.
    this.subscriptionsInWaiting = [];
 	
 	/**
     * Creates a session object, to be used for connection later
     * Connectivity parameters such as IP, Port, VPN, Username, Password etc 
     * are used to initialize the session object 
     *
     * Most importantly, as explained above, this method creates the session by associating it with 2 callback methods
     * message event callback method, for Solace to push the messages into 
     * session event callback method, for Solace to push session event messages into
     */
    this.connectSession = function() {
//        try {

        	//initialize session properties
        	mySessionProperties = new solace.SessionProperties();

			mySessionProperties.url = my_web_server_url;
			mySessionProperties.vpnName = my_vpn;
			mySessionProperties.userName = my_client_username;
			mySessionProperties.password = my_password;

            mySessionProperties.connectTimeoutInMsecs = OPERATION_TIMEOUT;
            mySessionProperties.readTimeoutInMsecs = OPERATION_TIMEOUT;
            mySessionProperties.keepAliveIntervalsLimit = 10;
            mySessionProperties.connectTimeoutInMsecs = 25000;
            mySessionProperties.transportDowngradeTimeoutInMsecs = 5000;
            mySessionProperties.reapplySubscriptions = autoReconnect;
		  
            mySession = solace.SolclientFactory.createSession(mySessionProperties,
                    new solace.MessageRxCBInfo(function(session, message) {
                            ns.messageEventCb(session, message);
                    }, this),
                    new solace.SessionEventCBInfo(function(session, event) {
                        ns.sessionEventCb(session, event);
                    }, this));
            
            //connect the session
            autoReconnect = false;
            //alert("connectSession about to be triggered:"+mySessionProperties.url);
            //this is where the actual connection initiation begines. 
            //The connection may not have been established by the time this method returns.
            //Once the connection is established, an event - sessionEventCode=UP_NOTICE is sent to the session callback method
            //So subscriptions etc should only be added after the sessionEventCode=UP_NOTICE event has been received
			ns.logUtil("Solace Session Connect Initiated");
            mySession.connect();

/*
			mySession = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      my_web_server_url,
                vpnName:  my_vpn,
                userName: my_client_username,
                password: my_password,
			});

			mySession.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
				console.log('=== Successfully connected and ready to subscribe. ===');
			});
			mySession.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
				console.log('Connection failed to the message router: ' + sessionEvent.infoStr +
					' - check correct parameter values and connectivity!');
			});
			mysession.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
				console.log('Disconnected.');
			});
			mySession.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, function (sessionEvent) {
				console.log('Cannot subscribe to topic: ' + sessionEvent.correlationKey);
			});
			mySession.on(solace.SessionEventCode.SUBSCRIPTION_OK, function (sessionEvent) {
			});
			// define message event listener
			mySession.on(solace.SessionEventCode.MESSAGE, function (message) {
				
//				subscriber.log('Received message: "' + message.getBinaryAttachment() + '", details:\n' +
//					message.dump());

				ns.messageEventCb(null, message);
        	});



            //alert("connectSession triggered");
            ns.logUtil("Initiating Connection");
 

			mySession.connect();
*/
 		
/* 		} catch (error) {
           	ns.logUtil("EXCEPTION: Failed to connect session");
            ns.logUtil(error.toString());
            //alert(error.toString());
        }*/
    };

    /**
     * Invoked when disconnect button is clicked. Disconnects the session, and then disposes it
     */
    this.disconnectSessionAndCleanup = function() {
        logUtil("About to disconnect session...");
        try {
            myCacheSession.dispose();
			mySession.disconnect();
            mySession.dispose();
			myCacheSession = null;
            mySession = null;
            autoReconnect = false;           
        } catch (error) {
            ns.logUtil("Failed to disconnect session");
            ns.logUtil(error.toString());
        }
    };

    /**
     * send data to the server side
     */
     this.sendData = function(topic, payload) {
     
     	var svrStatus = document.getElementById("divSvrStatus").innerHTML;
     	if (svrStatus != "UP") {
     		ns.logUtil("Failed to send message, Conn not UP");
     		return;
     	}
        var msg = solace.SolclientFactory.createMessage();
        msg.setDestination(solace.SolclientFactory.createTopic(topic));
        msg.setDeliveryMode(solace.MessageDeliveryModeType.DIRECT);
        msg.setBinaryAttachment(payload);
        msg.setXmlContent(payload);
        
		try {
			mySession.send(msg);
			ns.logUtil("sent msg:"+payload);
		} catch (error) {
			// failed to send, therefore stop publishing and log the error thrown
			ns.logUtil("Failed to send message '" + msg.toString() + "'");
			ns.logUtil(error.toString() + error.Message);
		}       
     };
          
    /**
     * Invoked when add subscription button is clicked
     * This method injects the passed topic subscriptions into Solace, and ties them to the connected session.
     * Any new message arriving on a topic, which matches any of the injected subscription, in full or via wildcards
     * will be delivered to the message callback method registered with the session
     */
    this.addSubscription = function(topic_string) {
        //alert("test1: "+topic_string);
        ns.logUtil("About to add subscription '" + topic_string + "'");
        if (mySession !== null) {
            try {
            	//Initialize the Topic with the desired topic string. The topic string can contain wildcards
                var topic = solace.SolclientFactory.createTopicDestination(topic_string);
                try {
                	//this method actually adds the subscriptions and can be called multiple times on a session
                    mySession.subscribe(topic, true, topic_string, OPERATION_TIMEOUT);
                    //alert("test123: "+topic_string);
                } catch (e) {
                	//error handling
                	ns.logUtil ("Add Sub ex\n"+e.message+"\n\nsubcode:"+e.subcode+"\n\n"+solace.ErrorSubcode.INVALID_SESSION_OPERATION);
                     if (e instanceof solace.OperationError && e.subcode === solace.ErrorSubcode.INSUFFICIENT_SPACE) {
                        ns.logUtil("Add subscription blocked");
                        //push the erroneous subscriptions to the pending subscriptions array
                        ns.subscriptionsInWaiting.push(
                            {
                                subscription: topic,
                                add: true
                            });
                        return;
                    }
                     if (e instanceof solace.OperationError && e.subcode === solace.ErrorSubcode.INVALID_SESSION_OPERATION) {
                        ns.logUtil("Add subscription WAITING_FOR_TRANSPORT_UP, stacking...");
                        //push the erroneous subscriptions to the pending subscriptions array
                        ns.subscriptionsInWaiting.push(
                            {
                                subscription: topic,
                                add: true
                            });
                        return;
                    }


                    throw e;
                }

            } catch (error) {
                ns.logUtil("Failed to add subscription '" + topic_string + "'");
                ns.logUtil(error.toString());
            }
        }
        
    };

    /**
     * Invoked to remove subscriptions which have been added to a session
     */
    this.removeSubscription = function(topic_string) {
        ns.logUtil("About to remove subscription '" + topic_string + "'");
        if (mySession !== null) {
            try {
                var topic = solace.SolclientFactory.createTopic(topic_string);
                try {
                    mySession.unsubscribe(topic, true, topic_string, OPERATION_TIMEOUT);
                } catch (e) {
                    if (e instanceof solace.OperationError && e.subcode === solace.ErrorSubcode.INSUFFICIENT_SPACE) {
                        ns.logUtil("Remove subscription blocked");
                        ns.subscriptionsInWaiting.push(
                            {
                                subscription: topic,
                                add: false
                            });
                        return;
                    }
                    throw e;
                }

            } catch (error) {
                ns.logUtil("Failed to add subscription '" + topic_string);
                ns.logUtil(error.toString());
            }
        }
    };


    /**
     * Direct message receive callback. Solace pushes messages to this method as and when they are published
     * if they match the added subscriptions. This method should call handler methods to process the message data
     * In this example, this method calls the helloWorldMessageCallback() method and passes it the topic and message payload
     * The helloWorldMessageCallback() which is defined in the index.html file itself, and it modifies the GUI to display the text received in the messages
     * @param session - the session on which the messages are received
     * @param message - the actual message with payload and topic
     */
    this.messageEventCb = function (session, message) {
    //alert("test");
    	//extract the payload and topic from the message
    	var payload = message.getBinaryAttachment();
		var payloadTxt = message.getXmlContent();
    	var topic_string = message.getDestination().getName();
    
    	if (payload == null) payload = payloadTxt;

    	//ns.logUtil(topic_string+" " + payload);
		
		
		topic_string_1 = topic_string.substr(0,3);
		//alert("topic "+topic_string_1)
		if(topic_string_1==="MD/"){
		//alert("test1"+topic_string_1);
    	this.paintData (topic_string, payload);
    	} else {
		

    	}

    };
    
    this.paintData = function (topic_string, payload) {

    	try { 
        	objJSON = $.parseJSON(payload);
        	var tr_id = topic_string.replace(/\//g, '_');
        	var td_id = topic_string.replace(/\//g, '_');

			var data = tr_id.split("_");

			var tr_id = data[0]+"_"+data[1]+"_"+data[2]
			var strEx = data[1];
        	
			$.each(objJSON, function(index, tick) {
			
				var intChange = tick.Chg;
				//alert("intChange : "+intChange);
			
				var symbol = tick.Sec;

				if(intChange == "+") {
//					altRow = "background-image: -webkit-linear-gradient(top, #00360C 0%, #010133 100%)";
//					txtColor= "color:#00FA37";
					arrow = "<img src='img/up.png' width='15px' height='15px'/>";
				}
				else {
//					altRow = "background-image: -webkit-linear-gradient(top, #005713 0%, #02026B 100%)";
//					txtColor = "color:#FF0000"
					arrow = "<img src='img/down.png' width='15px' height='15px'/>";
				}
/*					  
				styleColRG= "style='"+txtColor+";"+altRow+";padding:2px;font-weight:normal;'";
				styleCol= "style='color:#FFFFFF;"+altRow+";padding:2px;font-weight:normal;'";*/

				//alert(styleCol);
				
				var table = document.getElementById("tab_securities");
				
				// If no record exists for the symbol create/update market data table
				if(document.getElementById(tr_id)==null) {
					// Add row for new symbol at the end of the table
					var row = table.insertRow(-1);
					row.classList.add("tr_data");
					row.id = tr_id;

					// Add Symbol Label
					var symbolCell = row.insertCell(0);
					symbolCell.style.background = '-webkit-linear-gradient(top, #005713 0%, #02026B 100%)';
					symbolCell.style.color = '#FFFFFF';
					symbolCell.innerHTML = tick.Sec;
					symbolCell.id = tr_id+"_SEC";
					symbolCell.classList.add("symbol");

					//Exchange Label
					var exchCell = row.insertCell(-1);
					exchCell.style.background = '-webkit-linear-gradient(top, #005713 0%, #02026B 100%)';
					exchCell.style.color = '#FFFFFF';
					exchCell.innerHTML = strEx;
					exchCell.id = tr_id+"_EXC";
					exchCell.classList.add("symbol");
					
					//Change
					var chgCell = row.insertCell(-1);
					chgCell.id = tr_id+"_ARR";
					chgCell.classList.add("tab_securities_cell","arrow");
											
					//Price
					var priceCell = row.insertCell(-1);
					priceCell.id = tr_id+"_PRI";
					priceCell.classList.add("tab_securities_cell","price");

					//Volume
					var volumeCell = row.insertCell(-1);
					volumeCell.id = tr_id+"_QTY";
					volumeCell.classList.add("tab_securities_cell","volume");
				} 

				var chgCell = document.getElementById(tr_id+"_ARR");
				var priceCell = document.getElementById(tr_id+"_PRI");
				var volumeCell = document.getElementById(tr_id+"_QTY");

				//Regardless whether cells where just created or already existed, we always update their content
				chgCell.innerHTML = arrow;
				priceCell.innerHTML = parseFloat(tick.Price).toFixed(2);
				volumeCell.innerHTML = tick.Qty;

				//Stock Monitor Fade In/Out animation
				if(intChange == "+") {
					chgCell.classList.add("tab_securities_cell_green");
					setTimeout( function(){ chgCell.classList.remove("tab_securities_cell_green") } ,  500);
					priceCell.classList.add("tab_securities_cell_green");
					setTimeout( function(){ priceCell.classList.remove("tab_securities_cell_green") } ,  500);
					volumeCell.classList.add("tab_securities_cell_green");
					setTimeout( function(){ volumeCell.classList.remove("tab_securities_cell_green") } ,  500);
				}
				else {
					chgCell.classList.add("tab_securities_cell_red");
					setTimeout( function(){ chgCell.classList.remove("tab_securities_cell_red") } ,  500);
					priceCell.classList.add("tab_securities_cell_red");
					setTimeout( function(){ priceCell.classList.remove("tab_securities_cell_red") } ,  500);
					volumeCell.classList.add("tab_securities_cell_red");
					setTimeout( function(){ volumeCell.classList.remove("tab_securities_cell_red") } ,  500);
				}

				chgCell.classList.remove("tab_securities_cell");
				setTimeout( function(){ chgCell.classList.add("tab_securities_cell") },  500);
				priceCell.classList.remove("tab_securities_cell");
				setTimeout( function(){ priceCell.classList.add("tab_securities_cell") },  500);
				volumeCell.classList.remove("tab_securities_cell");
				setTimeout( function(){ volumeCell.classList.add("tab_securities_cell") },  500);


				//set callbacks on each cell for populating the Order Request form
//				chgCell.onclick = createClickHandler(symbol,tick.Price,tick.Qty,strEx);
//				priceCell.onclick = createClickHandler(symbol,tick.Price,tick.Qty,strEx);
//				volumeCell.onclick = createClickHandler(symbol,tick.Price,tick.Qty,strEx);

			});

		} catch (error) {
			alert("JSON PARSE ERROR="+error);
		}
    };

  
    this.addStackedSubscriptions = function() {
    	
		while (ns.subscriptionsInWaiting.length > 0) {
			var sub = ns.subscriptionsInWaiting[0].subscription;
			var add = ns.subscriptionsInWaiting[0].add;
			ns.logUtil("Resend subscription '" + sub.m_name + "'");
			try {
				if (add) {
					mySession.subscribe(sub, true, sub.m_name, OPERATION_TIMEOUT);
				}
				else {
					mySession.unsubscribe(sub, true, sub.m_name, OPERATION_TIMEOUT);
				}
				ns.subscriptionsInWaiting.shift();
			} catch (e) {
				if (e instanceof solace.OperationError && e.subcode === solace.ErrorSubcode.INSUFFICIENT_SPACE) {
					ns.logUtil("Resend subscription blocked");
					return;
				}
				throw e;
			} 
		}   
    };



    /**
     * Session event callback method. This method is called by Solace to publish session lifecycle events
     * such as Connection UP, disconnect, added subscription etc
     * Any of these events can be handled from this method, e.g. reconnecting in case of a disconnect
     * @param session
     * @param event
     */
    this.sessionEventCb = function (session, event) {
        ns.logUtil(event.toString());
        if (event.sessionEventCode === solace.SessionEventCode.UP_NOTICE) {
            ns.logUtil("Connected to Solace");
            //this calls the UIHelder method to update the status display
            ns.statusUpdate("Connected", "green");
            //add stacked subscriptions
            addStackedSubscriptions();

        } else if (event.sessionEventCode === solace.SessionEventCode.CAN_ACCEPT_DATA) {
        	//this event is generated when the session is able to accept new subscriptions and after a congestion
        	//use this event to send the pending subscriptions
            addStackedSubscriptions();


        } else if (event.sessionEventCode === solace.SessionEventCode.DISCONNECTED) {
            ns.logUtil("Disconnected from Solace");
            //this calls the UIHelder method to update the status display
            ns.statusUpdate("Disconnected", "red");
            
            ns.subscriptionsInWaiting = [];
            // error occurred!
            if (autoReconnect) {
                setTimeout(
                   function(){
                       ns.connectSession();
                   }, 100);
            }
        } else if (event.sessionEventCode === solace.SessionEventCode.SUBSCRIPTION_OK) {
            ns.logUtil("Subscription added/removed: '" + event.correlationKey + "'");
        } else if (event.sessionEventCode === solace.SessionEventCode.SUBSCRIPTION_ERROR) {
            ns.logUtil("Failed to add subscription:  '" + event.correlationKey + "'");
        } else if (event.sessionEventCode === solace.SessionEventCode.LOGIN_FAILURE) {
            ns.logUtil("Login Failure!");
        } else if (event.sessionEventCode === solace.SessionEventCode.CONNECTING) {
            ns.logUtil("Connecting...");
            ns.statusUpdate("Connecting", "orange");
        } else {
            ns.logUtil("Error!");
        }
    };

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Solace Queue Consumer  Functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	var consumer = {};
    consumer.session = null;
    consumer.queueName = null;
    consumer.queueDestination = null;
	consumer.consuming = false;

	this.queueBindtoQueue = function(queueName) {

		consumer.session = mySession;
		consumer.queueName = queueName;
		consumer.queueDestination = new solace.Destination(consumer.queueName, solace.DestinationType.QUEUE);

		//Disconnect previous queues
		if (consumer.session !== null) {
            if (consumer.consuming) {
                consumer.consuming = false;
                consumer.log('Disconnecting consumption from queue: ' + consumer.queueName);
                try {
                    consumer.messageConsumer.disconnect();
                    consumer.messageConsumer.dispose();
                } catch (error) {
                    console.log(error.toString());
                }
            } else {
                console.log('Cannot disconnect the consumer because it is not connected to queue "' + consumer.queueName + '"');
            }
        } else {
            console.log('Cannot disconnect the consumer because not connected to Solace message router.');
        }

		try {
			// Create a message consumer
			consumer.messageConsumer = consumer.session.createMessageConsumer({
				// solace.MessageConsumerProperties
				queueDescriptor: { name: consumer.queueName, type: solace.QueueType.QUEUE },
				acknowledgeMode: solace.MessageConsumerAcknowledgeMode.CLIENT, // Enabling Client ack
			});
			// Define message consumer event listeners
			consumer.messageConsumer.on(solace.MessageConsumerEventName.UP, function () {
				consumer.consuming = true;
				consumer.log('=== Ready to receive messages. ===');
			});
			consumer.messageConsumer.on(solace.MessageConsumerEventName.CONNECT_FAILED_ERROR, function () {
				consumer.consuming = false;
				alert('=== Error: the message consumer could not bind to queue "' + consumer.queueName +
					'" ===\n   Ensure this queue exists on the message router vpn');
			});
			consumer.messageConsumer.on(solace.MessageConsumerEventName.DOWN, function () {
				consumer.consuming = false;
				consumer.log('=== The message consumer is now down ===');
			});
			consumer.messageConsumer.on(solace.MessageConsumerEventName.DOWN_ERROR, function () {
				consumer.consuming = false;
				consumer.log('=== An error happened, the message consumer is down ===');
			});
			// Define message received event listener
			consumer.messageConsumer.on(solace.MessageConsumerEventName.MESSAGE, function (message) {

//				consumer.log('Received message: "' + message.getBinaryAttachment() + '",' +
//					' details:\n' + message.dump());
				// Need to explicitly ack otherwise it will not be deleted from the message router
//				message.acknowledge();
				ns.messageFromQueueEventCb(message);

			});
			// Connect the message consumer
			consumer.messageConsumer.connect();
		} catch (error) {
			console.log(error.toString());
		}
	};

	this.queueBindRq = function() {
		//Cleant Table
		$("#tab_TradeHistory .tr_data").remove(); 

		var queueSymbolValue = document.getElementById("QueueSymbol").value;

		ns.queueBindtoQueue(queueSymbolValue);
	};
	
	this.messageFromQueueEventCb = function (message) {

		//extract the payload and topic from the message
		var payload = message.getBinaryAttachment();
		var payloadTxt = message.getXmlContent();
		var topic_string = message.getDestination().getName();
	
		if (payload == null) payload = payloadTxt;

		//ns.logUtil(topic_string+" " + payload);
		
		
		topic_string_1 = topic_string.substr(0,3);
		//alert("topic "+topic_string_1)
		if(topic_string_1==="MD/"){
			this.paintData (topic_string, payload);
		} else {
			//Do nothing 
		}

		message.acknowledge();
	};


	// Logger
	consumer.log = function (line) {
		var now = new Date();
		var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
			('0' + now.getSeconds()).slice(-2)];
		var timestamp = '[' + time.join(':') + '] ';
		console.log(timestamp + line);
	};
	
		
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Solace Cache Functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 	/**
     * Cache Request Callback Function 
     */
	this.cacheReqCb = function (requestID, result, userObject) {

		var ReturnCodeStr="";
		var ReturnSubCodeStr="";

		ns.logUtil("Solace Cache Response -> ReturnCode:"+ result.getReturnCode() + " ReturnSubCode:" + result.getReturnSubcode());

		switch(result.getReturnCode()) {
			case solace.CacheReturnCode.OK:
				ReturnCodeStr = "OK";
				break;
			case solace.CacheReturnCode.FAIL:
				ReturnCodeStr = "FAIL";
				break;
			case solace.CacheReturnCode.INCOMPLETE :
				ReturnCodeStr = "INCOMPLETE";
				break;
  			default:
				ReturnCodeStr = "Unknown!";
		} 

		switch(result.getReturnSubcode()) {
			case solace.CacheReturnSubcode.REQUEST_COMPLETE:
				ReturnSubCodeStr = "REQUEST_COMPLETE";
				break;
			case solace.CacheReturnSubcode.LIVE_DATA_FULFILL:
				ReturnSubCodeStr = "LIVE_DATA_FULFILL";
				break;
			case solace.CacheReturnSubcode.ERROR_RESPONSE:
				ReturnSubCodeStr = "ERROR_RESPONSE";
				break;
			case solace.CacheReturnSubcode.INVALID_SESSION:
				ReturnSubCodeStr = "INVALID_SESSION";
				break;
			case solace.CacheReturnSubcode.REQUEST_TIMEOUT:
				ReturnSubCodeStr = "REQUEST_TIMEOUT";
				break;	
			case solace.CacheReturnSubcode.REQUEST_ALREADY_IN_PROGRESS:
				ReturnSubCodeStr = "REQUEST_ALREADY_IN_PROGRESS";
				break;
			case solace.CacheReturnSubcode.NO_DATA:
				ReturnSubCodeStr = "NO_DATA";
				break;
			case solace.CacheReturnSubcode.SUSPECT_DATA:
				ReturnSubCodeStr = "SUSPECT_DATA";
				break;
			case solace.CacheReturnSubcode.CACHE_SESSION_DISPOSED:
				ReturnSubCodeStr = "CACHE_SESSION_DISPOSED";
				break;
			case solace.CacheReturnSubcode.SUBSCRIPTION_ERROR:
				ReturnSubCodeStr = "SUBSCRIPTION_ERROR";
				break;				
  			default:
				ReturnSubCodeStr = "Unknown";
		} 

		$("#CacheCode").text(ReturnCodeStr);
		$("#CacheSubCode").text(ReturnSubCodeStr);
  
	};

 	/**
     * Creates a Cache session object
     */
	this.createSolCacheSession = function() {

        if (mySession !== null) {
            try {
				//initialize Cache Session properties
				myCacheSessionProps = new solace.CacheSessionProperties();
				myCacheSessionProps.cacheName  = my_cacheName;
				myCacheSessionProps.maxMessages  = cacheMaxMessages;
				
				myCacheSession = mySession.createCacheSession(myCacheSessionProps);
				ns.logUtil("Cache Session Created ");

            } catch (error) {
                ns.logUtil("Failed to Create Cache Session ");
                ns.logUtil(error.toString());
            }
		}
	};

	/**
     * Sends a Cache request
     */
	 this.addCachedSubscription = function(topic_string) {

        if (myCacheSession !== null) {
            try {

				var topic = solace.SolclientFactory.createTopicDestination(topic_string);
				
				////////////////////////////////////////////////////////////////////////////////
				//Note that wildcard cache requests must always be CacheLiveDataAction.FLOW_THRU.
				////////////////////////////////////////////////////////////////////////////////
				myCacheSession.sendCacheRequest(1, topic , true, solace.CacheLiveDataAction.FLOW_THRU, new solace.CacheCBInfo(function(requestID, result, userObject) {
					cacheReqCb(requestID, result, userObject);
				}, this))

				ns.logUtil("Cache Request Sent ");

            } catch (error) {
                ns.logUtil("Failed to Send Cache Request ");
                ns.logUtil(error.toString());
            }
		}
	};

	//resubscribe to MarketData WITHOUTH Cache
	this.resubscribeWOCache = function() {
		//clean MD table
		$("#tab_securities .tr_data").remove();

		removeSubscription("MD/>");

		$("#CacheCode").text("N/A");
		$("#CacheSubCode").text("N/A");

		addSubscription("MD/>");
	};

	//resubscribe to MarketData WITH Cache
	this.resubscribeWCache = function() {
		//clean MD table
		$("#tab_securities .tr_data").remove();

		removeSubscription("MD/>");

		$("#CacheCode").text("...");
		$("#CacheSubCode").text("...");

		addCachedSubscription("MD/>");
	};
