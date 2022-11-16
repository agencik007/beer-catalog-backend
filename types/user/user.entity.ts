import mongoose from "mongoose";

export interface UserEntity {
    id?: mongoose.Schema.Types.ObjectId;
    _id?: mongoose.Schema.Types.ObjectId;
    name?: string;
    email: string;
    password: string;
    role?: 'user' | 'admin';
    token?: string | null;
}