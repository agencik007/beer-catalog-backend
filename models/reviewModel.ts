import { Schema, model } from 'mongoose';
import { ReviewEntity } from '../types/index.js';

export const REVIEW_COMMENT_MAX = 1000;

const reviewModel = new Schema<ReviewEntity>(
	{
		beer: { type: Schema.Types.ObjectId, required: true, ref: 'Beer' },
		user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
		// Display name snapshot, like Beer.createdBy
		userName: { type: String, required: true, maxLength: 100 },
		rating: {
			type: Number,
			required: true,
			min: 1,
			max: 5,
			validate: { validator: Number.isInteger, message: 'Rating must be a whole number.' },
		},
		comment: { type: String, trim: true, maxLength: REVIEW_COMMENT_MAX },
	},
	{
		timestamps: true,
	}
);

// One review per user per beer
reviewModel.index({ beer: 1, user: 1 }, { unique: true });
reviewModel.index({ beer: 1, createdAt: -1 });

export const Review = model<ReviewEntity>('Review', reviewModel);
