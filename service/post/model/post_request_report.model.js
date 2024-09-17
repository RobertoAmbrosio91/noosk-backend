"use strict";
const PostRequestReportModel = require('./post_request_report.schema');
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const CC = require("../../../config/constant_collection");



class ReqortRequestModel {
  constructor() {
    this.DB = require("../../../config/dbm");
    this.projectedKeys = {
      crtd_dt: true,
    };
  }

  async createRequestReport(postData) {
    try {
      let post = new PostRequestReportModel(postData);
      const result = await post.save();
      return result;
    } catch (error) {
      return error;
    }
  }

  async getOne(where){
    try {
      let result = await PostRequestReportModel.findOne(where);
      
      return result;
    } catch (error) {
      console.log(error, "error ");
      return error;
    }
  }

  async countRequestReport(where){
    try {
      let result = await PostRequestReportModel.find(where).count();
      
      return result;
    } catch (error) {
      console.log(error, "error ");
      return error;
    }
  }

  async hardDelete(where){
    try {
      let result = await PostRequestReportModel.deleteMany(where);      
      return result;
    } catch (error) {
      console.log(error, "error ");
      return error;
    }
  }

  async getAllPostRequestReport(whereObj, pagination) {
    try {
      return await PostRequestReportModel.aggregate([
        {
          $match:whereObj
        },
        {
          "$lookup": {
            "from": CC.U001_USERS,
            "localField": "report_by",
            "foreignField": "_id",
            "as": "report_by_data"
          }
        },
        
        {
          $project:{
            vote_by:1,
            createdAt:1,
            "report_by_data.first_name":1,
            "report_by_data.middle_name":1,
            "report_by_data.last_name":1,
            "report_by_data.email":1,
            "report_by_data.user_name":1,
            "report_by_data._id":1
          }
        },
        { $skip : pagination.no_of_docs_each_page * pagination.current_page_number }, 
        { $limit : pagination.no_of_docs_each_page }
      ]);
    } catch (error) {
      return error;
    }
  }
  
}

module.exports = new ReqortRequestModel();
