var express = require('express');
var router = express.Router();
var weather = require("../services/weatherBySource");
/* GET home page. */
router.get('/', function(req, res) {
 return  res.render('index', { title: "Hello World!" });
});
router.get('/weather', function(req, res){    
  let city = req.query.city;
  let country = req.query.country;

  let sources = [
    {
      "source":"Not Found",
      "conditions":"N/A",
      "temp":"N/A"
    }
  ];
  weather.getWeather(city, country, function(err, result){
    if(err){
      console.log(err);
      return res.render('weather', { sources: sources });
    } else {
      return res.render('weather', { sources: result });
    }    
  });
});

module.exports = router;
