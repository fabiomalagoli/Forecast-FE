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

export interface UserTokenDataDto {
  id?: string;
  firstName: string;
  lastName: string;
  userName: string;
  pictureUrl?: string;
  role: string;
}

export interface AuthResponseDto {
  tokens: TokenDto;
  user: UserTokenDataDto;
}

// Informazioni sull'utente autenticato (estratte dal JWT o ricevute al login)
export interface User {
  id?: string;
  firstName: string;
  lastName: string;
  userName: string;
  role?: string;
  photoUrl?: string; // URL dell'immagine del profilo (opzionale)
}