var express = require('express');
var http = require('http');
var https = require('https');
var router = express.Router();
var azure = require('../services/azure');

var jsonReq = function (options,onResult,body) {
    
    var prot = options.port == 443 ? https : http;
    var req = prot.request(options, function(res)
    {
        var output = '';
        console.log(options.host + ':' + res.statusCode);
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() {
            onResult(res.statusCode, output);
        });
    });

    req.on('error', function(err) {
        console.log('error: ' + err.message);
    });
    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end();
}

var updatePins = function(token) {
  //var FEED_URL = 'http://cmsapi.pulselive.com/rugby/event/1238/schedule?language=en&client=pulse';
  var API_URL_ROOT = 'timeline-api.getpebble.com';
  
  function timelineRequest(pin, type,token) {
    var options = {
      host: API_URL_ROOT,
      port: 443,
      path: '/v1/user/pins/' + pin.id,
      method: type,
      headers: {
          'Content-Type': 'application/json',
          'X-User-Token': '' + token
          }
    };
    
    jsonReq(options,function (stat,json) {
      console.log('timeline res: '+ json)
    },pin);   
  }
  
  function insertUserPins(pin,token) {
    timelineRequest(pin, 'PUT',token);
  }
  
  /**
  * Delete a pin from the timeline for this user.
  * @param pin The JSON pin to delete.
  * @param callback The callback to receive the responseText after the request has completed.
  */
  function deleteUserPins(pins,token) {
    timelineRequest(pins, 'DELETE',token);
  }
  
  var matchToPin = function (match) {
    var stat = { 'C': 'in-game', 'U': 'pre-game', 'L1':'in-game','L2':'in-game','LHT':'in-game'};
    var subt = { 'C': 'Finished', 'U': 'Unplayed', 'L1':'First Half','L2':'Second Half','LHT':'Half-Time'};
    var mtime = match.time.millis
    return {
      "id": match.matchId.toString(),
      "time": new Date(mtime).toISOString(),
      "layout": {
        "type": "sportsPin",
        "title": match.teams[0].name + "-" + match.teams[1].name,
        "subtitle": match.scores[0].toString() + "-" + match.scores[1].toString() + " " + subt[match.status],
        "body": match.description + ", " + match.eventPhase + " @ " + match.venue.name,
        "tinyIcon": "system://images/AMERICAN_FOOTBALL",
        "largeIcon": "system://images/AMERICAN_FOOTBALL",
        "lastUpdated": new Date().toISOString(),
        "nameAway": match.teams[0].abbreviation,
        "nameHome": match.teams[1].abbreviation,
        "scoreAway": match.scores[0].toString(),
        "scoreHome": match.scores[1].toString(),
        "sportsGameState": stat[match.status]
      },
      "updateNotification": {
          "time": new Date().toISOString(),
          "layout": {
            "type": "sportsPin",
            "title": match.teams[0].name + "-" + match.teams[1].name ,
            "subtitle": match.scores[0].toString() + "-" + match.scores[1].toString() + " " + subt[match.status],
            "body": match.description + ", " + match.eventPhase + " @ " + match.venue.name,
            "tinyIcon": "system://images/AMERICAN_FOOTBALL",
            "largeIcon": "system://images/AMERICAN_FOOTBALL",
            "lastUpdated": new Date().toISOString(),
            "nameAway": match.teams[0].abbreviation,
            "nameHome": match.teams[1].abbreviation,
            "scoreAway": match.scores[0].toString(),
            "scoreHome": match.scores[1].toString(),
            "sportsGameState": stat[match.status]
          }
        },
      "reminders": [
        {
          "time": new Date(mtime - (60000 * 15)).toISOString(),
          "layout": {
            "type": "genericReminder",
            "tinyIcon": "system://images/TIMELINE_CALENDAR",
            "title": match.teams[0].name + "-" + match.teams[1].name + " starts in 15 minutes"
          }
        },
        {
          "time": new Date(mtime - (60000 * 5)).toISOString(),
          "layout": {
            "type": "genericReminder",
            "tinyIcon": "system://images/TIMELINE_CALENDAR",
            "title": match.teams[0].name + "-" + match.teams[1].name + " starts in 5 minutes"
          }
        }
      ],
      "actions": [
        {
          "title": "View Schedule",
          "type": "openWatchApp",
          "launchCode": 15
        },
        {
          "title": "Show Directions",
          "type": "openWatchApp",
          "launchCode": 22
        }
      ]
    }
  };
  
  var recKeyGen = function(match) {
    return {
      id:  match.matchId.toString(),
      key: match.status + match.scores[0].toString() + '-' + match.scores[1].toString(),
    }
  }
  
  
  var parseScheduleToPins = function(msg,token,sendPin) {
    var now = new Date().getTime();
    for(var i = 0;i < msg.matches.length;i++) {
      var match = msg.matches[i];
      var mtime = match.time.millis;
      if ( Math.abs(now - mtime) < 259200000) { 
        // valid match found so check for it in repo
        var irecKey = recKeyGen(match)
        
        azure.getById(irecKey.id,match,irecKey,function (result,match,recKey) {
          if (result) {
            //result for match found in DB
            if(result != recKey.key){
              //entry found but data doesnt match so push through for updates
              sendPin(matchToPin(match),token)
              azure.updateEnity(recKey.id,recKey.key)
            } else { 
              console.log('no update requried for match ' + recKey.id + ':' + recKey.key)
            }
          } else {
            //no entry found for match so add key and pin
           azure.addEntity(recKey.id,recKey.key)
           sendPin(matchToPin(match),token)
          }
          
        });
      }
    }
  };

  var getMatches = function(token) {
    
    var options = {
          host: 'cmsapi.pulselive.com',
          path: '/rugby/event/1238/schedule?language=en&client=pulse',
          method: 'GET',
          headers: {
              'Content-Type': 'application/json'
          }
      };
    
    jsonReq(options,function (stat,jsonStr) {
        console.log('feed: '+ jsonStr);
        var json = JSON.parse(jsonStr);
        parseScheduleToPins(json,token,function (pin,token) {
            console.log('pin generated: ' + JSON.stringify(pin));
            insertUserPins(pin,token);
        });

        ;
    });
  }
    
  getMatches(token);

};


/* GET users listing. */
router.get('/:token', function(req, res, next) {
  var token = req.params.token
  updatePins(token)
  res.send('update run');
});

module.exports = router;
