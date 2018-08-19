'use strict'
var bcrypt = require ('bcrypt-nodejs');

var User = require('../models/user');


function home (req,res){
	res.status(200).send({
		message: 'Hola a todoos'
	});
} 


function pruebas (req,res){
	console.log(req.body);
	res.status(200).send({
		message: 'Acción de pruebas en el servidor de MongoDB'
	});
} 

function saveUser(req, res){
	var user = new User();
	var params = req.body;

	if(params.name && params.surname && 
		params.nick && params.email && params.password){
		user.name = params.name;
		user.surname = params.surname;
		user.nick = params.nick;
		user.email = params.email;
		user.role = 'ROLE_USER';
		user.image = null;

		// Controlar usuarios duplicados
		User.find({ $or: [
			{email: user.email.toLowerCase()},
			{nick: user.nick.toLowerCase()}
			]}).exec((err, users)=>{
				if(err){ 
					return res.status(500).send({message: 'Error en la petición de usuarios'}
						)}
				if (users && users.length >= 1){
					return res.status(200).send({message: 'El usuario que intentas resgistrar ya existe !!'});
				}else{
					// Cifrado de Password y Guardado de datos
					bcrypt.hash(params.password, null, null, (err, hash) => {
						user.password = hash;
						user.save((err, userStored) =>{
							if(err) return res.status(500).send({message: 'Error al guardar el usuario'});

							if (userStored){
								res.status(200).send({user: userStored});
							}else{
								res.status(404).send({message: 'No se ha registrado el usuario'});
							}
						});
					});

				}
			})

	}else{
		res.status(200).send({
			message: 'Envia todos los campos necesarios!!'
		});
	}
}

module.exports = {
	home,
	pruebas,
	saveUser
}