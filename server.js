const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Conexión a la base de datos SQLite local
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error("Error al abrir la BD", err.message);
  else console.log("Conectado a la base de datos SQLite local.");
});

// Crear la tabla productos si no existe
db.run(`CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  precio REAL NOT NULL,
  stock INTEGER NOT NULL,
  imagen TEXT
)`);

// 1. Página principal
app.get('/', (req, res) => {
    res.render("index");
});

// 2. Catálogo (Consulta a SQLite)
app.get("/productos", (req, res) => {
    db.all("SELECT * FROM productos", [], (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error al leer la base de datos");
        } else {
            res.render("productos", { productos: rows });
        }
    });
});

// 3. Ver detalles
app.get("/verDetalles/:id", (req, res) => {
    const id = Number(req.params.id);
    db.get("SELECT * FROM productos WHERE id = ?", [id], (err, row) => {
        if (err || !row) {
            res.status(404).send("Producto no encontrado");
        } else {
            res.render('verDetalles', { producto: row });
        }
    });
});

// 4. Panel de Administración - Listar productos
app.get('/admin/productos', (req, res) => {
    db.all("SELECT * FROM productos", [], (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error en el panel admin");
        } else {
            res.render('admin/productos', { productos: rows });
        }
    });
});

// Formulario para nuevo producto
app.get('/admin/productos/nuevo', (req, res) => {
    res.render('admin/nuevo');
});

// Formulario para editar producto (Carga los datos actuales)
app.get('/admin/productos/editar/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM productos WHERE id = ?", [id], (err, row) => {
        if (err || !row) {
            res.status(404).send("Producto no encontrado");
        } else {
            res.render('admin/editar', { producto: row });
        }
    });
});

// CREATE: Guardar nuevo producto desde el formulario
app.post('/admin/productos', (req, res) => {
    const { nombre, categoria, precio, stock, imagen } = req.body;
    const query = `INSERT INTO productos (nombre, categoria, precio, stock, imagen) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(query, [nombre, categoria, precio, stock, imagen], (err) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error al guardar el producto");
        } else {
            res.redirect('/admin/productos');
        }
    });
});

// UPDATE: Guardar cambios de la edición
app.post('/admin/productos/editar/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, categoria, precio, stock, imagen } = req.body;
    const query = `UPDATE productos SET nombre = ?, categoria = ?, precio = ?, stock = ?, imagen = ? WHERE id = ?`;

    db.run(query, [nombre, categoria, precio, stock, imagen, id], (err) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error al actualizar el producto");
        } else {
            res.redirect('/admin/productos');
        }
    });
});

// DELETE: Eliminar producto
app.post('/admin/productos/eliminar/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM productos WHERE id = ?", [id], (err) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error al eliminar");
        } else {
            res.redirect('/admin/productos');
        }
    });
});

app.listen(3000, () => { 
    console.log("Servidor corriendo en http://localhost:3000"); 
});
