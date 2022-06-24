import {Schema, model} from 'mongoose';
import {BeerEntity} from "../types/beer";

// Create a Schema corresponding to the document interface
const beerModel = new Schema<BeerEntity>({
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    name: { type: String, required: true, maxLength: 100},
    type: { type: String, required: true, maxLength: 50 },
    rating: { type: Number, required: true, maxLength: 2 },
    alcohol: { type: Number, required: true, maxLength: 3 },
    description: { type: String, required: true, maxLength: 1000 },
    avatar: { type: String, required: false, maxLength: 200 }
}, {
    timestamps: true,
});

// Create a Model
export const Beer = model<BeerEntity>('Beer', beerModel);
