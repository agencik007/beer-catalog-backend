import {Schema} from "mongoose";

export interface JwtPayload {
    id: Schema.Types.ObjectId;
}