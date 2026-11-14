import { Types } from 'mongoose';

export interface ReviewEntity {
	_id?: Types.ObjectId;
	beer: Types.ObjectId;
	user: Types.ObjectId;
	userName: string;
	rating: number;
	comment?: string;
	createdAt?: Date;
	updatedAt?: Date;
}
