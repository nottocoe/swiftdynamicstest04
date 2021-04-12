var express = require('express');
var router = express.Router();

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

/* Login POST Method */
router.post('/', function(req, res, next){
  var username = req.body.inputUsername;
  var password = req.body.inputPassword;
  
  /* DB Part */
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("mock_up_user");
    var query = { username: username, password: password };
    dbo.collection("data").find(query).toArray(function(err, result) {
      if (err) throw err;
      if(result.length === 0){
        res.redirect('/login');
        db.close();
      }
      else if(result.length > 0){
        res.cookie('username', username, {maxAge:360000});
        res.cookie('approver_position', result[0].approve_position);
        res.redirect('/');
        db.close();
      }
    });
  });

});

router.get('/approved', function(req, res, next){
  var approved_position = req.query.position;
  var worksheet = req.query.worksheet;
  // console.log(approved_position, worksheet);

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("worksheet");
    var myquery = { worksheet_name: worksheet };
    var newvalues = {$set: {[approved_position]: 1}};
    dbo.collection("sheets").updateOne(myquery, newvalues, function(err, res) {
      if (err) throw err;
      db.close();
    });
  });
  res.redirect('/sendnoti?worksheet=' + worksheet);
});

/* GET home page. */
router.get('/login', function(req, res, next) {
  res.render('index', { title: 'Login' });
});

/* Logout */
router.get('/logout', function(req, res, next) {
  res.clearCookie('username');
  res.clearCookie('approver_position');
  res.redirect('/login');
});

/* GET approve page */
router.get('/', function(req, res, next) {
  if(!req.cookies.username){
    res.redirect('/login');
  }
  else{
    /* DB Part */
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db("worksheet");
      dbo.collection("sheets").find({}).toArray(function(err, result) {
        if (err) throw err;
        res.render('approve', { title: 'Approve Page', worksheet: result, approve_pos: req.cookies.approver_position });
        db.close();
      });
    });
  }
});

router.get('/sendnoti', function(req, res, next){
  var worksheet = req.query.worksheet;

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("worksheet");
    var query = { worksheet_name: worksheet };
    dbo.collection("sheets").find(query).toArray(function(err, result) {
      if (err) throw err;
      if ( result[0].approver_no1 === 1 && result[0].approver_no2 === 1 && result[0].approver_no3 === 1 && result[0].noti_send === 0 ){
        var myquery = { worksheet_name: worksheet };
        var newvalues = { $set: { noti_send: 1 } };
        dbo.collection("sheets").updateOne(myquery, newvalues, function(err, res) {
          nodemail(worksheet);
        });
      }
      db.close();
    });
    res.redirect('/');
    }); 
});

function nodemail(worksheet){
  
  var nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: '<sender email>',
      pass: '<sender password>'
    }
  });
  
  var mailOptions = {
    from: '<sender email>',
    to: 'napat.s@swiftdynamics.co.th',
    subject: 'Approved Success Notification',
    html: '<b>' + worksheet + '</b>' + ' was approved by 3 approver. <br><br> <b>Best Regards</b>, <br>Trisattawat Mekchay<br>Prince of Songkla University, Hat yai Campus'
  };
  
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });

}
module.exports = router;