'use strict'

var mongoose = require('mongoose');
var app = require('./app');
var port = 3800;

//Conexión Database
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/social-mean',{ useNewUrlParser: true })
.then(() =>{
	console.log("La conexió a la base de datos social-mean se ha realizado correctamente")
	//Crear servidor
	app.listen(port, () => {
		console.log("Servidor corriendo en http://localhost:3800");
	})
})
.catch(err =>console.log(err));