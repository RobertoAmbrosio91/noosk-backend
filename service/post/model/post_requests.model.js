"use strict";
const PostRequestsSchema = require("./post_requests.schema");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const CC = require("../../../config/constant_collection");



class PostRequestsModel {
  constructor() {
    this.DB = require("../../../config/dbm");
    this.projectedKeys = {
      crtd_dt: true,
    };
  }

  async createPostRequests(postData) {
    try {
      let post = new PostRequestsSchema(postData);
      const result = await post.save();
      return result;
    } catch (error) {
      console.log(error, "error ");
      return error;
    }
  }

  async countPosts(where) {
    try {
      let result = await PostRequestsSchema.find(where).count();

      return result;
    } catch (error) {
      console.log(error, "error ");
      return error;
    }
  }

  async getAllPost(whereObj, pagination) {
    try {
      return await PostRequestsSchema.aggregate([
        {
          $match: whereObj,
        },
        {
          $lookup: {
            from: CC.U001_USERS,
            localField: "post_by",
            foreignField: "_id",
            as: "post_by_data",
          },
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
        // {
        //   "$lookup": {
        //     "from": CC.U001CA_POST_VOTES,
        //     "localField": "_id",
        //     "foreignField": "post_id",
        //     "as": "vote_data"
        //   }
        // },
        /* {
          $unwind: {
            path: "$vote_data",
            preserveNullAndEmptyArrays: true
          }
        }, */
        /* {
          $lookup: {
            from: CC.U001_USERS,
            localField: "vote_data.vote_by",
            foreignField: "_id",
            as: "vote_data.user_data",
          }
        }, */

        {
          $project: {
            post_by: 1,
            title: 1,
            description: 1,
            images: 1,
            videos: 1,
            type: 1,
            background_color: 1,
            createdAt: 1,
            "post_by_data.first_name": 1,
            "post_by_data.middle_name": 1,
            "post_by_data.last_name": 1,
            "post_by_data.email": 1,
            "post_by_data.user_name": 1,
            "post_by_data._id": 1,
            "category_data._id": 1,
            "category_data.name": 1,
            "subcategory_data._id": 1,
            "subcategory_data.name": 1,
            // "vote_data.vote_by":1,
            // "vote_data.type":1,
            // "vote_data._id":1,

            // "vote_data.user_data.first_name":1,
            // "vote_data.user_data.middle_name":1,
            // "vote_data.user_data.last_name":1,
            // "vote_data.user_data.user_name":1,
            // "vote_data.total_vote":{"$size":"$vote_data.user_data"}
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $skip:
            pagination.no_of_docs_each_page * pagination.current_page_number,
        },
        { $limit: pagination.no_of_docs_each_page },
      ]);
    } catch (error) {
      return error;
    }
  }

  async getPostByCategory(filter, pagination) {
    try {
      return await PostRequestsSchema.aggregate([
        {
          $match: filter,
        },
        {
          $lookup: {
            from: CC.U001_USERS,
            localField: "post_by",
            foreignField: "_id",
            as: "post_by_data",
          },
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
          $project: {
            post_by: 1,
            title: 1,
            description: 1,
            images: 1,
            videos: 1,
            type: 1,
            background_color: 1,
            createdAt: 1,
            "post_by_data.first_name": 1,
            "post_by_data.middle_name": 1,
            "post_by_data.last_name": 1,
            "post_by_data.email": 1,
            "post_by_data.user_name": 1,
            "post_by_data._id": 1,
            "category_data._id": 1,
            "category_data.name": 1,
            "subcategory_data._id": 1,
            "subcategory_data.name": 1,
            // "vote_data.vote_by":1,
            // "vote_data.type":1,
            // "vote_data._id":1,

            // "vote_data.user_data.first_name":1,
            // "vote_data.user_data.middle_name":1,
            // "vote_data.user_data.last_name":1,
            // "vote_data.user_data.user_name":1,
            // "vote_data.total_vote":{"$size":"$vote_data.user_data"}
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $skip:
            pagination.no_of_docs_each_page * pagination.current_page_number,
        },
        { $limit: pagination.no_of_docs_each_page },
      ]);
    } catch (error) {
      return error;
    }
  }

  async getOne(where) {
    try {
      let result = await PostRequestsSchema.findOne(where);
      return result;
    } catch (error) {
      console.log(error, "error ");
      return error;
    }
  }

  async deleteRequestOne(where) {
    try {
      let result = await PostRequestsSchema.deleteOne(where);
      return result;
    } catch (error) {
      console.log(error, "error ");
      return error;
    }
  }

  async deleteRequestMany(where) {
    try {
      let result = await PostRequestsSchema.deleteMany(where);
      return result;
    } catch (error) {
      console.log(error, "error ");
      return error;
    }
  }
}

module.exports = new PostRequestsModel();
