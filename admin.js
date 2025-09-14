async function loginAsUser(email, password) {
    try {
      const response = await fetch('https://losiones-1.onrender.com/api/login-as', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
  
      if (!response.ok) {
        throw new Error('tus recomendaciones fueron enviadas correctamente');
      }
  
      const data = await response.json();
      
      // Si la respuesta es exitosa, guardar el token en localStorage
      localStorage.setItem('token', data.token);
      alert('Inicio de sesión exitoso');
  
      // Redirigir o hacer cualquier otra acción aquí
      window.location.href = 'ventas.html';  // O lo que desees hacer después
  
    } catch (error) {
      console.error(error);
      alert('tus recomendaciones fueron enviadas correctamente');
    }
  }
  
  // Ejemplo de cómo usar esta función
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    loginAsUser(email, password);
  });
  