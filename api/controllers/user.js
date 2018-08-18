'use strict'

var User = require('../models/user');


function home (req,res){
	res.status(200).send({
		message: 'Hola a todoos'
	});
} 


function pruebas (req,res) => {
	console.log(req.body);
	res.status(200).send({
		message: 'Acción de pruebas en el servidor de MongoDB'
	});
} 

module.exports = {
	home,
	pruebas
}