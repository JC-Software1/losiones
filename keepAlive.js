const email = "bot@keepalive.com";  // Tu usuario bot
const password = "tuPasswordSegura";

async function mantenerActivoRender() {
  try {
    // 1. Iniciar sesión y obtener token
    const loginRes = await fetch("https://losiones-1.onrender.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!loginRes.ok) {
      console.warn("❌ Error al hacer login:", loginRes.status);
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;

    // 2. Crear venta temporal
    const ventaFalsa = {
      clientName: "BOT CLIENT",
      productName: "KeepAlive Trigger",
      saleDate: new Date().toISOString(),
      price: 111,
      installments: "1",
      advancePayment: 0,
      clientAddress: "BOT"
    };

    const crearRes = await fetch("https://losiones-1.onrender.com/api/sales/new", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(ventaFalsa)
    });

    if (!crearRes.ok) {
      console.warn("❌ Error al crear venta:", crearRes.status);
      return;
    }

    const venta = await crearRes.json();
    console.log("✅ Venta creada:", venta._id);

    // 3. Esperar un poco (opcional)
    await new Promise(r => setTimeout(r, 2000));

    // 4. Eliminar la venta
    const eliminarRes = await fetch(`https://losiones-1.onrender.com/api/sales/${venta._id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (eliminarRes.ok) {
      console.log("🗑️ Venta eliminada:", venta._id);
    } else {
      console.warn("⚠️ No se pudo eliminar la venta:", eliminarRes.status);
    }

  } catch (error) {
    console.error("🔴 Error en keepAlive:", error.message);
  }
}

// Variables para controlar inactividad y ping periódico
let tiempoInactividad;
let intervaloPing;
const tiempoLimite = 5 * 60 * 1000; // 5 minutos

function comenzarPingPeriodico() {
  // Evita duplicar intervalos
  if (intervaloPing) return;

  console.log("⏳ Usuario inactivo. Comenzando pings periódicos...");
  mantenerActivoRender(); // Ejecutar inmediatamente

  intervaloPing = setInterval(() => {
    mantenerActivoRender();
  }, tiempoLimite);
}

function detenerPingPeriodico() {
  if (intervaloPing) {
    clearInterval(intervaloPing);
    intervaloPing = null;
    console.log("✅ Usuario activo. Pings periódicos detenidos.");
  }
}

function resetearTemporizador() {
  // El usuario está activo, así que detenemos pings periódicos
  detenerPingPeriodico();

  // Reiniciamos temporizador de inactividad
  clearTimeout(tiempoInactividad);
  tiempoInactividad = setTimeout(() => {
    comenzarPingPeriodico();
  }, tiempoLimite);
}

// Escuchar eventos de interacción para resetear el temporizador
window.addEventListener("mousemove", resetearTemporizador);
window.addEventListener("keydown", resetearTemporizador);
window.addEventListener("click", resetearTemporizador);
window.addEventListener("scroll", resetearTemporizador);

// Iniciar el temporizador por primera vez
resetearTemporizador();
