var express = require('express');
var router = express.Router();
var weather = require("../services/weatherBySource");
/* GET home page. */
router.get('/', function(req, res) {
 return  res.render('index', { title: "Weather" });
});
router.get('/weather', function(req, res){    
  let city = req.query.city;
  let country = req.query.country;

  if(city == "" || country == ""){ 
    let error = {
      status: '204',
      stack:"Please go back and enter valid city and country names"
    };
    let message = "Missing values";
    return res.render('error', {message:message, error:error});
  }
  let sources = [
    {
      "source":"Not Found",
      "conditions":"N/A",
      "temp":"N/A"
    }
  ];
  weather.getWeather(city, country, function(err, result){
    let displayCity = city + "," + country;
    if(err){
      console.log(err);
      return res.render('weather', { sources: sources });
    } else {
      return res.render('weather', { sources: result, city: displayCity });
    }    
  });
});

module.exports = router;
