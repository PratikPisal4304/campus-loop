import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { ROLES } from "../domain/user";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Never travels with the user document. A query has to ask for it explicitly, so a
    // stray `findOne()` cannot leak a hash into a server component's props.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: [...ROLES], default: "student", index: true },
    bio: { type: String, default: null },
    campusArea: { type: String, default: null },
    // Sum and count rather than a stored average: an average cannot be updated
    // incrementally without drifting, and it loses the sample size trust depends on.
    ratingSum: { type: Number, default: 0, min: 0 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: "users" },
);

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

/**
 * The `models.X ?? model(...)` guard is not optional in development: Next re-evaluates
 * this module on every hot reload, and Mongoose throws OverwriteModelError the second
 * time a model name is registered.
 */
export const UserModel: Model<UserDocument> =
  (mongoose.models.User as Model<UserDocument>) ??
  mongoose.model<UserDocument>("User", userSchema);
