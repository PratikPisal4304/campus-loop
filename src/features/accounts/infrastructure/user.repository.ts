import "server-only";
import { Types } from "mongoose";
import { toEmail, toEntityId, type Email, type EntityId } from "@/core/types/branded";
import { connectToDatabase } from "@/shared/db/connection";
import type { CreateUserInput, UpdateProfileInput, UserRepository } from "../domain/ports";
import { isRole, type User } from "../domain/user";
import { UserModel, type UserDocument } from "./user.schema";

export class MongoUserRepository implements UserRepository {
  async findById(id: EntityId): Promise<User | null> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await UserModel.findById(new Types.ObjectId(id)).lean<UserDocument>().exec();
    return doc ? toDomain(doc) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    await connectToDatabase();
    const doc = await UserModel.findOne({ email }).lean<UserDocument>().exec();
    return doc ? toDomain(doc) : null;
  }

  async findCredentialsByEmail(
    email: Email,
  ): Promise<{ user: User; passwordHash: string } | null> {
    await connectToDatabase();
    // passwordHash is `select: false`, so sign-in has to ask for it explicitly.
    const doc = await UserModel.findOne({ email })
      .select("+passwordHash")
      .lean<UserDocument>()
      .exec();
    if (!doc?.passwordHash) return null;
    return { user: toDomain(doc), passwordHash: doc.passwordHash };
  }

  async emailExists(email: Email): Promise<boolean> {
    await connectToDatabase();
    const count = await UserModel.countDocuments({ email }).limit(1).exec();
    return count > 0;
  }

  async create(input: CreateUserInput): Promise<User> {
    await connectToDatabase();
    const created = await UserModel.create({
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role ?? "student",
    });
    return toDomain(created.toObject() as UserDocument);
  }

  async updateProfile(id: EntityId, input: UpdateProfileInput): Promise<User | null> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(id)) return null;
    const updated = await UserModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      { name: input.name, bio: input.bio, campusArea: input.campusArea },
      { returnDocument: "after" },
    )
      .lean<UserDocument>()
      .exec();
    return updated ? toDomain(updated) : null;
  }
}

/**
 * Mongoose document to domain entity. Repositories return entities, never documents —
 * a document carries a live connection, `save()`, and the whole ODM surface into layers
 * that are supposed to be persistence-agnostic.
 */
function toDomain(doc: UserDocument): User {
  return {
    id: toEntityId(doc._id.toString()),
    name: doc.name,
    email: toEmail(doc.email),
    role: isRole(doc.role) ? doc.role : "student",
    bio: doc.bio ?? null,
    campusArea: doc.campusArea ?? null,
    ratingSum: doc.ratingSum ?? 0,
    ratingCount: doc.ratingCount ?? 0,
    createdAt: doc.createdAt,
  };
}
