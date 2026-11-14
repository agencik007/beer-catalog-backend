import { Schema } from 'mongoose';

export interface BeerEntity {
	_id?: Schema.Types.ObjectId;
	user?: Schema.Types.ObjectId;
	createdAt: Date;
	createdBy: string;
	name: string;
	type: string;
	/** Community average of review ratings (0 when there are no reviews) */
	ratingAvg: number;
	ratingCount: number;
	alcohol: number;
	description: string;
	avatar?: string;
}
