const mongoose = require('mongoose');
const CC = require('../../../config/constant_collection');
const timestamp = require('mongoose-timestamp');
const bcrypt = require('bcrypt');

const PostSchema = new mongoose.Schema({
  post_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: CC.U001_USERS,
    require: true,
    index: true,
  },
  request_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: CC.U001D_POST_REQUESTS,
    index: true,
  },
  title: {
    type: mongoose.Schema.Types.String,
  },
  description: {
    type: mongoose.Schema.Types.String,
  },
  images: {
    type: [mongoose.Schema.Types.String],
  },
  videos: {
    type: [mongoose.Schema.Types.String],
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: CC.M002_CATEGORY,
    index: true,
  },
  subcategory_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: CC.M002A_SUBCATEGORY,
    index: true,
  },
  type: {
    type: mongoose.Schema.Types.String,
    enum: ["text", "image", "video"],
    required: true,
    index: true,
  },
  background_color: {
    type: mongoose.Schema.Types.String,
    default: "",
  },
  is_deleted: {
    type: mongoose.Schema.Types.Boolean,
    default: false,
    index: true,
  },
  type_of_post: {
    type: mongoose.Schema.Types.String,
  },
  post_source: {
    type: mongoose.Schema.Types.String,
  },
});

PostSchema.plugin(timestamp);
const PostModel = mongoose.model(CC.U001C_POSTS,PostSchema);
module.exports = PostModel;