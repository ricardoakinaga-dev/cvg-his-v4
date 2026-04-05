export interface UserSummary {
  id: string;
  accountId: string;
  username: string;
  email: string;
  displayName: string;
  fullName?: string;
  roleCode: string;
  department?: string;
  sector?: string;
  jobTitle?: string;
  employeeCode?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface UsersListResponse {
  items: UserSummary[];
}

export interface CreateUserRequest {
  displayName: string;
  fullName?: string;
  email: string;
  username: string;
  password: string;
  roleCode: string;
  department?: string;
  sector?: string;
  jobTitle?: string;
  employeeCode?: string;
  phone?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateUserRequest {
  displayName?: string;
  fullName?: string;
  email?: string;
  username?: string;
  password?: string;
  roleCode?: string;
  department?: string;
  sector?: string;
  jobTitle?: string;
  employeeCode?: string;
  phone?: string;
  status?: 'active' | 'inactive';
}
