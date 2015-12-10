var express = require('express');
var router = express.Router();

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'schedule.cpfi2ocm03x0.us-west-2.rds.amazonaws.com',
  user     : 'joseph',
  password : 'joseph123',
  database : 'ufv'
});
connection.connect();

function jadeData(req){
    return {
        firstname:req.session.userData.firstname,
        lastname:req.session.userData.lastname,
        student:req.session.userData.studentNumber,
            username:req.session.userData.username
   }
}



router.use(function(req,res,next){
    if(req.session.loggedIn !== true)
        res.redirect('/');
    else
        next();
    return;
})

router.get('/',function(req,res){
    res.render('main/manage',jadeData(req));
})

module.exports = router;

