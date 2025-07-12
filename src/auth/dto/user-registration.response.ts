import { UserEntity } from '../../database/entities/user.entity';

export class UserRegistrationResponse {
  success: boolean;
  message: string;
  token: string;
  user: UserEntity;
}
