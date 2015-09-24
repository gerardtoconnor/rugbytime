var azure = require('azure-storage');
var srv = function () {
	var partition="match";
	var table="rugbytime";
	var accName = "rugbytime";
	var accKey = "XuqVEjTSllC/bC/TQK5ul2fpq/lOP8VznJGtQJJmqRHSa7mI4xGElIr4uOXjsmofdsDilzuroD7b8UFq+EQ9zw=="; 
	var tableSvc = azure.createTableService(accName,accKey);
	tableSvc.createTableIfNotExists(table, function(error, result, response){
			if(error){ console.log(error)}
	});
	
	return {
		getAll: function (callback) {
			var query = new azure.TableQuery().where('PartitionKey eq ?', partition);
			tableSvc.queryEntities('mytable',query, null, function(error, result, response) {
				if(!error) {
					// query was successful
					var results = []
					for (var i = 0; i < result.length;i++){
						results.push({
							id:result[i].PartitionKey['_'] , 
							data:result[i].data['_']
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
		}	
	}
}
module.exports = srv()