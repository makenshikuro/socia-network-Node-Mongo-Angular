'use strict'

var express = require('express');
var bodyParser = require('body-parser');

var app = express();

// cargar rutas


// middlewares
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());


//Cors

//rutas
app.get('/', (req,res) => {
	res.status(200).send({
		message: 'Hola a todoos'
	})
} );


app.post('/pruebas', (req,res) => {
	console.log(req.body);
	res.status(200).send({
		message: 'Acción de pruebas en el servidor de MongoDB'
	})
} );

//exportar
module.exports = app;