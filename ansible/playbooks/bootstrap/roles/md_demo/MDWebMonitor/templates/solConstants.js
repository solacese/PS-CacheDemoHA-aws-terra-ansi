
    var OPERATION_TIMEOUT = 30000;
    var REQUEST_TIMEOUT = 5000;

    //Solace Cloud Monitor and Portfolio connection
    var my_web_server_url = "ws://{{ sol_broker_primary_public_ip }}:8008,ws://{{ sol_broker_backup_public_ip }}:8008"; 
    var my_vpn = "{{ sol_cache_vpn_name }}";
    var my_client_username = "{{ sol_cache_clientusr_name }}";
    var my_password = "{{ sol_cache_clientusr_pwd }}";

    var my_cacheName = "{{ sol_distributed_cache_name }}"; 

 	/**
 	* Global variables which control the session (tcp connection)
 	*/           

     var publishIntervalId = null;
     var statsIntervalId = null;
     var elapsedTimeInSecs = 0;
     var connectedOnce = false;
     var previousTick = 0;
 
      	/**
 	* Global variables which control the cache session
     */           

     var cacheMaxMessages = 1; 
