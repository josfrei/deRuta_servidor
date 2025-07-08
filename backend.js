import express from "express";
import http from "http";
import { Server } from "socket.io";
import fetch from "node-fetch";
import dotenv from 'dotenv';
import cors from 'cors';
// Base de datos y Firebase
import mysql from "mysql2";
import admin from "firebase-admin";

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, updateDoc, getDoc, setDoc,deleteDoc, serverTimestamp, query, where, orderBy, getDocs } from "firebase/firestore/lite";

/**
 * Backend del servidor de deRuta.
 * Aquí iré poniendo los endpoints necesarios.
 * 
 */
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
dotenv.config();

const puerto = process.env.PUERTO;

const conexion = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USUARIO,
  password: process.env.DB_PASS,
  database: process.env.DB_NNOMBRE,
  port: process.env.DB_PUERTO
}).promise();


conexion.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
    return;
  }
  console.log('Conectado a la base de datos');
});


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const appFireBase = initializeApp(firebaseConfig);
const firestore = getFirestore(appFireBase);

/**
 * Url básico para comprobar conexión.
 */
app.get("/", (req, res) => {
  res.send("Servidor conectado y funcionando");
});

/************************************************************************************************************ */
/************************************************************************************************************ */
/*************************************           FIREBASE       ********************************************* */
/************************************************************************************************************ */
/************************************************************************************************************ */


/**
 * Endpoint para insertar en Firebase (Firestore).
 * Espera: grupo, nombre, descripcion, tipo, provincia, web, usuario.
 * si falta el grupo da error ya que es algo imprescindible.
 * el resto de datos si faltan, están vacíos o son NULL, se insertan ''.
 * Se inserta también fecha del servidor.
 */
app.post('/insertar_firestore', async (req, res) => {
  const { grupo, nombre, descripcion, tipo, provincia, visitado, web, usuario } = req.body;

  const documento = {
    nombre: (nombre && nombre.trim() !== '') ? nombre : '',
    descripcion: (descripcion && descripcion.trim() !== '') ? descripcion : '',
    tipo: (tipo && tipo.trim() !== '') ? tipo : '',
    provincia: (provincia && provincia.trim() !== '') ? provincia : '',
    visitado: (visitado && visitado.trim() !== '') ? visitado : '',
    web: (web && web.trim() !== '') ? web : '',
    usuario: (usuario && usuario.trim() !== '') ? usuario : '',
    creadoEn: serverTimestamp()
  };

  // Comprobación de que se envió el grupo
  if (!grupo) {
    return res.status(400).json({
      success: false,
      message: 'Falta el campo "grupo"'
    });
  }

  try {
    // Subcolección "datos" dentro del grupo correspondiente
    const elementosRef = collection(firestore, 'grupos', grupo, 'datos');
    const elementosRef_CS = collection(firestore, 'grupos_CS', `${grupo}_CS`, 'datos');
    // Subcolección "datos" dentro del grupo correspondiente CS
    const docRef = await addDoc(elementosRef, documento);
    const docRef_CS = await addDoc(elementosRef_CS, documento);


    res.status(200).json({
      success: true,
      id: docRef.id,
      message: `Se ha guardado correctamente.`
    });
  } catch (error) {
    console.error('Error insertando en Firebase:', error);
    res.status(500).json({
      success: false,
      message: 'Error insertando en Firebase',
      error: error.message
    });
  }
});

/**
 * Endpoint para insertar en Firebase (Firestore) el calendario.
 * Espera: grupo, dia_fecha, descripcion, dia_fecha_fin, fecha_inicio_iso, web, usuario.
 * si falta el grupo da error ya que es algo imprescindible.
 * el resto de datos si faltan, están vacíos o son NULL, se insertan ''.
 * Se inserta también fecha del servidor.
 */
app.post('/insertar_firestore_calendario', async (req, res) => {
  const { grupo, dia_fecha, descripcion, dia_fecha_fin, fecha_inicio_iso, fecha_fin_iso, web, usuario } = req.body;

    // Comprobación de que se envió el grupo
  if (!grupo || !dia_fecha) {
    return res.status(400).json({
      success: false,
      message: 'Falta el campo "grupo" o el "día"'
    });
  }
  
  const documento = {
    dia_fecha: dia_fecha,
    descripcion: (descripcion && descripcion.trim() !== '') ? descripcion : '',
    dia_fecha_fin: (dia_fecha_fin && dia_fecha_fin.trim() !== '') ? dia_fecha_fin : '',
    fecha_inicio_iso: (fecha_inicio_iso && fecha_inicio_iso.trim() !== '') ? fecha_inicio_iso : '',
    fecha_fin_iso: (fecha_fin_iso && fecha_fin_iso.trim() !== '') ? fecha_fin_iso : '',
    web: (web && web.trim() !== '') ? web : '',
    usuario: (usuario && usuario.trim() !== '') ? usuario : '',
    creadoEn: serverTimestamp()
  };



  try {
    // Subcolección "calendario" dentro del grupo correspondiente
    const elementosRef = collection(firestore, 'grupos', grupo, 'calendario');
    const elementosRef_CS = collection(firestore, 'grupos_CS', `${grupo}_CS`, 'calendario');
    // Subcolección "calendario" dentro del grupo correspondiente CS
    const docRef = await addDoc(elementosRef, documento);
    const docRef_CS = await addDoc(elementosRef_CS, documento);


    res.status(200).json({
      success: true,
      id: docRef.id,
      message: `Se ha guardado correctamente.`
    });
  } catch (error) {
    console.error('Error insertando calendario en Firebase:', error);
    res.status(500).json({
      success: false,
      message: 'Error insertando en Firebase',
      error: error.message
    });
  }
});


/**
 * Endpoint para modificar un registro, se deja constancia en la CS.
 */
app.put('/modificar_firestore/:grupo/:id', async (req, res) => {
  const { grupo, id } = req.params;
  const { nombre, descripcion, tipo, provincia, visitado, web, usuario } = req.body;

  if (!grupo || !id) {
    return res.status(400).json({
      success: false,
      message: 'Faltan parámetros obligatorios: grupo o id.'
    });
  }

  const documento = {
    nombre: (nombre && nombre.trim() !== '') ? nombre : '',
    descripcion: (descripcion && descripcion.trim() !== '') ? descripcion : '',
    tipo: (tipo && tipo.trim() !== '') ? tipo : '',
    provincia: (provincia && provincia.trim() !== '') ? provincia : '',
    visitado: (visitado && visitado.trim() !== '') ? visitado : '',
    web: (web && web.trim() !== '') ? web : '',
    usuario: (usuario && usuario.trim() !== '') ? usuario : '',
  };

  try {
    //actualizamos datos
    const docAModificar = doc(firestore, 'grupos', grupo, 'datos', id);

    //obtengo datos antiguos
    const datosOriginales = await getDoc(docAModificar);

    if (!datosOriginales.exists()) {
      return res.status(404).json({
        success: false,
        message: 'El documento no existe.'
      });
    }
    const datos = datosOriginales.data();
    const documento_CS = {
      id_original: id,
      ...datos,
      nombre_nuevo: (nombre && nombre.trim() !== '') ? nombre : '',
      descripcion_nuevo: (descripcion && descripcion.trim() !== '') ? descripcion : '',
      tipo_nuevo: (tipo && tipo.trim() !== '') ? tipo : '',
      provincia_nuevo: (provincia && provincia.trim() !== '') ? provincia : '',
      visitado_nuevo: (visitado && visitado.trim() !== '') ? visitado : '',
      web_nuevo: (web && web.trim() !== '') ? web : '',
      usuario_nuevo: (usuario && usuario.trim() !== '') ? usuario : '',
      modificacion: 'Modificado',
      modificadoEn: serverTimestamp()
    };

    await updateDoc(docAModificar, documento);


    // Subcolección "datos" dentro del grupo correspondiente
    const elementosRef_CS = collection(firestore, 'grupos_CS', `${grupo}_CS`, 'datos');
    // Subcolección "datos" dentro del grupo correspondiente CS
    const docAModificar_CS = await addDoc(elementosRef_CS, documento_CS);

    res.status(200).json({
      success: true,
      message: 'Documento actualizado correctamente.'
    });
  } catch (error) {
    console.error('Error actualizando en Firebase:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando el documento',
      error: error.message
    });
  }
});

/**
 * Endpoint para modificar un registro del calendario, se deja constancia en la CS.
 */
app.put('/modificar_firestore_calendario/:grupo/:id', async (req, res) => {
  const { grupo, id } = req.params;
  const { dia_fecha, descripcion, dia_fecha_fin, fecha_inicio_iso, fecha_fin_iso, web, usuario } = req.body;

  if (!grupo || !id || !dia_fecha) {
    return res.status(400).json({
      success: false,
      message: 'Faltan parámetros obligatorios: grupo, fecha o id.'
    });
  }

  const documento = {
    dia_fecha: dia_fecha,
    descripcion: (descripcion && descripcion.trim() !== '') ? descripcion : '',
    dia_fecha_fin: (dia_fecha_fin && dia_fecha_fin.trim() !== '') ? dia_fecha_fin : '',
    fecha_inicio_iso: (fecha_inicio_iso && fecha_inicio_iso.trim() !== '') ? fecha_inicio_iso : '',
    fecha_fin_iso: (fecha_fin_iso && fecha_fin_iso.trim() !== '') ? fecha_fin_iso : '',
    web: (web && web.trim() !== '') ? web : '',
    usuario: (usuario && usuario.trim() !== '') ? usuario : '',
  };

  try {
    //actualizamos datos
    const docAModificar = doc(firestore, 'grupos', grupo, 'calendario', id);

    //obtengo datos antiguos
    const datosOriginales = await getDoc(docAModificar);

    if (!datosOriginales.exists()) {
      return res.status(404).json({
        success: false,
        message: 'El documento no existe.'
      });
    }
    
    const datos = datosOriginales.data();
    const documento_CS = {
      id_original: id,
      ...datos,
      dia_fecha_nuevo: dia_fecha,
      descripcion_nuevo: (descripcion && descripcion.trim() !== '') ? descripcion : '',
      dia_fecha_fin_nuevo: (dia_fecha_fin && dia_fecha_fin.trim() !== '') ? dia_fecha_fin : '',
      fecha_fin_iso_nuevo: (fecha_fin_iso && fecha_fin_iso.trim() !== '') ? fecha_fin_iso : '',
      fecha_inicio_iso_nuevo: (fecha_inicio_iso && fecha_inicio_iso.trim() !== '') ? fecha_inicio_iso : '',
      web_nuevo: (web && web.trim() !== '') ? web : '',
      usuario_nuevo: (usuario && usuario.trim() !== '') ? usuario : '',
      modificacion: 'Modificado',
      modificadoEn: serverTimestamp()
    };

    await updateDoc(docAModificar, documento);


    // Subcolección "calendario" dentro del grupo correspondiente
    const elementosRef_CS = collection(firestore, 'grupos_CS', `${grupo}_CS`, 'calendario');
    // Subcolección "calendario" dentro del grupo correspondiente CS
    const docAModificar_CS = await addDoc(elementosRef_CS, documento_CS);

    res.status(200).json({
      success: true,
      message: 'Documento actualizado correctamente.'
    });
  } catch (error) {
    console.error('Error actualizando en Firebase:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando el documento',
      error: error.message
    });
  }
});

/**
 * Endpoint para eilimar un registro. 
 * Primero se obtienen los datos del id a borrar.
 * Se deja constancia en la copia de seguridad.
 * Y finalmente se procede con el borrado.
 */
app.delete('/eliminar_firestore/:grupo/:id', async (req, res) => {
  const { grupo, id } = req.params;
  const { usuario } = req.body;

  if (!grupo || !id) {
    return res.status(400).json({
      success: false,
      message: 'Faltan parámetros obligatorios: grupo o id.'
    });
  }

  try {

    const docABorrar = doc(firestore, 'grupos', grupo, 'datos', id);

    const datosOriginales = await getDoc(docABorrar);

    if (!datosOriginales.exists()) {
      return res.status(404).json({
        success: false,
        message: 'El documento no existe.'
      });
    }
    const datos = datosOriginales.data();
    const documento_CS = {
      id_original: id,
      ...datos,
      modificacion: 'Eliminado',
      usuario: (usuario && usuario.trim() !== '') ? usuario : '',
      eliminadoEn: serverTimestamp()
    };

    // Insertamos en CS
    const elementosRef_CS = collection(firestore, 'grupos_CS', `${grupo}_CS`, 'datos');
    await addDoc(elementosRef_CS, documento_CS);

    // Eliminamos el documento real
    await deleteDoc(docABorrar);

    res.status(200).json({
      success: true,
      message: 'Documento eliminado y registrado correctamente en CS.'
    });
  } catch (error) {
    console.error('Error eliminando el documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando el documento',
      error: error.message
    });
  }
});

/**
 * Endpoint para eilimar un registro del calendario. 
 * Primero se obtienen los datos del id a borrar.
 * Se deja constancia en la copia de seguridad.
 * Y finalmente se procede con el borrado.
 */
app.delete('/eliminar_firestore_calendario/:grupo/:id', async (req, res) => {
  const { grupo, id } = req.params;
  const { usuario } = req.body;

  if (!grupo || !id) {
    return res.status(400).json({
      success: false,
      message: 'Faltan parámetros obligatorios: grupo o id.'
    });
  }

  try {

    const docABorrar = doc(firestore, 'grupos', grupo, 'calendario', id);

    const datosOriginales = await getDoc(docABorrar);

    if (!datosOriginales.exists()) {
      return res.status(404).json({
        success: false,
        message: 'El documento no existe.'
      });
    }
    const datos = datosOriginales.data();
    const documento_CS = {
      id_original: id,
      ...datos,
      modificacion: 'Eliminado',
      usuario: (usuario && usuario.trim() !== '') ? usuario : '',
      eliminadoEn: serverTimestamp()
    };

    // Insertamos en CS
    const elementosRef_CS = collection(firestore, 'grupos_CS', `${grupo}_CS`, 'calendario');
    await addDoc(elementosRef_CS, documento_CS);

    // Eliminamos el documento real
    await deleteDoc(docABorrar);

    res.status(200).json({
      success: true,
      message: 'Documento eliminado y registrado correctamente en CS.'
    });
  } catch (error) {
    console.error('Error eliminando el documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando el documento',
      error: error.message
    });
  }
});


/**
 * Endpoint para obtener los dato pasaándole el grupo, el tipo y si visitado o no.
 */
app.post('/obtener_datos', async (req, res) => {
  const { grupo, tipo, visitado } = req.body;


  if (!grupo) {
    return res.status(400).json({
      success: false,
      message: 'Falta el campo "grupo"'
    });
  }

  try {
    const datosRef = collection(firestore, 'grupos', grupo, 'datos');

    // Construir la consulta con los filtros
    let filtros = [];
    if (tipo) filtros.push(where('tipo', '==', tipo));
    if (visitado) filtros.push(where('visitado', '==', visitado));

    const consulta = query(datosRef, ...filtros);
    const snapshot = await getDocs(consulta);

    const resultados = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({
      success: true,
      data: resultados
    });

  } catch (error) {
    console.error('Error consultando Firestore:', error);
    res.status(500).json({
      success: false,
      message: 'Error consultando Firestore',
      error: error.message
    });
  }
});

/**
 * Endpoint para obtener los datos del calendario pasaándole el grupo.
 */
app.post('/obtener_datos_calendario', async (req, res) => {
  const { grupo } = req.body;


  if (!grupo) {
    return res.status(400).json({
      success: false,
      message: 'Falta el campo "grupo"'
    });
  }

  try {
    const datosRef = collection(firestore, 'grupos', grupo, 'calendario');

    const consulta = query(datosRef);
    const snapshot = await getDocs(consulta);

    const resultados = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({
      success: true,
      data: resultados
    });

  } catch (error) {
    console.error('Error consultando Firestore calendario:', error);
    res.status(500).json({
      success: false,
      message: 'Error consultando Firestore',
      error: error.message
    });
  }
});


/**
 * Marcar como visitado o no visiatdo. (EN PRINCIPIO NO SE USA)
 */
app.put('/visitado/:grupo/:id', async (req, res) => {
  const { grupo, id } = req.params;
  const { visitado, usuario } = req.body;

  if (!grupo || !id) {
    return res.status(400).json({
      success: false,
      message: 'Faltan parámetros obligatorios: grupo o id.'
    });
  }

  if (visitado !== 'SI' && visitado !== '') {
    return res.status(400).json({
      success: false,
      message: 'El valor de visitado debe ser "SI" o cadena vacía.'
    });
  }

  try {
    const docVisitado = doc(firestore, 'grupos', grupo, 'datos', id);

    const datosOriginales = await getDoc(docVisitado);

    if (!datosOriginales.exists()) {
      return res.status(404).json({
        success: false,
        message: 'El documento no existe.'
      });
    }
    const datos = datosOriginales.data();
    const documento_CS = {
      id_original: id,
      ...datos,
      modificacion: 'Visitado',
      usuario_nuevo: (usuario && usuario.trim() !== '') ? usuario : '',
      visitado: visitado,
      visitadoEn: serverTimestamp()
    };

    // Insertamos en CS
    const elementosRef_CS = collection(firestore, 'grupos_CS', `${grupo}_CS`, 'datos');
    await addDoc(elementosRef_CS, documento_CS);


    // Actualizamos sólo el campo visitado (y usuario si quieres)
    await updateDoc(docVisitado, {
      visitado,
      ...(usuario ? { usuario } : {}),
      visitadoEn: serverTimestamp()
    });

    res.status(200).json({
      success: true,
      message: `Campo 'visitado' actualizado a '${visitado}'.`
    });
  } catch (error) {
    console.error('Error actualizando visitado:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando el campo visitado',
      error: error.message
    });
  }
});


/**
 * Endpoint para resetear la contraseña.
 */
app.post("/resetear_contrasena", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email es requerido" });
  }

  const firebaseApiKey = process.env.FIREBASE_API_KEY;
  const firebaseUrl = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey}`;

  const payload = {
    requestType: "PASSWORD_RESET",
    email: email
  };

  try {
    const response = await fetch(firebaseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ success: false, message: data.error.message });
    }

    res.json({ success: true, message: "Correo de reseteo enviado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error al contactar con Firebase" });
  }
});


/************************************************************************************************************ */
/************************************************************************************************************ */
/*************************************            MYSQL         ********************************************* */
/************************************************************************************************************ */
/************************************************************************************************************ */
/**
 * Endpoint para ver todos los grupos. Pensado para la copia de seguridad.
 */
app.post('/ver_todos_grupos', async (req, res) => {
  try {
    const [rows] = await conexion.query(
      'SELECT nombre FROM deRuta_nombresGrupo'
    );

    if (rows.length === 0) {
      return res.status(200).json({ error: 'No hay datos' });
    }

    res.json(rows); 
  } catch (error) {
    console.error('Error en la consulta:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


/**
 * Endpoint para obtener los grupos de un usuario.
 */
app.post('/ver_grupos', async (req, res) => {
  const { mail } = req.body;

  if (!mail) {
    return res.status(400).json({ error: 'Email requerido' });
  }

  try {
    const [rows] = await conexion.query(
      'SELECT grupoUsuario FROM deRuta_usuarios WHERE mailUsuario = ?',
      [mail]
    );

    if (rows.length === 0) {
      return res.status(200).json({ error: 'No hay datos' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Error en la consulta:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * endpoint para ver clave
 */
app.post('/ver_clave', async (req, res) => {
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'Grupo requerido' });
  }

  try {
    const [rows] = await conexion.query(
      'SELECT clave FROM deRuta_nombresGrupo WHERE nombre = ?',
      [nombre]
    );

    if (rows.length === 0) {
      return res.status(200).json({ error: 'No hay datos' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Error en la consulta:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Endpoint para obtener los datos de un usuario.
 */
app.post('/ver_datos_usuario', async (req, res) => {
  const { mail, grupo } = req.body;

  if (!mail) {
    return res.status(400).json({ error: 'Email requerido' });
  }

  if (!grupo) {
    return res.status(400).json({ error: 'Grupo requerido' });
  }

  try {
    const [rows] = await conexion.query(
      'SELECT * FROM deRuta_usuarios WHERE mailUsuario = ? AND grupoUsuario = ?',
      [mail, grupo]
    );

    if (rows.length === 0) {
      return res.status(200).json({ error: 'No hay datos' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Error en la consulta:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Endpoint para comprobar si existe el grupo.
 * Para ello se cuenta el número de veces que sale en la búsqueda.
 */
app.post('/existe_grupo', async (req, res) => {
  const { grupo } = req.body;

  if (!grupo) {
    return res.status(400).json({ error: 'Grupo requerido' });
  }

  try {
    const [rows] = await conexion.query(
      'SELECT COUNT(*) AS total FROM deRuta_nombresGrupo WHERE nombre = ?',
      [grupo]
    );

    const existe = rows[0].total > 0;

    if (!existe) {
      return res.status(200).json({ existe: false, mensaje: 'No hay datos' });
    }

    res.status(200).json({ existe: true, mensaje: 'Grupo existe' });
  } catch (error) {
    console.error('Error en la consulta:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Endpoint para comprobar si existe el grupo.
 * Para ello se cuenta el número de veces que sale en la búsqueda.
 */
app.post('/validar_grupo_clave', async (req, res) => {
  const { grupo, clave } = req.body;

  if (!grupo) {
    return res.status(400).json({ error: 'Grupo requerido' });
  }

  if (!clave) {
    return res.status(400).json({ error: 'Clave requerida' });
  }
  try {
    const [rows] = await conexion.query(
      'SELECT COUNT(*) AS total FROM deRuta_nombresGrupo WHERE nombre = ? AND clave = ?',
      [grupo, clave]
    );

    const existe = rows[0].total > 0;

    if (!existe) {
      return res.status(200).json({ existe: false, mensaje: 'No hay datos' });
    }

    res.status(200).json({ existe: true, mensaje: 'Existe el grupo con esa clave' });
  } catch (error) {
    console.error('Error en la consulta:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Endpoint para comprobar si el usuario ya está en el grupo introducido.
 * Para ello se cuenta el número de veces que sale en la búsqueda.
 */
app.post('/usuario_ya_en_grupo', async (req, res) => {
  const { grupo, mail } = req.body;

  if (!grupo) {
    return res.status(400).json({ error: 'Grupo requerido' });
  }

  if (!mail) {
    return res.status(400).json({ error: 'Email requerido' });
  }


  try {
    const [rows] = await conexion.query(
      'SELECT COUNT(*) AS total FROM deRuta_usuarios WHERE mailUsuario = ? AND grupoUsuario = ?',
      [mail, grupo]
    );

    const existe = rows[0].total > 0;

    if (!existe) {
      return res.status(200).json({ existe: false, mensaje: 'No hay datos' });
    }

    res.status(200).json({ existe: true, mensaje: 'Grupo existe' });
  } catch (error) {
    console.error('Error en la consulta:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Endpoint para comprobar si existe el nick en el grupo introducido.
 */
app.post('/existe_nick', async (req, res) => {
  const { grupo, nick } = req.body;

  if (!grupo) {
    return res.status(400).json({ error: 'Grupo requerido' });
  }

  if (!nick) {
    return res.status(400).json({ error: 'Nick requerido' });
  }
  try {
    const [rows] = await conexion.query(
      'SELECT COUNT(*) AS total FROM deRuta_usuarios WHERE nickUsuario = ? AND grupoUsuario = ?',
      [nick, grupo]
    );

    const existe = rows[0].total > 0;

    if (!existe) {
      return res.status(200).json({ existe: false, mensaje: 'No hay datos' });
    }

    res.status(200).json({ existe: true, mensaje: 'Existe el nick en ese grupo' });
  } catch (error) {
    console.error('Error en la consulta:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Insertar usuario.
 */
app.post('/insertar_usuario', async (req, res) => {
  const { mail, nick, admin, notificacion, grupo } = req.body;

  if (!mail || !nick || admin === undefined || notificacion === undefined || !grupo) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  try {
    const sql = `
      INSERT INTO deRuta_usuarios (mailUsuario, nickUsuario, adminUsuario, notificacionUsuario, grupoUsuario)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await conexion.query(sql, [mail, nick, admin ? 1 : 0, notificacion ? 1 : 0, grupo]);

    if (result.affectedRows === 1) {
      res.status(201).json({ mensaje: 'Usuario insertado correctamente' });
    } else {
      res.status(500).json({ error: 'No se pudo insertar el usuario' });
    }
  } catch (error) {
    console.error('Error al insertar usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Crear grupo.
 */
app.post('/crear_grupo', async (req, res) => {
  const { nombre, clave } = req.body;

  if (!nombre || !clave) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  try {
    const sql = `
      INSERT INTO deRuta_nombresGrupo (nombre, clave)
      VALUES (?, ?)
    `;

    const [result] = await conexion.query(sql, [nombre, clave]);

    if (result.affectedRows === 1) {
      res.status(201).json({ mensaje: 'Grupo insertado correctamente' });
    } else {
      res.status(500).json({ error: 'No se pudo insertar el grupo' });
    }
  } catch (error) {
    console.error('Error al insertar grupo:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Endpoint para modificar el nombre de usuario.
 */
app.put('/modificar_nombre_usuario', async (req, res) => {
  const { nickAntiguo, grupo, nuevoNick } = req.body;

  if (!nickAntiguo || !grupo || !nuevoNick) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  try {
    const sql = `
      UPDATE deRuta_usuarios
      SET nickUsuario = ?
      WHERE nickUsuario = ? AND grupoUsuario = ?
    `;

    const [result] = await conexion.query(sql, [nuevoNick, nickAntiguo, grupo]);

    if (result.affectedRows === 1) {
      res.status(200).json({ mensaje: 'Usuario modificado correctamente' });
    } else {
      res.status(404).json({ error: 'Usuario no encontrado o sin cambios' });
    }
  } catch (error) {
    console.error('Error al modificar usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Endpoint para activar o desactivar las notificaciones.
 */
app.put('/modificar_notificaciones', async (req, res) => {
  const { nick, grupo, notificacion } = req.body;

  if (!nick || !grupo || !notificacion) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  const valorNotificacion = (notificacion === true || notificacion === 'true') ? 1 : 0;

  try {
    const sql = `
      UPDATE deRuta_usuarios
      SET notificacionUsuario = ?
      WHERE nickUsuario = ? AND grupoUsuario = ?
    `;

    const [result] = await conexion.query(sql, [valorNotificacion, nick, grupo]);

    if (result.affectedRows === 1) {
      res.status(200).json({ mensaje: 'Notificación modificada correctamente' });
    } else {
      res.status(404).json({ error: 'Usuario no encontrado o sin cambios' });
    }
  } catch (error) {
    console.error('Error al modificar usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Endpoint para poner en admin o no
 */
app.put('/modificar_administrador', async (req, res) => {
  const { idUsuario, administrador } = req.body;

  if (!idUsuario || !administrador) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  const valorAdministrador = (administrador === true || administrador === 'true') ? 1 : 0;

  try {
    const sql = `
      UPDATE deRuta_usuarios
      SET adminUsuario = ?
      WHERE idUsuario = ?
    `;

    const [result] = await conexion.query(sql, [valorAdministrador, idUsuario]);

    if (result.affectedRows === 1) {
      res.status(200).json({ mensaje: 'Administrador modificado correctamente' });
    } else {
      res.status(404).json({ error: 'Usuario no encontrado o sin cambios' });
    }
  } catch (error) {
    console.error('Error al modificar usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * para salir del grupo
 */
app.post('/salir_grupo', async (req, res) => {
  const { nick, grupo } = req.body;

  if (!nick || !grupo) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  try {
    const sql = `
      DELETE FROM deRuta_usuarios
      WHERE nickUsuario = ? AND grupoUsuario = ?
    `;

    const [result] = await conexion.query(sql, [nick, grupo]);

    if (result.affectedRows === 1) {
      res.status(200).json({ mensaje: 'Usuario eliminado del grupo correctamente' });
    } else {
      res.status(404).json({ error: 'Usuario no encontrado o sin cambios' });
    }
  } catch (error) {
    console.error('Error al modificar usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * endpoint para ver los usuarios de un grupo.
 */
app.post('/ver_usuarios', async (req, res) => {
  const { grupo } = req.body;

  if (!grupo) {
    return res.status(400).json({ error: 'Grupo requerido' });
  }

  try {
    const [rows] = await conexion.query(
      'SELECT * FROM deRuta_usuarios WHERE grupoUsuario = ?',
      [grupo]
    );

    if (rows.length === 0) {
      return res.status(200).json({ error: 'No hay datos de usuarios en ese grupo' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Error en la consulta:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/************************************************************************************************************ */
/************************************************************************************************************ */
/************************************************************************************************************ */
/************************************************************************************************************ */
/************************************************************************************************************ */
server.listen(puerto, () => {
  const ahora = new Date();
  const horaActual = ahora.toLocaleTimeString();
  console.log(`Servidor escuchando en el puerto ${puerto}. - - - - - - > ${horaActual}`);
});