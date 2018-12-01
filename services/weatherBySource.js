const api = require("./env");
const request = require('request');
const async = require("async");

module.exports = {
    getWeather: function(city, country, cb){
        let tasks = [
            module.exports.accuWeather.bind(null, city, country),
            module.exports.yahoo.bind(null,city, country),
            module.exports.openWeather.bind(null,city, country)
          ];
        async.parallel(async.reflectAll(tasks), function(err,result){ //used reflectAll so that if one fails, the rest keep returning
            let defaultConditions = {
                "source":"",
                "temp":"N/A",
                "conditions":"N/A"
            };
            let weatherConditions = [];
            for(let i = 0; i < result.length; i++){
                if(result[i].error){
                    defaultConditions.source = result[i].error["source"];
                    weatherConditions.push(defaultConditions);
                } else{
                    weatherConditions.push(result[i].value);
                }
            }
            cb(null, weatherConditions);
          });
        
    },
    accuWeather: function(city, country, callback){
        async.waterfall([
            function(callback) {
                let queryParams = city + " " + country;
                request.get(api["accuweather"].metadataLink + api["accuweather"].apiKey + "&q=" + queryParams, (err, response, body)=>{
                    if(err){
                        callback(err);
                    } else if(JSON.parse(body)["Code"] && JSON.parse(body)["Code"] == "ServiceUnavailable"){
                        var error = {
                            "source":"accuweather",
                            "message":"ServiceUnavailable"
                        }
                        callback(error);
                    } 
                    else {
                        let temp = JSON.parse(body)[0];  //gets the id of the city requested
                        callback(null, temp["Key"]);
                    }
                });
            },
            function(locatiionId, callback) {
                request.get(api["accuweather"]["api"]+locatiionId+"?apikey="+api["accuweather"].apiKey, (err, response, body)=>{
                    if(err){
                        callback(err);
                    } else {
                        let parsedData = JSON.parse(body)[0];
                        let relevantInfo = {
                            "source":"accuweather",
                            "temp":parsedData["Temperature"]["Metric"]["Value"] + "C",
                            "conditions":parsedData["WeatherText"]
                        };
                        callback(null, relevantInfo);
                    }
                });
                
            }
        ], function (err, result) {
            if(err){ 
                callback(err);
            } else {
                 callback(null,result);
            }
        });
    },
    //@yahoo
    yahoo: function(city, country, callback){
        let link = api["yahoo"]["api"].replace("CITY", city + ","+country);

        request.get(link, apiResponse);
        function apiResponse(err, response, body){
            if(err){
                callback(err);
            } else {
                let parsedData = JSON.parse(body)["query"]["results"]["channel"]["item"]["condition"];
                let relevantInfo = {
                    "source":"yahoo",
                    "temp": parsedData["temp"] + "F",
                    "conditions":parsedData["text"]
                };
                callback(null, relevantInfo);
            }
        }
        function convertToC(fTemp){

        }
    },
    //@openWeather
    openWeather: function(city, country, callback){  
        let link = (api["openweather"].api + api["openweather"].apiKey).replace("CITY", city+","+convertToCountryCode(country));
        request.get(link, (err, response, body)=>{
            if(err){
                callback(err);
            } else {
                var parsedData = JSON.parse(body);
                console.log("Open Weather Parsed Data: " + JSON.stringify(parsedData["weather"]));
                var relevantInfo = {
                    "source":"openweather",
                    "temp": parsedData["main"]["temp"] + "C",
                    "conditions":parsedData["weather"][0]["description"]
                };
                callback(null, relevantInfo);
            }
        });
        function convertToCountryCode(name){
            return name.substr(0, 2)
        }
    }
}