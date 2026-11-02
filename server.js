const express = require('express');

const app = express();

app.set('view engine', 'ejs');

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render("index");
});

productos = [
{   id : 1,
    nombre: "Refrescos",
    descripcion: "Bebida",
    precio: 3000,
    stock: 100,
    imagen: "/img/Bebida.png"
},
{   
    id: 2,
    nombre: "Galletas",
    descripcion: "Alimentos",
    precio: 2000,
    stock: 10,
    imagen: "/img/galletas.png"
},
{
    id: 3,
    nombre: "Te",
    descripcion: "Infusiones",
    precio: 1000,
    stock: 100,
    imagen: "/img/te.png"    
},
{
    id: 4,
    nombre: "Shampoo",
    descripcion: "Higiene",
    precio: 2500,
    stock: 100,
    imagen: "/img/shampoo.png"    
},
{   
    id: 5,
    nombre: "Papas fritas",
    descripcion: "Snacks",
    precio: 1800,
    stock: 100,
    imagen: "/img/papas.png"
}
];
app.get("/productos", (req,res) =>{
    res.render("productos" , { productos })
});

app.get("/verDetalles/:id", (req, res) => {
    const id = Number(req.params.id);
    const producto = productos.find(producto => producto.id === id);
        res.render('verDetalles', { producto });
});
app.get('/admin/productos' , (req , res) => {
    res.render('admin/productos');
});
app.get('/admin/productos/nuevo' , (req, res) => {
    res.render('admin/nuevo');
});
app.get('/admin/producto/editar/:id' , (req, res) => {
    res.render('admin/editar')
});

// Ruta POST para recibir la creación de un nuevo productos
app.post('/admin/productos', (req, res) => {
    // Por ahora redirige de vuelta a la lista para que no tire error
    res.redirect('/admin/productos');
});

// Ruta POST para recibir la edición de un producto
app.post('/admin/productos/editar/:id', (req, res) => {
    res.redirect('/admin/productos');
});

app.listen(3000, () => { console.log("holas");
});
