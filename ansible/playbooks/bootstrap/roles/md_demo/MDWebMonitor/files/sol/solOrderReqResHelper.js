    var ns = this;
    
  
    /**
    * Change this variable to point it to the host:port of the solace appliance
    * You may have to use a Web Server Reverse Proxy to deal with CORS issues for older browsers
    * E.g. For the Reverse Proxy case, if you are serving your application on apache running on 192.168.0.12 on port 8080 
    * the below url should be
    * http://192.168.0.12:8080/smf
    */

	
    var mySession = null;
    
//    var autoReconnect = false;
//    var mySession = null;

    /** Forward declarations of session callback and message callback methods
    * sessionEvenCb - a callback method defined later in this file, 
    * 		which is called by Solace in case a session event such as connect, disconnect, reconnect etc occurs
    *
    * messageEventCb - - a callback method defined later in this file,
    *		which is called by Solace to push messages into, whenever a new message matches the added subscriptions on the session
    */
    var exchangeSolaceSessions = []; // forward declaration



	// Send an order request to the exchange 
	function sendOrderReqExchange(action) {

		var account = js_username;
		var instrument = document.getElementById("stksymbol").value;
		var price = document.getElementById("stkprice").value;
		var qty = document.getElementById("volume").value;

		if (instrument == '' || price == '' || qty == ''){
			alert("Please complete all the fields for the Order");
			return false;
		}

		var exchCombo = document.getElementById("ExchangeCombo");
		var exchangeName = exchCombo.options[exchCombo.selectedIndex].text;
		var session = exchangeSolaceSessions[exchCombo.selectedIndex];

		var request = { account:account , instrument:instrument, price:price, qty:qty, settlementExch:memberExchange, side:action };
		var myJSON = JSON.stringify(request);
		session.sendOrdReqData("ORDER/"+exchangeName+"/REQUEST/"+ account+"/"+instrument ,myJSON);
		document.getElementById("OrderRequestStatus").innerHTML = "Order sent to the exchange " + exchangeName;
		
	}

	// Create one Solace Session per Exchange
	this.initializeOrdReqSessions = function() {

		var NSESession = new ExchSolSession(EME_NSE_Url,EME_NSE_Vpn,EME_NSE_ClientUsername,EME_NSE_Password,"NSE_OrderRequest_GUI");
		NSESession.connectOrdReqSession();
		NSESession.addSubscription("ORDER/NSE/RESPONSE/"+js_username+"/>");
		exchangeSolaceSessions.push(NSESession);

		var BSESession = new ExchSolSession(EME_BSE_Url,EME_BSE_Vpn,EME_BSE_ClientUsername,EME_BSE_Password,"BSE_OrderRequest_GUI");
		BSESession.connectOrdReqSession();
		BSESession.addSubscription("ORDER/BSE/RESPONSE/"+js_username+"/>");
		exchangeSolaceSessions.push(BSESession);

		var MSESession = new ExchSolSession(EME_MSE_Url,EME_MSE_Vpn,EME_MSE_ClientUsername,EME_MSE_Password,"MSE_OrderRequest_GUI");
		MSESession.connectOrdReqSession();
		MSESession.addSubscription("ORDER/MSE/RESPONSE/"+js_username+"/>");
		exchangeSolaceSessions.push(MSESession);

	}

	//"class" for managign a single independent Solace conection
	var ExchSolSession = (function () {
	
		//constructor
		var ExchSolSession = function (url,vpn,clientUsername,password,clientDescription) {
			this.url = url;
			this.vpnName = vpn;
			this.userName = clientUsername;
			this.password = password;
			this.clientDescription = clientDescription;

			this.subscriptionsInWaiting = [];
			this.session = null;
		}

		/**
		 * Creates a session object, to be used for connection later
		 * Connectivity parameters such as IP, Port, VPN, Username, Password etc 
		 * are used to initialize the session object 
		 *
		 * Most importantly, as explained above, this method creates the session by associating it with 2 callback methods
		 * message event callback method, for Solace to push the messages into 
		 * session event callback method, for Solace to push session event messages into
		 */

		ExchSolSession.prototype.connectOrdReqSession = function() {
			try {
				//initialize session properties
				var sessionProperties = new solace.SessionProperties();
				sessionProperties.url = this.url; 
				sessionProperties.vpnName = this.vpnName;
				sessionProperties.userName = this.userName;
				sessionProperties.password = this.password;
				if (this.clientDescription != null)
					sessionProperties.applicationDescription = this.clientDescription;
			
				sessionProperties.connectTimeoutInMsecs = OPERATION_TIMEOUT;
				sessionProperties.readTimeoutInMsecs = OPERATION_TIMEOUT;
				sessionProperties.keepAliveIntervalsLimit = 10;
				sessionProperties.connectTimeoutInMsecs = 25000;
				sessionProperties.transportDowngradeTimeoutInMsecs = 5000;
				sessionProperties.reapplySubscriptions = true;
			
				var session = solace.SolclientFactory.createSession(sessionProperties,
						new solace.MessageRxCBInfo(function(session, message, object) {
							ExchSolSession.messageEventCb(session, message, object);
						}, this),
						new solace.SessionEventCBInfo(function(session, event, object) {
							ExchSolSession.sessionEventCb(session, event, object);
						}, this));
				

				//this is where the actual connection initiation begines. 
				//The connection may not have been established by the time this method returns.
				//Once the connection is established, an event - sessionEventCode=UP_NOTICE is sent to the session callback method
				//So subscriptions etc should only be added after the sessionEventCode=UP_NOTICE event has been received
				session.connect();

				//alert("connectSession triggered");
				ns.logUtil("Initiating Connection");
				
				this.session = session;
			
			} catch (error) {
				ns.logUtil("EXCEPTION: Failed to connect session");
				ns.logUtil(error.toString());
				//alert(error.toString());
			}
		}


		/**
		 * Invoked when disconnect button is clicked. Disconnects the session, and then disposes it
		 */
		ExchSolSession.prototype.disconnectOrdReqSessionAndCleanup = function() {
			logUtil("About to disconnect session...");
			try {
				this.session.disconnect();
				this.session.dispose();
				this.session = null;
			} catch (error) {
				ns.logUtil("Failed to disconnect session");
				ns.logUtil(error.toString());
			}
		}

		/**
		 * send data to the server side
		 */
		
		ExchSolSession.prototype.sendOrdReqData = function(topic, payload) {

			var msg = solace.SolclientFactory.createMessage();
			msg.setDestination(solace.SolclientFactory.createTopic(topic));
			msg.setDeliveryMode(solace.MessageDeliveryModeType.DIRECT);
			msg.setBinaryAttachment(payload);
			
			try {
				this.session.send(msg);
				//ns.logUtil("sent msg:"+payload);
			} catch (error) {
				// failed to send, therefore stop publishing and log the error thrown
				ns.logUtil("Failed to send message '" + msg.toString() + "'");
				ns.logUtil(error.toString() + error.Message);
			}     
		}  


/**
		 * Invoked when add subscription button is clicked
		 * This method injects the passed topic subscriptions into Solace, and ties them to the connected session.
		 * Any new message arriving on a topic, which matches any of the injected subscription, in full or via wildcards
		 * will be delivered to the message callback method registered with the session
		 */
		ExchSolSession.prototype.addSubscription = function(topic_string) {
			ns.logUtil("About to add subscription '" + topic_string + "'");
			if (this.session !== null) {
				try {
					//Initialize the Topic with the desired topic string. The topic string can contain wildcards
					var topic = solace.SolclientFactory.createTopic(topic_string);
					try {
						//this method actually adds the subscriptions and can be called multiple times on a session
						this.session.subscribe(topic, true, topic_string, OPERATION_TIMEOUT);
						
					} catch (e) {
						//error handling
						ns.logUtil ("Add Sub ex\n"+e.message+"\n\nsubcode:"+e.subcode+"\n\n"+solace.ErrorSubcode.INVALID_SESSION_OPERATION);
						if (e instanceof solace.OperationError && e.subcode === solace.ErrorSubcode.INSUFFICIENT_SPACE) {
							ns.logUtil("Add subscription blocked");
							//push the erroneous subscriptions to the pending subscriptions array
							this.subscriptionsInWaiting.push(
								{
									subscription: topic,
									add: true
								});
							return;
							
						}
						if (e instanceof solace.OperationError && e.subcode === solace.ErrorSubcode.INVALID_SESSION_OPERATION) {
							ns.logUtil("Add subscription WAITING_FOR_TRANSPORT_UP, retry...");
							//push the erroneous subscriptions to the pending subscriptions array
							this.subscriptionsInWaiting.push(
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
		}
		
		/**
     * Invoked to remove subscriptions which have been added to a session
     */
		ExchSolSession.prototype.removeSubscription = function(topic_string) {
			ns.logUtil("About to remove subscription '" + topic_string + "'");
			if (this.session !== null) {
				try {
					var topic = solace.SolclientFactory.createTopic(topic_string);
					try {
						this.session.unsubscribe(topic, true, topic_string, OPERATION_TIMEOUT);
					} catch (e) {
						if (e instanceof solace.OperationError && e.subcode === solace.ErrorSubcode.INSUFFICIENT_SPACE) {
							ns.logUtil("Remove subscription blocked");
							this.subscriptionsInWaiting.push(
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

		ExchSolSession.prototype.addStackedSubscriptions = function() {
    	
			while (this.subscriptionsInWaiting.length > 0) {
				var sub = this.subscriptionsInWaiting[0].subscription;
				var add = this.subscriptionsInWaiting[0].add;
				ns.logUtil("Resend subscription '" + sub.m_name + "'");
				try {
					if (add) {
						this.session.subscribe(sub, true, sub.m_name, OPERATION_TIMEOUT);
					}
					else {
						this.session.unsubscribe(sub, true, sub.m_name, OPERATION_TIMEOUT);
					}
					this.subscriptionsInWaiting.shift();
				} catch (e) {
					if (e instanceof solace.OperationError && e.subcode === solace.ErrorSubcode.INSUFFICIENT_SPACE) {
						ns.logUtil("Resend subscription blocked");
						return;
					}
					throw e;
				} 
			}   
		}


		/**
		 * Direct message receive callback. Solace pushes messages to this method as and when they are published
		 * if they match the added subscriptions. This method should call handler methods to process the message data
		 * In this example, this method calls the helloWorldMessageCallback() method and passes it the topic and message payload
		 * The helloWorldMessageCallback() which is defined in the index.html file itself, and it modifies the GUI to display the text received in the messages
		 * @param session - the session on which the messages are received
		 * @param message - the actual message with payload and topic
		 */
		ExchSolSession.messageEventCb = function (session, message, object) {

			var payload = message.getBinaryAttachment();
			var topic_string = message.getDestination().getName();
		
			var response = JSON.parse(payload);

			document.getElementById("OrderRequestStatus").innerHTML = "<span class=\"ordReqResponse_status\">"+ response.side +" </span> Order for <span class=\"ordReqResponse_status\">"+ response.instrument +"</span> was accepted an will be executed by the exchange <span class=\"ordReqResponse_status\">"+ response.executionExch + "</span> with order id <span class=\"ordReqResponse_status\">" + response.orderId +"</span>.<br> Settlement (Porftolio update) will take place at the <span class=\"ordReqResponse_status\">"+ response.settlementExch + "</span> exchange" ;
	
		};

		/**
		 * Session event callback method. This method is called by Solace to publish session lifecycle events
		 * such as Connection UP, disconnect, added subscription etc
		 * Any of these events can be handled from this method, e.g. reconnecting in case of a disconnect
		 * @param session
		 * @param event
		 */
		ExchSolSession.sessionEventCb = function (session, event, object) {
			ns.logUtil(event.toString());
			if (event.sessionEventCode === solace.SessionEventCode.UP_NOTICE) {
				
				ns.logUtil("Connected to Solace");
				//this calls the UIHelder method to update the status display
//				ns.statusUpdate("Connected", "green");
				//add stacked subscriptions
				object.addStackedSubscriptions();

			} else if (event.sessionEventCode === solace.SessionEventCode.CAN_ACCEPT_DATA) {
				//this event is generated when the session is able to accept new subscriptions and after a congestion
				//use this event to send the pending subscriptions
				object.addStackedSubscriptions();


			} else if (event.sessionEventCode === solace.SessionEventCode.DISCONNECTED) {
				ns.logUtil("Disconnected from Solace");
				//this calls the UIHelder method to update the status display
//				ns.statusUpdate("Disconnected", "red");
				
				object.subscriptionsInWaiting = [];
				// error occurred!
				if (autoReconnect) {
					setTimeout(
					function(){
						object.connectOrdReqSession();
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
//				ns.statusUpdate("Connecting", "orange");
			} else {
				ns.logUtil("Error!");
			}
		}

		return ExchSolSession;
	})();

	var createClickHandler = function  (symbol, price, volume, exchange) {
		return function() {

			document.getElementById("stksymbol").value = symbol;
			document.getElementById("stkprice").value = price;
			//document.getElementById("volume").value = volume;
			$('#ExchangeCombo').val(exchange);
			$('#ExchangeCombo').selectmenu('refresh');

		};
	};

