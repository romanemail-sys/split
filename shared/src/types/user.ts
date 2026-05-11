export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  defaultCurrency: string;
  emailVerified: boolean;
  isAdmin: boolean;
  createdAt: string;
}
