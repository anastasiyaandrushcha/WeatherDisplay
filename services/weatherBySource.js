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
            let weatherConditions = [];
            for(let i = 0; i < result.length; i++){
                if(result[i].error){
                    let defaultConditions = {};
                    defaultConditions.source = result[i].error["source"];
                    defaultConditions.conditions = result[i].error["message"]
                    defaultConditions.temp = "";
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
                request.get(api["accuweather"].metadataLink + api["accuweather"].apiKey + "&q=" + queryParams, apiResponse);
                function apiResponse(err, response, body){
                    let parsedBody = JSON.parse(body);
                    if(err){
                        var error = {
                            "source":"accuweather",
                            "message":err.message
                        }
                        callback(error);
                    } else if(parsedBody["Code"]){
                        var error = {
                            "source":"accuweather",
                            "message":parsedBody["Code"]
                        }
                        callback(error);
                    } else if(parsedBody.length < 1 || !parsedBody[0]["Key"]){
                        var error = {
                            "source":"accuweather",
                            "message":"No city found in accuweather"
                        }
                        callback(error);
                    } 
                    else {
                        callback(null, parsedBody[0]["Key"]);
                    }
                }
            },
            function(locationId, callback) {
                request.get(api["accuweather"]["api"]+locationId+"?apikey="+api["accuweather"].apiKey, apiResponse);
                function apiResponse(err, response, body){
                    var parsedBody = JSON.parse(body);
                    if(err){
                        var error = {
                            "source":"accuweather",
                            "message":err.message
                        }
                        callback(error);
                    } else if(parsedBody.length < 1 || !parsedBody[0]["Temperature"] || !parsedBody[0]["WeatherText"]){
                        var error = {
                            "source":"accuweather",
                            "message":"ServiceUnavailable"
                        }
                        callback(error);
                    } 
                    else {
                        let parsedData = JSON.parse(body)[0];
                        let relevantInfo = {
                            "source":"accuweather",
                            "temp":parsedData["Temperature"]["Metric"]["Value"] + "C",
                            "conditions":parsedData["WeatherText"]
                        };
                        callback(null, relevantInfo);
                    }
                }
            }//
        ], function (err, result) {
            if(err){ 
                callback(err);
            } else {
                 callback(null,result);
            }
        });
    },
    //@yahoo
    //https://developer.yahoo.com/weather/#js
    yahoo: function(city, country, callback){
        let link = api["yahoo"]["api"].replace("CITY", city + ","+country);
        
        request.get(link, apiResponse);
        function apiResponse(err, response, body){
            let parsedBody = JSON.parse(body);
            if(err){
                var error = {
                    "source":"yahoo",
                    "message":err.message
                }
                callback(error);
            } else if(parsedBody.length < 1 || !parsedBody["query"] || !parsedBody["query"]["results"] || !parsedBody["query"]["results"]["channel"]
            || !parsedBody["query"]["results"]["channel"]["item"]) {
                var error = {
                    "source":"yahoo",
                    "message":"Service Unavailable"
                }
                callback(error);
            } else {
                let parsedData = parsedBody["query"]["results"]["channel"]["item"]["condition"];
                let relevantInfo = {
                    "source":"yahoo",
                    "temp": convertToC(parsedData["temp"]) + "C",
                    "conditions":parsedData["text"]
                };
                callback(null, relevantInfo);
            }
        }
        function convertToC(fTemp){
           var cTemp = Math.round((parseInt(fTemp) - 32) * parseFloat(5/9)*100)/100;
           return cTemp;
        }
    },
    //@openWeather
    openWeather: function(city, country, callback){  
        let link = (api["openweather"].api + api["openweather"].apiKey).replace("CITY", city+","+convertToCountryCode(country));
        request.get(link, apiResponse);
        function apiResponse(err, response, body){
            if(err){
                callback(err);
            } else if(JSON.parse(body)["cod"] && JSON.parse(body)["cod"] == 404){
                var error = {
                    "source":"Openweather",
                    "message":"No such city exists in Open Weather"
                }
                callback(error);
            } else {
                var parsedData = JSON.parse(body);
                var relevantInfo = {
                    "source":"Open Weather",
                    "temp": parsedData["main"]["temp"] + "C",
                    "conditions":parsedData["weather"][0]["description"]
                };
                callback(null, relevantInfo);
            }
        }
        function convertToCountryCode(name){
            return name.substr(0, 2)
        }
    }
}