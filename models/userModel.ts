import { Schema, model } from 'mongoose';
import { UserEntity } from '../types';

// Create a Schema corresponding to the document interface
const userModel = new Schema<UserEntity>(
	{
		name: { type: String, required: true, maxLength: 100 },
		email: { type: String, required: true, maxLength: 100 },
		password: { type: String, required: true, maxLength: 100 },
		role: { type: String, required: true },
		token: { type: String },
	},
	{
		timestamps: true,
	}
);

// Create a Model
export const User = model<UserEntity>('User', userModel);
