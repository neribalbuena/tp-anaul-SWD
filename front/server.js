require('dotenv').config();

const { timingSafeEqual } = require('crypto');
const path = require('path');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const requiredEnvironment = [
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);

if (missingEnvironment.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missingEnvironment.join(', ')}`);
}

const app = express();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);
const imageBucket = 'prod-img';
const signedUrlLifetimeSeconds = 60 * 60;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));

function getStorageObjectPath(imageUrl) {
    if (!imageUrl) {
        return null;
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(imageUrl);
    } catch {
        throw new Error('La URL de imagen del producto no es válida.');
    }

    const previewPath = parsedUrl.searchParams.get('preview');
    const objectPathMatch = parsedUrl.pathname.match(
        /\/storage\/v1\/object\/(?:public|sign|authenticated)\/prod-img\/(.+)$/
    );
    const imagePath = previewPath || (objectPathMatch && objectPathMatch[1]);

    if (!imagePath) {
        throw new Error('La URL de imagen no referencia un objeto del bucket prod-img.');
    }

    let decodedPath;
    try {
        decodedPath = decodeURIComponent(imagePath).replace(/^\/+/, '');
    } catch {
        throw new Error('La ruta de imagen del producto no es válida.');
    }

    if (!decodedPath || decodedPath.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
        throw new Error('La ruta de imagen del producto no es válida.');
    }

    return decodedPath;
}

async function getSignedImageUrl(imageUrl) {
    const objectPath = getStorageObjectPath(imageUrl);
    if (!objectPath) {
        return null;
    }

    const { data, error } = await supabase.storage
        .from(imageBucket)
        .createSignedUrl(objectPath, signedUrlLifetimeSeconds);

    if (error) {
        throw new Error(`No se pudo firmar la imagen ${objectPath}: ${error.message}`);
    }

    return data.signedUrl;
}

function getAdminPasswordError(req) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        return 'El alta y la administración están deshabilitadas. Configura ADMIN_PASSWORD en el archivo .env.';
    }

    const body = req.body || {};
    const submittedPassword = typeof body.admin_password === 'string'
        ? Buffer.from(body.admin_password, 'utf8')
        : Buffer.alloc(0);
    const configuredPassword = Buffer.from(adminPassword, 'utf8');
    if (
        submittedPassword.length !== configuredPassword.length
        || !timingSafeEqual(submittedPassword, configuredPassword)
    ) {
        return 'Contraseña de administrador incorrecta.';
    }

    return null;
}

function getProductFormData(body) {
    const formBody = body || {};
    return {
        nombre: typeof formBody.nombre === 'string' ? formBody.nombre.trim() : '',
        descripcion: typeof formBody.descripcion === 'string' ? formBody.descripcion.trim() : '',
        precio: typeof formBody.precio === 'string' ? formBody.precio.trim() : '',
        stock: typeof formBody.stock === 'string' ? formBody.stock.trim() : '',
        imagen_url: typeof formBody.imagen_url === 'string' ? formBody.imagen_url.trim() : ''
    };
}

function validateProductForm(formData) {
    const precio = Number(formData.precio);
    const stock = Number(formData.stock);
    let error = null;

    if (!formData.nombre || !formData.descripcion) {
        error = 'El nombre y la descripción son obligatorios.';
    } else if (!formData.precio || !Number.isFinite(precio) || precio < 0) {
        error = 'Ingresa un precio válido, igual o mayor que cero.';
    } else if (!formData.stock || !Number.isInteger(stock) || stock < 0) {
        error = 'Ingresa un stock entero, igual o mayor que cero.';
    } else if (formData.imagen_url) {
        try {
            getStorageObjectPath(formData.imagen_url);
        } catch (validationError) {
            error = validationError.message;
        }
    }

    return {
        error,
        values: {
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            precio,
            stock,
            imagen_url: formData.imagen_url || null
        }
    };
}

function getProductId(value) {
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
        return null;
    }

    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
}

async function getProductById(id) {
    const { rows } = await pool.query(
        'SELECT id, nombre, descripcion, precio, stock, imagen_url FROM public.productos WHERE id = $1',
        [id]
    );
    if (rows.length === 0) {
        return null;
    }

    const producto = rows[0];
    return {
        ...producto,
        precio: Number(producto.precio),
        imagen: await getSignedImageUrl(producto.imagen_url)
    };
}

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/productos', async (req, res, next) => {
    try {
        const productos = await getProducts();
        res.render('productos', { productos });
    } catch (error) {
        next(error);
    }
});

app.get('/admin/productos', async (req, res, next) => {
    try {
        res.render('admin/productos', {
            productos: await getProducts(),
            success: req.query.estado || null
        });
    } catch (error) {
        next(error);
    }
});

app.get('/admin/productos/nuevo', (req, res) => {
    res.render('admin/nuevo', { error: null, formData: {} });
});

app.post('/admin/productos', async (req, res, next) => {
    const passwordError = getAdminPasswordError(req);
    const formData = getProductFormData(req.body);
    if (passwordError) {
        return res.status(process.env.ADMIN_PASSWORD ? 401 : 503).render('admin/nuevo', {
            error: passwordError,
            formData
        });
    }

    const validation = validateProductForm(formData);
    if (validation.error) {
        return res.status(400).render('admin/nuevo', {
            error: validation.error,
            formData
        });
    }

    try {
        await pool.query(
            `INSERT INTO public.productos (nombre, descripcion, precio, stock, imagen_url)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                validation.values.nombre,
                validation.values.descripcion,
                validation.values.precio,
                validation.values.stock,
                validation.values.imagen_url
            ]
        );
        res.redirect('/admin/productos?estado=creado');
    } catch (error) {
        next(error);
    }
});

app.get('/admin/productos/editar/:id', async (req, res, next) => {
    const id = getProductId(req.params.id);
    if (!id) {
        return res.status(404).send('Producto no encontrado.');
    }

    try {
        const producto = await getProductById(id);
        if (!producto) {
            return res.status(404).send('Producto no encontrado.');
        }
        res.render('admin/editar', { error: null, producto });
    } catch (error) {
        next(error);
    }
});

app.post('/admin/productos/editar/:id', async (req, res, next) => {
    const passwordError = getAdminPasswordError(req);
    if (passwordError) {
        return res.status(process.env.ADMIN_PASSWORD ? 401 : 503).send(passwordError);
    }

    const id = getProductId(req.params.id);
    if (!id) {
        return res.status(404).send('Producto no encontrado.');
    }

    const formData = getProductFormData(req.body);
    const validation = validateProductForm(formData);
    try {
        const producto = await getProductById(id);
        if (!producto) {
            return res.status(404).send('Producto no encontrado.');
        }
        if (validation.error) {
            return res.status(400).render('admin/editar', {
                error: validation.error,
                producto: { ...producto, ...formData }
            });
        }

        const { rowCount } = await pool.query(
            `UPDATE public.productos
             SET nombre = $1, descripcion = $2, precio = $3, stock = $4, imagen_url = $5
             WHERE id = $6`,
            [
                validation.values.nombre,
                validation.values.descripcion,
                validation.values.precio,
                validation.values.stock,
                validation.values.imagen_url,
                id
            ]
        );
        if (rowCount === 0) {
            return res.status(404).send('Producto no encontrado.');
        }
        res.redirect('/admin/productos?estado=actualizado');
    } catch (error) {
        next(error);
    }
});

app.post('/admin/productos/eliminar/:id', async (req, res, next) => {
    const passwordError = getAdminPasswordError(req);
    if (passwordError) {
        return res.status(process.env.ADMIN_PASSWORD ? 401 : 503).send(passwordError);
    }

    const id = getProductId(req.params.id);
    if (!id) {
        return res.status(404).send('Producto no encontrado.');
    }

    try {
        const { rowCount } = await pool.query(
            'DELETE FROM public.productos WHERE id = $1',
            [id]
        );
        if (rowCount === 0) {
            return res.status(404).send('Producto no encontrado.');
        }
        res.redirect('/admin/productos?estado=eliminado');
    } catch (error) {
        next(error);
    }
});

async function getProducts() {
    const { rows } = await pool.query(
        'SELECT id, nombre, descripcion, precio, stock, imagen_url FROM public.productos ORDER BY id'
    );
    return Promise.all(rows.map(async (producto) => ({
        ...producto,
        precio: Number(producto.precio),
        imagen: await getSignedImageUrl(producto.imagen_url)
    })));
}

app.use((error, req, res, next) => {
    console.error(`Error al cargar la solicitud: ${error.message}`);
    if (res.headersSent) {
        return next(error);
    }

    res.status(500).send('No se pudo cargar el catálogo. Revisa la configuración del servidor.');
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log(`Servidor disponible en http://localhost:${port}`);
});
