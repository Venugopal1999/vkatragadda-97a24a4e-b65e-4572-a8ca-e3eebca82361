import { Role } from '../enums/role.enum';

export interface RequestUser {
  userId: string;
  role: Role;
  orgId: string;
}
