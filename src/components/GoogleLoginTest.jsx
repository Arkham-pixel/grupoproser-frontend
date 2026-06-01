import React, { useEffect, useState } from "react";

const CLIENT_ID = "262224611220-om055q2l4g4j1kd5v6kv1jkabjo5cdfo.apps.googleusercontent.com";
const SCOPE = "https://www.googleapis.com/auth/drive.file";

export default function GoogleLoginTest() {
  const [isReady, setIsReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    function start() {
      window.gapi.client
        .init({
          clientId: CLIENT_ID,
          scope: SCOPE,
        })
        .then(() => {
          const auth = window.gapi.auth2.getAuthInstance();
          setIsSignedIn(auth.isSignedIn.get());
          setUser(auth.currentUser.get().getBasicProfile());
          auth.isSignedIn.listen((signedIn) => {
            setIsSignedIn(signedIn);
            setUser(signedIn ? auth.currentUser.get().getBasicProfile() : null);
          });
          setIsReady(true);
        });
    }
    window.gapi.load("client:auth2", start);
  }, []);

  const handleLogin = () => {
    window.gapi.auth2.getAuthInstance().signIn();
  };

  const handleLogout = () => {
    window.gapi.auth2.getAuthInstance().signOut();
  };

  return (
    <div>
      <h2>Prueba de Login con Google</h2>
      {!isSignedIn && isReady && (
        <button onClick={handleLogin}>Iniciar sesión con Google</button>
      )}
      {isSignedIn && user && (
        <div>
          <p>¡Sesión iniciada como: {user.getEmail()}!</p>
          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>
      )}
      {!isReady && <p>Cargando Google API...</p>}
    </div>
  );
} 