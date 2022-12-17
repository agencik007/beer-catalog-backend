import { Schema } from 'mongoose';

export interface BeerEntity {
	_id?: Schema.Types.ObjectId;
	user?: Schema.Types.ObjectId;
	createdAt: Date;
	createdBy: string;
	name: string;
	type: string;
	rating: number;
	alcohol: number;
	description: string;
	avatar?: string;
}
