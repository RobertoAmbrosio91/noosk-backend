const mongoose = require('mongoose');
const CC = require('../../../config/constant_collection');
const timestamp = require('mongoose-timestamp');
const CONSTANTS = require("../../../config/constant");

const UpVoteSchema = new mongoose.Schema({
  vote_by:{
    type: mongoose.Schema.Types.ObjectId,
    ref: CC.U001_USERS,
    require: true,
    index: true
  },
  post_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: CC.U001C_POSTS,
    index: true
  },
  type:{
    type: mongoose.Schema.Types.String,
    enum:CONSTANTS.VOTE_TYPES,
    require: true,
  },
  is_deleted: {
    type: mongoose.Schema.Types.Boolean,
    default: false,
    index: true
  }
});

UpVoteSchema.plugin(timestamp);
const UpVoteModel = mongoose.model(CC.U001CA_POST_VOTES,UpVoteSchema);
module.exports = UpVoteModel;