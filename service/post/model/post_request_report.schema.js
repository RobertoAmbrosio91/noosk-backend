const mongoose = require('mongoose');
const CC = require('../../../config/constant_collection');
const timestamp = require('mongoose-timestamp');
const CONSTANTS = require("../../../config/constant");

const PostRequestReportSchema = new mongoose.Schema({
  report_by:{
    type: mongoose.Schema.Types.ObjectId,
    ref: CC.U001_USERS,
    require: true,
    index: true
  },
  post_request_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: CC.U001D_POST_REQUESTS,
    index: true
  },
  report_message:{
    type: mongoose.Schema.Types.String,
    require: true,
  },
  is_deleted: {
    type: mongoose.Schema.Types.Boolean,
    default: false,
    index: true
  }
});

PostRequestReportSchema.plugin(timestamp);
const PostRequestReportModel = mongoose.model(CC.U001DA_POST_REQUEST_REPORTS,PostRequestReportSchema);
module.exports = PostRequestReportModel;