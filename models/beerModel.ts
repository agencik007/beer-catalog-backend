import { Schema, model } from 'mongoose';
import { BeerEntity } from '../types/index.js';

// Create a Schema corresponding to the document interface
const beerModel = new Schema<BeerEntity>(
	{
		user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
		createdBy: { type: String, required: true, ref: 'User' },
		name: { type: String, required: true, maxLength: 100 },
		type: { type: String, required: true, maxLength: 50 },
		// Maintained by lib/reviews.ts from the Review collection; never set from request bodies
		ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
		ratingCount: { type: Number, default: 0, min: 0 },
		alcohol: { type: Number, required: true, min: 0, max: 100 },
		description: { type: String, required: true, maxLength: 1000 },
		avatar: { type: String, required: false, maxLength: 200 },
	},
	{
		timestamps: true,
	}
);

beerModel.index({ ratingAvg: -1 });

// Create a Model
export const Beer = model<BeerEntity>('Beer', beerModel);
