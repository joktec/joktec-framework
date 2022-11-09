import { BaseModel } from '../base.model';

// export enum UserMessagePattern {
//   LIST = 'USER_USER_LIST',
//   GET = 'USER_USER_GET',
//   CREATE = 'USER_USER_CREATE',
//   UPDATE = 'USER_USER_UPDATE',
//   DELETE = 'USER_USER_DELETE',
// }

export enum UserEmailVerificationStatus {
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
}

export interface User extends BaseModel {
  readonly email?: string;
  readonly active?: number;
  readonly address?: string;
  readonly avatar?: string;
  readonly birthday?: Date;
  readonly deleted?: number;
  readonly detail?: string;
  readonly experience?: string;
  readonly gender?: number;
  readonly locked?: number;
  readonly password?: string;
  readonly position?: string;
  readonly status?: string;
  readonly title?: string;
  readonly username?: string;
  readonly platform?: string;
  readonly userId?: string;
  readonly cvChoose?: string;
  readonly firstName?: string;
  readonly fullName?: string;
  readonly lastLogin?: Date;
  readonly lastName?: string;
  readonly phoneNumber?: string;
  readonly expireResetPass?: Date;
  readonly tokenResetPass?: string;
  readonly socialLink?: string;
  readonly isAutoCreated?: number;
  readonly legacyPassword?: string;
  readonly memberRoleId?: string;
  readonly fbId?: string;

  readonly googleId?: string; // * New field
  readonly linkedinId?: string; // * New field

  readonly vneId?: string;
  readonly unlockConfirmShown?: number;
  readonly emailVerification?: UserEmailVerificationStatus;
  readonly lockedReasonCode?: string;
  readonly syncedPlatform?: number;

  readonly accessToken?: string;
}
