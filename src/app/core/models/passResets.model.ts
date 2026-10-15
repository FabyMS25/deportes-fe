export interface PassResets {
  uuid?: string;
  estado?: boolean;
  email?: string;
  token?: string;
  expiresAt?: Date | string;
  message?: string;
}
