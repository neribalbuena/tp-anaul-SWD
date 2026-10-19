const express = require('express');

const app = express();

app.set('view engine', 'ejs');

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render("index");
});

app.get('/productos', (req, res) => {
 productos = [
{
    nombre: "Refrescos",
    descripcion: "Bebida",
    precio: 3000,
    stock: 100,
    imagen: "/img/Bebida.png"
},
{
    nombre: "Galletas",
    descripcion: "Alimentos",
    precio: 2000,
    stock: 10,
    imagen: "/img/galletas.png"
},
{
    nombre: "Te",
    descripcion: "Infusiones",
    precio: 1000,
    stock: 100,
    imagen: "/img/te.png"    
},
{
    nombre: "Shampoo",
    descripcion: "Higiene",
    precio:2200,
    stock: 100,
    imagen: "/img/shampoo.png"    
},
{
    nombre: "Papas fritas",
    descripcion: "Snacks",
    precio:1200,
    stock: 100,
    imagen: "/img/papas.png"
}
]
res.render("productos", { productos })
});

app.listen(3000, () => { console.log("holas");
});