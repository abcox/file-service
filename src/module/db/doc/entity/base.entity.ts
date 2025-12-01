export interface BaseEntity {
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string; // default: 'system'
  updatedBy?: string; // default: 'system'
}
