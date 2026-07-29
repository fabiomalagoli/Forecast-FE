export interface UserForAuthentication {
  userName?: string; // Corrisponde a UserForAuthenticationDto in C#
  password?: string;
}

export interface UserForRegistration {
  userName?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  roles?: string[];
}

// DTO di risposta con i Token JWT restituiti da C#
export interface TokenDto {
  accessToken: string;
  refreshToken: string;
}

// Informazioni sull'utente autenticato (estratte dal JWT o ricevute al login)
export interface User {
  username: string;
  roles?: string[];
}