import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  userData: any = null; // Aquí guardaremos los datos del usuario, como su rol

  constructor(private auth: Auth, private firestore: Firestore, private router: Router) {
    // Esto se queda "escuchando" todo el tiempo. 
    // Si entras a la app y ya habías puesto tu clave ayer, te recuerda.
    user(this.auth).subscribe(async (userActual) => {
      if (userActual) {
        // El usuario existe en Authentication. Ahora buscamos su rol en la base de datos (perfiles)
        const docRef = doc(this.firestore, `perfiles/${userActual.uid}`);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          this.userData = snap.data();
          console.log("Usuario conectado con rol:", this.userData.rol);
        }
      } else {
        // Si no hay nadie conectado, limpiamos la variable
        this.userData = null;
        console.log("Nadie está conectado");
        // this.router.navigate(['/login']); // <-- Lo descomentaremos cuando hagamos la pantalla de login
      }
    });
  }

  // Función para iniciar sesión
  login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  // Función para cerrar sesión
  logout() {
    return signOut(this.auth);
  }

  // Función estrella: nos dice si el que está usando el celular es el jefe
  esAdmin() {
    return this.userData?.rol === 'admin';
  }
}