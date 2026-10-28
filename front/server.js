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

// --- RUTAS DEL PANEL DE ADMINISTRACIÓN (Tus vistas) ---
app.get('/admin/productos', (req, res) => {
    res.render('admin/productos');
});

app.get('/admin/productos/nuevo', (req, res) => {
    res.render('admin/nuevo');
});

app.get('/admin/productos/editar/:id', (req, res) => {
    
    res.render('admin/editar');
});
// -----------------------------------------------------
// Ruta POST para recibir la creación de un nuevo producto
app.post('/admin/productos', (req, res) => {
    // Por ahora redirige de vuelta a la lista para que no tire error
    res.redirect('/admin/productos');
});

// Ruta POST para recibir la edición de un producto
app.post('/admin/productos/editar/:id', (req, res) => {
    res.redirect('/admin/productos');
});

//.....................................................................

app.listen(3000, () => { console.log("holas - Servidor corriendo en http://localhost:3000");
});