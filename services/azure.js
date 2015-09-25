var azure = require('azure-storage');
var srv = function () {
	var partition="match";
	var table="rugbytime";
	var accName = "gerardtoconnor";
	var host = "https://gerardtoconnor.table.core.windows.net/";
	var accKey = "ULOYsfGwLdOBM6XI9t5wVO0FpnnDEwwd36qg+ZZza0AKXCCVJlEIRryo6Yb9FFQF1ZH1w+yy+s3mRPwhw9cnbw=="; 
	var tableSvc = azure.createTableService(accName,accKey);
	tableSvc.createTableIfNotExists(table, function(error, result, response){
			if(error){ 
				console.log(error)
				}
			else{
				console.log(result)
			}
	});
	
	return {
		getById: function (id,match,recKey,callback) {
			tableSvc.retrieveEntity(table, partition, id, function(error, result, response){
				if(!error){
					callback(result.data['_'],match,recKey)
				} else { 
					console.log(error)
					callback(0,match,recKey)
					}
			});
		},
		getAll: function (callback) {
			var query = new azure.TableQuery().where('PartitionKey eq ?', partition);
			tableSvc.queryEntities(table,query, null, function(error, result, response) {
				if(!error) {
					// query was successful
					var results = []
					for (var i = 0; i < result.entries.length;i++){
						results.push({
							id:result.entries[i].PartitionKey['_'] , 
							data:result.entries[i].data['_']
							})
					}
					callback(results)
				}
				if(error){ console.log(error)}
			});
			

		},
		addEntity: function (id,v) {
			var task = {
				PartitionKey: {'_':partition},
				RowKey: {'_': id},
				data: {'_':v},
			}

			tableSvc.insertEntity(table,task, function (error, result, response) {
				if(!error){
					// Entity inserted
				}
				if(error){ console.log(error)}
			});
		},
		updateEnity: function (id,v) {
			var task = {
				PartitionKey: {'_':partition},
				RowKey: {'_': id},
				data: {'_':v},
			}
			tableSvc.updateEntity(table, task, function(error, result, response){
				if(!error) {
					// Entity updated
				}
				if(error){ console.log(error)}
			});
		},
		batchFetch: function(ids,callback) {
			var batch = new azure.TableBatch();
			
			for (var index = 0; index < ids.length; index++) {
				batch.retrieveEntity(table, partition, ids[index], {echoContent: true});				
			}	
			
			tableSvc.executeBatch(table, batch, function (error, result, response) {
				if(!error) {
					callback(result)
				}
				if(error){ console.log(error)}
			});
		}	
	}
}
module.exports = srv()