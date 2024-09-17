"use strict";
const UserSchema = require("./user.schema");
const JWTTokenSchema = require("./jwt-tokens.schema");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
//const CONSTANTS = require('../../../config/constant');
const CC = require("./../../../config/constant_collection");
const logger = require("./../../../config/winston");
const jwt = require("jsonwebtoken");


class UserModel {
  constructor() {
    this.DB = require("../../../config/dbm");
    this.projectedKeys = {
      crtd_dt: true,
    };
  }

  async createToken(tokenData) {
    try {
      let token = new JWTTokenSchema(tokenData);
      const result = await token.save();
      return result;
    } catch (error) {
      console.log(error, "error ");
      return error;
    }
  }

  getUserByEmail(email) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await UserSchema.findOne({
          email: email,
          is_deleted: false,
        });
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  async createUser(user_data) {
    try {
      let user = new UserSchema(user_data);
      const result = await user.save();
      return result;
    } catch (error) {
      console.log(error, "error ");
      return error;
    }
  }

  async getOne(where) {
    try {
      return await UserSchema.findOne(where);
    } catch (error) {
      return error;
    }
  }

  async getByKeys(where) {
    try {
      return await UserSchema.find(where);
    } catch (error) {
      return error;
    }
  }

  async getForLastActive(where, keys = {}) {
    try {
      return await UserSchema.find(where, keys);
    } catch (error) {
      return error;
    }
  }

  async getProfileData(where) {
    try {
      const result = await UserSchema.aggregate([
        {
          $match: where,
        },
        {
          $lookup: {
            from: CC.M002_CATEGORY,
            localField: "category_id",
            foreignField: "_id",
            as: "category_data",
          },
        },
        {
          $lookup: {
            from: CC.M002A_SUBCATEGORY,
            localField: "subcategory_id",
            foreignField: "_id",
            as: "subcategory_data",
          },
        },
        {
          $lookup: {
            from: CC.M002A_SUBCATEGORY,
            localField: "interest_id",
            foreignField: "_id",
            as: "interest_data",
          },
        },
        {
          $project: {
            first_name: 1,
            middle_name: 1,
            last_name: 1,
            email: 1,
            bio: 1,
            user_name: 1,
            mobile: 1,
            profile: 1,
            social_id: 1,
            category_id: 1,
            subcategory_id: 1,
            interest_id: 1,
            is_verified: 1,
            gender: 1,
            status: 1,
            post_streak: 1,
            invite_badge: 1,
            invite_count: 1,
            first_post_badge: 1,
            tenth_post_badge: 1,
            twenty_post_badge: 1,
            fifty_post_badge: 1,
            hundred_post_badge: 1,
            good_fella_award: 1,
            most_liked_weekly_post: 1,
            thought_leader_badge: 1,
            user_type: 1,
            talks_about: 1,
            social_links: 1,
            "category_data._id": 1,
            "category_data.name": 1,
            "subcategory_data._id": 1,
            "subcategory_data.name": 1,
            "interest_data._id": 1,
            "interest_data.name": 1,
          },
        },
      ]);
      return result;
    } catch (error) {
      return error;
    }
  }

  /*
   * Name of the Method : updateUser
   * Description : update User details
   */
  async updateUser(where, updObj) {
    try {
      return await UserSchema.updateOne(where, { $set: updObj });
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  async hardDeleteOne(where) {
    try {
      let result = await UserSchema.deleteOne(where);
      return result;
    } catch (error) {
      console.log(error, "error ");
      return error;
    }
  }

  async deleteAuthTokens(where) {
    try {
      let result = await JWTTokenSchema.deleteOne(where);
      return result;
    } catch (error) {
      console.log(error, "error ");
      return error;
    }
  }

  async verifyToken(where) {
    try {
      return await JWTTokenSchema.findOne(where);
    } catch (error) {
      return error;
    }
  }
}

module.exports = new UserModel();
