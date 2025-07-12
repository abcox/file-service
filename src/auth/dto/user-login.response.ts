import { UserEntity } from '../../database/entities/user.entity';

export class UserLoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: UserEntity | null;
}
