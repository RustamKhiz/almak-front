export type UserRole = 'admin' | 'manager';
export interface UserProfile {
  id: number;
  login: string;
  name: string;
  role: UserRole;
  permissions: readonly string[];
}
