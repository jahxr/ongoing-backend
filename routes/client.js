const express = require('express')
const bp      = require('body-parser')
const cookieP = require("cookie-parser")
const app     = express()
const cors       = require('cors')
const clientsSchema = require('../models/clients')
const ordersSchema  = require('../models/orders')
const categorieschema = require('../models/categories')
const storeschema     = require('../models/stores')
const queries = require('../modules/queries')


app.use(
    cors({
      credentials: true,
      origin: true,
    }),
);

app.use(bp.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieP())

app.post('/signin', async (req, res) => {
    try {
        if(!req.body.username || !req.body.email || !req.body.password){
            res.status(400).send('fill all the fields')
            return;
        }
    } catch (error) {
        res.status(400).send('Bad Request')
    }
    
    let user = await clientsSchema.find({"email": req.body.email});
    if (user.length > 0) {
        res.status(400).send('user already exists ')
        return
    }

    const data = {
        email: req.body.email,
        phone: req.body.phone,
        username: req.body.username,
        password: req.body.password
    }

    queries.Create(clientsSchema, data)
        .then(result => {
            res.setHeader('Set-Cookie', 'id='+result._id);
            res.send(result)
        })
        .catch(err => {res.status(500).send(err)})
})

app.post('/login', async (req, res) => {
    try {
        if(!req.body.email || !req.body.password){
            res.status(400).send('fill all the fields')
            return;
        }
    } catch (error) {
        res.status(400).send('Bad Request')
    }

    let user = await clientsSchema.find({"email": req.body.email});
    if (user.length == 0) {
        res.status(400).send('user not exists ')
        return
    }

    if (user[0].password == req.body.password) {
        res.setHeader('Set-Cookie', 'id='+user[0]._id);
        res.send(user[0]);
    }else{
        res.status(400).send("error credential")
    }

});

//todas las categorias
app.get('/categories', (req, res) => {
    categorieschema.find({})
    .then(result => res.send(result))
    .catch(err => res.status(500).send(err))
})

// mandar todas las tiendas
app.get('/allStores', (req, res) => {
    storeschema.find({})
        .then(result => res.send(result))
        .catch(err => res.status(500).send(err))
})

//todas las tiendas de una categoria
app.get('/stores/:idCategory', async (req, res) => {
    try {req.params.idCategory} catch (error) {
        res.status(400).send('Bad Request')
    }
    const stores = await storeschema
                    .find({"idCategoria": req.params.idCategory})
    res.send(stores)
});

//una tienda en especifico
app.get('/store/:idStore', (req, res) => {
    try {req.params.idStore} catch (error) {
        res.status(400).send('Bad Request')
    }
    queries.Read(storeschema, {"_id": req.params.idStore})
        .then(result => res.send(result))
        .catch(err => res.status(500).send(err))
});

// agregar producto a una tienda
app.put("/store/:idTienda", async (req, res) => {
    const tiendaId = req.params.idTienda;

    let u = {
        name: req.body.name,
        imagen: req.body.imagen,
        precio: req.body.precio,
        descripcion: req.body.descripcion,
    }
    
    storeschema.updateOne({_id: tiendaId}, {$push: {productos: u}}).then(result=>{
        res.send(result);
        res.end()
    }).catch(error=>{
        res.send(error);
        res.end()
    })

});

//todas las ordenes del usuario
app.get('/orders/:id', async (req, res) => {
    try {
        if(!req.params.id){throw new Error("oops")}
    }  catch (error) {
        res.status(403).send('Unauthenticated User')
        return
    }
    const orders = await ordersSchema.find({"client.id": req.params.id});
    res.status(200).send(orders)
});

//una orden en especifico
app.get('/order/:idOrder', async (req, res) => {
    try {if(!req.params.idOrder){throw new Error("oops")}
    }  catch (error) {
        res.status(400).send('Bad Request')
        return;
    }
    const orders = await ordersSchema.find({"id": req.params.idOrder});
    res.send(orders[0])
});

// Mandar todas las ordenes
app.get('/order', async (req, res) => {
    const orders = await ordersSchema.find();
    res.send(orders)
});

// Mandar todas las ordenes que estan en camino
app.get('/order/pending', async (req, res) => {
    const orders = await ordersSchema.find({status: "Pending"});
    res.send(orders)
});

// para cambiar el estatus de la orden
// cuando un repartidor acepta la orden
app.put('/order/:_id', function(req, res){

    const {status} = req.body;

    let u = {
        id: req.body.id,
        name: req.body.name,
        email: req.body.email,
        tel: req.body.tel
    }
    
    ordersSchema.updateOne({_id: req.params._id}, {$set: {status: status, dealer: u}}).then(result=>{
        res.send(result);
        res.end()
    }).catch(error=>{
        res.send('error');
        res.end()
    })
})


app.post('/CreateOrder', async (req, res) => {
    try {
        if(!req.body.idClient){
            throw new Error("oops");
        }
    }  catch (error) {
        res.status(403).send('Unauthenticated User')
        return;
    }
    const user = await clientsSchema.find({"_id": req.body.idClient});
    const ID = require("nodejs-unique-numeric-id-generator")
    const data = {
        id: ID.generate(new Date().toJSON()),
        status:  'Received',
        service: req.body.service,
        total: req.body.total,
        date: req.body.date,
        payment: req.body.payment,
        client:    {
            id: await user[0]._id,
            name: await user[0].username,
            email: await user[0].email
        },
        dealer:     {
            id: null,
            name: null,
            email: null,
            tel: null
        },
        products:  req.body.products,
        locations: req.body.location
    }
    queries.Create(ordersSchema, data)
        .then(result => {res.send(result)})
        .catch(err => {res.status(500).send(err)})
});

module.exports = app
