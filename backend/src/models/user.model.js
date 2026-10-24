import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: [true, "Username is required"],
            unique: true,
            trim: true,
            lowercase: true,
            minlength: [3, "Username must be at least 3 characters long"],
            maxlength: [30, "Username cannot exceed 30 characters"],
            index: true
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
            index: true
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters long"],
            select: false
        },
        refreshToken: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

/**
 * Pre-save hook to hash the user's password with bcrypt.
 * Runs only when the password field is new or modified.
 */
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10);
});

/**
 * Reusable method to compare candidate password against stored bcrypt hash.
 * Safely handles missing candidate password or unselected password hash.
 *
 * @param {string} candidatePassword - Plaintext password to verify
 * @returns {Promise<boolean>} True if match, false otherwise
 */
userSchema.methods.isPasswordCorrect = async function (candidatePassword) {
    if (!candidatePassword || !this.password) {
        return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Generates a signed JWT access token containing essential user identification.
 * Reads ACCESS_TOKEN_SECRET and ACCESS_TOKEN_EXPIRY from environment variables.
 *
 * @returns {string} Signed JWT access token
 */
userSchema.methods.generateAccessToken = function () {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
        throw new Error("ACCESS_TOKEN_SECRET is not defined in environment variables");
    }

    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username
        },
        secret,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d"
        }
    );
};

/**
 * Generates a signed JWT refresh token for session refreshing.
 * Encodes only the user's identifier and uses REFRESH_TOKEN_SECRET.
 *
 * @returns {string} Signed JWT refresh token
 */
userSchema.methods.generateRefreshToken = function () {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) {
        throw new Error("REFRESH_TOKEN_SECRET is not defined in environment variables");
    }

    return jwt.sign(
        {
            _id: this._id
        },
        secret,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d"
        }
    );
};

export const User = mongoose.model("User", userSchema);
