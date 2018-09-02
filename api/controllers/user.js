'use strict'
var bcrypt = require ('bcrypt-nodejs');
var mongoosePaginate = require('mongoose-pagination');
var fs = require('fs');

var User = require('../models/user');
var Follow = require('../models/follow');
var Publication = require('../models/publication');
var jwt = require('../services/jwt');
var path = require('path');

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

function loginUser(req, res){
	var params = req.body;

	var email = params.email;
	var password = params.password;

	User.findOne({email: email}, (err, user) =>{
		if(err) return res.status(500).send({message: 'Error en la petición'});
		if (user){
			bcrypt.compare(password, user.password, (err, check) => {
				if(check){
					//Devolver datos de usuario
					if (params.gettoken){
						//generar y Devolver Token
						return res.status(200).send({
							token: jwt.createToken(user)
						});
					}else{
						user.password = undefined;
						return res.status(200).send({user})
					}

					

				}else{
					return res.status(404).send({message: 'El usuario no se ha podido identificar'});
				}
			});
		}else{
			return res.status(404).send({message: 'El usuario no se ha podido identificar'});
		}
	});
}
// Conseguir Datos de un usuario
function getUser(req, res) {
	var userId = req.params.id;
	User.findById(userId, (err,user) => {
		if (err){
			return res.status(500).send({
				message: 'Error en la petición'
			});
		}
		if (!user){

			return res.status(404).send({message: 'El usuario no existe'});
		}

		followThisUser(req.user.sub, userId).then((value) =>{

			user.password = undefined;
			return res.status(200).send({
				user,
				following: value.following,
				followed: value.followed
			});

		});
		
			
		
		
	});
}

async function followThisUser(identity_user_id, user_id){
	var following = await Follow.findOne({'user':identity_user_id, 'followed':user_id}).exec((err,follow) => {
						if(err)return handleError(err);
						return follow;
					});
	var followed = await Follow.findOne({'user':user_id, 'followed':identity_user_id}).exec((err,follow) => {
						if(err)return handleError(err);
						return follow;
					});
	return {
		following: following,
		followed: followed
	}
}

// Devolver listado de users paginados

function getUsers(req, res){
	var identity_user_id = req.user.sub;
	var page = 1;
	if(req.params.page){
		page = req.params.page;
	}

	var itemsPerPage = 5;

	User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total) => {
		if(err) return res.status(500).send({message: 'Error en la petición'});

		if (!users) return res.status(404).send({message: 'No hay usuarios disponibles'});

		followUserIds(identity_user_id).then((value) =>{
				return res.status(200).send({
				users,
				users_following: value.following,
				users_follow_me: value.followed,
				total,
				pages: Math.ceil(total/itemsPerPage)
			});
		});
		


	});
}
//******
async function followUserIds(user_id){
	var following = await Follow.find({"user": user_id}).select({'_id':0,'__v':0, 'user':0}).exec((err,follows) =>{
		return follows;
	});

	var followed = await Follow.find({"followed": user_id}).select({'_id':0,'__v':0, 'followed':0}).exec((err,follows) =>{
		return follows;
	});

	//Procesar following ids
	var following_clean = [];

	following.forEach((follow) =>{
		following_clean.push(follow.followed);
	});

	//Procesar followed ids
	var followed_clean = [];

	followed.forEach((follow) =>{
		followed_clean.push(follow.followed);
	});

	return{
		following: following_clean,
		followed: followed_clean
	}

}

function getCounters(req,res){
	var userId = req.user.sub;

	if(req.params.id){
		userId = req.params.id;
	}

	getCountFollow(userId).then((value)=>{
			return res.status(200).send(value);
		});
}

async function getCountFollow(user_id){
	var following = await Follow.count({'user': user_id}).exec((err,count) =>{
		if (err) return handleError(err);
		return count;
	});

	var followed = await Follow.count({'followed':user_id}).exec((err,count) =>{
		if (err) return handleError(err);
		return count;
	});

	var publications = await Publication.count({"user":user_id}).exec((err,count)=>{
		if (err) return handleError(err);
		return count;
	});
	return{
		following: following,
		followed: followed,
		publications: publications
	}
}
//*******

function updateUser(req, res) {
	var userId = req.params.id;

	var update = req.body;

	// borrar propiedad password
	delete update.password;

	if(userId != req.user.sub){

		return res.status(500).send({message: 'No tienes permiso para actualizar los datos del usuario'});
	}

	User.findByIdAndUpdate(userId, update, {new:true}, (err, userUpdated) => {
		if(err) return res.status(500).send({message: 'Error en la petición'});

		if(!userUpdated) return res.status(404).send({message: 'No se ha podido actualizar el usuario'});

		return res.status(200).send({user: userUpdated});
	});

}
//Subir archivos de imagen/avatar de usuario
function uploadImage(req, res) {
	var userId = req.params.id;

	

	if(req.files){
		var file_path = req.files.image.path;
		console.log(file_path);

		var file_split = file_path.split('\\');
		console.log(file_split);

		var file_name = file_split[2];
		console.log(file_name);

		var ext_split = file_name.split('\.');
		console.log(ext_split);

		var file_ext = ext_split[1];
		console.log(file_ext);

		if(userId != req.user.sub){
			return removeFilesOfUploads(res, file_path, 'No tienes permiso para actualizar los datos del usuario');

		}


		if(file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif'){
			//Actualizar documento de usuario logueado
			User.findByIdAndUpdate(userId, {image: file_name}, {new:true}, (err, userUpdated) =>{
				if(err) return res.status(500).send({message: 'Error en la petición'});

				if(!userUpdated) return res.status(404).send({message: 'No se ha podido actualizar el usuario'});

				return res.status(200).send({user: userUpdated});
			});
		}else{
			return removeFilesOfUploads(res,file_path, 'Extensión no válida');
		}

	}else{
		return res.status(200).send({message:'No se ha enviado archivo'});
	}
}

function removeFilesOfUploads(res,file_path, message){
	fs.unlink(file_path, (err) =>{
		return res.status(200).send({message: message});
	});
}

function getImageFile(req,res) {
	var image_file = req.params.imageFile;

	var path_file = './uploads/users/'+image_file;

	fs.exists(path_file, (exists) => {
		if(exists){
			res.sendFile(path.resolve(path_file));
		}else{
			res.status(200).send({message:'No existe la imagen...'});
		}
	});
}

module.exports = {
	home,
	pruebas,
	saveUser,
	loginUser,
	getUser,
	getUsers,
	getCounters,
	updateUser,
	uploadImage,
	getImageFile
}