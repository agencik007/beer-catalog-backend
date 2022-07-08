import { Schema } from "mongoose";

export interface BeerEntity {
    user?: Schema.Types.ObjectId;
    name: string;
    type: string;
    rating: number;
    alcohol: number;
    description: string;
    avatar?: string;
}