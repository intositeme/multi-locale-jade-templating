var express = require('express');
var app = require('express')();
var http = require('http').Server(app);

app.use(express.static('build'));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/build/index.html');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
