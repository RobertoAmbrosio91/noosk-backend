const moment = require('moment');
const util = require('../../../utils/response');
const message = require('../../../utils/messages.json');
const CONSTANTS = require("../../../config/constant");
const { ObjectId } = require('mongodb');
const PostModel = require("../../post/model/post.model");
const UpVoteModel = require("../../post/model/upvote.model");
const CategoryModel = require('../../master/model/category.model');
const SubcategoryModel = require('../../master/model/subcategory.model');
const PostRequestsModel = require("../../post/model/post_requests.model");
const PostReportModel = require('../model/post_report.model');
const PostRequestReportModel = require('../model/post_request_report.model');
const uploadHelper = require('../../../utils/upload');
const userModel = require('../../user/model/user.model');
const pushNotification = require("../../../utils/push-notification");
const FirebaseTokenModel = require("../../user/model/firebase_token.model");
const NotificationModel = require("../../user/model/notification.model");
const UserBlockModel = require('../../user/model/user-block.model');
const BlockHelper = require("./../../../utils/block-users");
const mailer = require('../../../utils/mailer');

let io;
class PostHandler {
  setIo(socketIOInstance) {
    io = socketIOInstance;
  }

  async createPost(request, response) {
    const types = ["text", "image", "video"];

    try {
      let insObj = {};
      insObj.post_by = new ObjectId(request.user._id);

      //adding the type of post Roberto
      if (request.body.type_of_post) {
        insObj.type_of_post = request.body.type_of_post.trim();
      }

      if (request.body.post_source) {
        insObj.post_source = request.body.post_source.trim();
      }

      if (
        !request.body.title ||
        (request.body.title && !request.body.title.trim())
      ) {
        return response
          .status(400)
          .json(util.error({}, message.title_is_required));
      } else {
        insObj.title = request.body.title.trim();
      }

      if (
        !request.body.description ||
        (request.body.description && !request.body.description.trim())
      ) {
        return response
          .status(400)
          .json(util.error({}, message.description_is_required));
      } else {
        insObj.description = request.body.description.trim();
      }
      if (
        request.body.category_id &&
        ObjectId.isValid(request.body.category_id)
      ) {
        // return response.status(400).json(util.error({}, message.category_id_is_required));
        insObj.category_id = new ObjectId(request.body.category_id);
      }

      if (
        request.body.subcategory_id &&
        ObjectId.isValid(request.body.subcategory_id)
      ) {
        insObj.subcategory_id = new ObjectId(request.body.subcategory_id);
        // return response.status(400).json(util.error({}, message.subcategory_id_is_required));
      }

      if (!request.body.type || !types.includes(request.body.type.trim())) {
        return response.status(422).json(util.error({}, message.invalid_type));
      } else {
        insObj.type = request.body.type.trim();
      }

      if (request.body.images && Array.isArray(request.body.images)) {
        insObj.images = request.body.images;
      }

      if (request.body.videos && Array.isArray(request.body.videos)) {
        insObj.videos = request.body.videos;
      }

      if (request.body.background_color) {
        insObj.background_color = request.body.background_color;
      }

      if (
        typeof request.body.request_id != "undefined" &&
        ObjectId.isValid(request.body.request_id)
      ) {
        insObj.request_id = new ObjectId(request.body.request_id);
      }

      const post = await PostModel.createPosts(insObj);

      if (post && post._id) {
        let getUser = await userModel.getOne({
          _id: new ObjectId(request.user._id),
          is_deleted: false,
        });

        let userUpdate = {};

        let postDates = await PostModel.checkStreak({
          post_by: new ObjectId(request.user._id),
          is_deleted: false,
        });

        let totalPost = await PostModel.countPosts({
          post_by: new ObjectId(request.user._id),
          is_deleted: false,
        });

        if (
          !getUser.first_post_badge ||
          (getUser.first_post_badge && !getUser.first_post_badge.toShow)
        ) {
          userUpdate["first_post_badge.toShow"] = true;
          userUpdate["first_post_badge.isShown"] = false;
        }

        if (
          typeof request.body.request_id != "undefined" &&
          ObjectId.isValid(request.body.request_id)
        ) {
          userUpdate["good_fella_award.completed"] = true;
          if (
            typeof getUser.good_fella_award == "object" &&
            getUser.good_fella_award instanceof Map &&
            getUser.good_fella_award.has("count")
          ) {
            userUpdate["good_fella_award.count"] =
              getUser.good_fella_award.get("count") + 1;
          } else {
            userUpdate["good_fella_award.count"] = 1;
          }
        }

        if (
          !getUser.post_streak ||
          (getUser.post_streak && !getUser.post_streak.streak_2)
        ) {
          let strike2Dates = [];
          for (let i = 0; i < 2; i++) {
            strike2Dates.push(
              moment(new Date()).subtract(i, "day").format("YYYY-MM-DD")
            );
          }
          let isStreak = postDates.filter((pt) =>
            strike2Dates.includes(pt._id)
          );
          if (isStreak && Array.isArray(isStreak) && isStreak.length == 2) {
            userUpdate["post_streak.streak_2"] = {
              completed: true,
              count: 1,
            };
          }
        }

        if (
          !getUser.post_streak ||
          (getUser.post_streak && !getUser.post_streak.streak_3)
        ) {
          let strike3Dates = [];
          for (let i = 0; i < 3; i++) {
            strike3Dates.push(
              moment(new Date()).subtract(i, "day").format("YYYY-MM-DD")
            );
          }
          let isStreak = postDates.filter((pt) =>
            strike3Dates.includes(pt._id)
          );
          if (isStreak && Array.isArray(isStreak) && isStreak.length == 3) {
            userUpdate["post_streak.streak_3"] = {
              completed: true,
              count: 1,
            };
          }
        }

        if (
          !getUser.post_streak ||
          (getUser.post_streak && !getUser.post_streak.streak_3)
        ) {
          let strike7Dates = [];
          for (let i = 0; i < 7; i++) {
            strike7Dates.push(
              moment(new Date()).subtract(i, "day").format("YYYY-MM-DD")
            );
          }
          let isStreak = postDates.filter((pt) =>
            strike7Dates.includes(pt._id)
          );
          if (isStreak && Array.isArray(isStreak) && isStreak.length == 7) {
            userUpdate["post_streak.streak_7"] = {
              completed: true,
              count: 1,
            };
          }
        }

        if (totalPost && totalPost > 9) {
          userUpdate["tenth_post_badge.toShow"] = true;
        }

        if (totalPost && totalPost > 19) {
          userUpdate["twenty_post_badge.toShow"] = true;
        }

        if (totalPost && totalPost > 49) {
          userUpdate["fifty_post_badge.toShow"] = true;
        }

        if (totalPost && totalPost > 99) {
          userUpdate["hundred_post_badge.toShow"] = true;
        }

        if (userUpdate && Object.keys(userUpdate).length > 0) {
          let updateUser = await userModel.updateUser(
            {
              _id: new ObjectId(request.user._id),
            },
            userUpdate
          );
        }
      }

      let subCat = await SubcategoryModel.getOne({
        _id: new ObjectId(request.body.subcategory_id),
        is_deleted: false,
      });

      let getSubCatUser = await userModel.getByKeys({
        subcategory_id: new ObjectId(request.body.subcategory_id),
        _id: { $nin: [new ObjectId(request.user._id)] },
        is_deleted: false,
      });

      if (getSubCatUser && getSubCatUser.length > 0) {
        for (let su of getSubCatUser) {
          let tokens = await FirebaseTokenModel.findByKey({
            user_id: su._id,
            is_deleted: false,
          });

          if (tokens && tokens.length > 0) {
            let notificationData = {
              tokens: tokens.map((rs) => rs.token),
              title: `New post is created in ${subCat.name}`,
              body: `Dear ${su.first_name} ${
                su.middle_name ? su.middle_name + " " : ""
              }${su.last_name}, Other users are sharing knowledge in ${
                subCat.name
              }. Keep the knowledge-sharing spirit alive by adding your content. Tap to Share Now.`,
              data: {
                type: "Post Create",
                post_id: post._id,
              },
            };

            let sendRs = await pushNotification.sendMulticast(notificationData);

            if (
              sendRs &&
              sendRs.results &&
              sendRs.successCount &&
              sendRs.successCount > 0
            ) {
              let insObject = [];

              insObject.push({
                user_id: request.user._id,
                receiver_id: su._id,
                title: notificationData.title,
                message: notificationData.body,
                data_message: notificationData.data,
                is_read: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              let addNotification =
                await NotificationModel.createManyNotifications(insObject);

              getSubCatUser.forEach((user) => {
                const roomId = user._id.toString();
                io.to(roomId).emit("new_notification", {});
              });
            }
          }

          /* if(su && su.email){
            await mailer.sendmailUsingOptions({
              to:su.email,
              subject:`New post is created in ${subCat.name}`,
              html:`Dear ${su.first_name} ${su.middle_name ? su.middle_name+' ' : ''}${su.last_name}, Other users are sharing knowledge in ${subCat.name}. Keep the knowledge-sharing spirit alive by adding your content. Tap to Share Now.`
            });
          } */
        }
      }

      return response
        .status(200)
        .json(util.success(post, message.post_created_success));
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_creation_failed));
    }
  }

  async listPosts(request, response) {
    try {
      const userId = request.body.user_id
        ? new ObjectId(request.body.user_id)
        : request.user._id;

      let blockIds = await BlockHelper.getBlockUser(userId);
      let categoryId =
        request.user.category_id.length > 0 ? request.user.category_id : [];

      let where = {
        // category_id:{$in:categoryId},
        is_deleted: false,
      };

      if (
        request.body.request_id &&
        ObjectId.isValid(request.body.request_id)
      ) {
        where.request_id = new ObjectId(request.body.request_id);
      }

      if (request.body.user_id && ObjectId.isValid(request.body.user_id)) {
        where.post_by = new ObjectId(request.body.user_id);
      }

      if (blockIds && blockIds.length > 0) {
        where["$and"] = [
          {
            post_by: {
              $nin: blockIds,
            },
          },
        ];
      }

      const pagination = {
        no_of_docs_each_page: request.body.no_of_docs_each_page
          ? Number(request.body.no_of_docs_each_page)
          : 2,
        current_page_number:
          typeof request.body.current_page != "undefined"
            ? Number(request.body.current_page)
            : 0,
      };

      let posts = await PostModel.getAllPost(where, pagination);
      const postCount = await PostModel.countPosts(where);
      let totalAppreciations = 0;
      let requestHelped = 0;
      if (posts && posts.length > 0) {
        posts = posts.map((post) => {
          if (post.vote_data) {
            let post_data = CONSTANTS.VOTE_TYPES.map((typ) => {
              let vote = post.vote_data.filter((vdata) => {
                return vdata.type === typ;
              });
              totalAppreciations += vote.length;

              let isVoted = vote.filter(
                (vt) =>
                  vt.vote_by.toString() === request.user._id.toString() &&
                  vt.type === typ
              );

              return {
                type: typ,
                total_vote: vote.length,
                voted: isVoted && isVoted.length > 0 ? true : false,
              };
            });

            post.vote_data = post_data;
          }

          if (post.request_id) {
            requestHelped++;
          }

          return post;
        });
      }
      let responseData = {
        posts: posts,
        total_posts: postCount,
        total_appreciations: totalAppreciations,
        request_helped: requestHelped,
      };

      return response
        .status(200)
        .json(util.success(responseData, message.list_all_post_success));
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_fetch_error));
    }
  }

  async listPostsNoToken(request, response) {
    try {
      const pagination = {
        no_of_docs_each_page: request.body.no_of_docs_each_page
          ? Number(request.body.no_of_docs_each_page)
          : 2,
        current_page_number:
          typeof request.body.current_page != "undefined"
            ? Number(request.body.current_page)
            : 0,
      };
      let where = {
        is_deleted: false,
      };
      let posts = await PostModel.getAllPost(where, pagination);
      let responseData = {
        posts: posts,
      };

      return response
        .status(200)
        .json(util.success(responseData, message.list_all_post_success));
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_fetch_error));
    }
  }

  async getPostDetails(request, response) {
    try {
      if (
        typeof request.params.post_id == "undefined" ||
        (request.params.post_id && !ObjectId.isValid(request.params.post_id))
      ) {
        return response
          .status(400)
          .json(util.error({}, message.post_id_is_empty));
      } else {
        let postWhere = {
          _id: new ObjectId(request.params.post_id),
        };

        const pagination = {
          no_of_docs_each_page: 1,
          current_page_number: 0,
        };

        let posts = await PostModel.getAllPost(postWhere, pagination);

        if (posts && posts.length > 0) {
          posts = posts.map((post) => {
            if (post.vote_data) {
              let post_data = CONSTANTS.VOTE_TYPES.map((typ) => {
                let vote = post.vote_data.filter((vdata) => {
                  return vdata.type === typ;
                });

                let isVoted = vote.filter(
                  (vt) =>
                    vt.vote_by.toString() === request.user._id.toString() &&
                    vt.type === typ
                );

                return {
                  type: typ,
                  total_vote: vote.length,
                  voted: isVoted && isVoted.length > 0 ? true : false,
                };
              });

              post.vote_data = post_data;
            }
            return post;
          });
        }

        if (posts && posts.length > 0) {
          return response
            .status(200)
            .json(util.success(posts[0], message.post_details_sucessfully));
        } else {
          return response
            .status(400)
            .json(util.error({}, message.post_id_is_not_valid));
        }
      }
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_id_is_not_valid));
    }
  }

  async listOwnedPosts(request, response) {
    if (!request.body.user_id || !ObjectId.isValid(request.body.user_id)) {
      return response
        .status(400)
        .json(util.error([], message.user_id_is_empty));
    } else {
      request.body.user_id = request.body.user_id;
      return this.listPosts(request, response);
    }
  }

  async searchPosts(request, response) {
    try {
      const userId = request.body.user_id
        ? new ObjectId(request.body.user_id)
        : request.user._id;

      let blockIds = await BlockHelper.getBlockUser(userId);
      let where = { $and: [{ is_deleted: false }] };

      if (
        Array.isArray(request.body.category_id) &&
        request.body.category_id.length > 0
      ) {
        where["$and"].push({
          category_id: {
            $in: request.body.category_id.map((cat) => new ObjectId(cat)),
          },
        });
      }

      if (
        Array.isArray(request.body.subcategory_id) &&
        request.body.subcategory_id.length > 0
      ) {
        where["$and"].push({
          subcategory_id: {
            $in: request.body.subcategory_id.map((scat) => new ObjectId(scat)),
          },
        });
      }

      if (
        typeof request.body.search != "undefined" &&
        String(request.body.search).trim()
      ) {
        where["$and"].push({
          $or: [
            {
              title: {
                $regex: request.body.search.toLowerCase(),
                $options: "i",
              },
            },
            {
              description: {
                $regex: request.body.search.toLowerCase(),
                $options: "i",
              },
            },
          ],
        });
      }

      if (blockIds && blockIds.length > 0) {
        where["$and"].push({
          post_by: {
            $nin: blockIds,
          },
        });
      }

      if (request.body.date) {
        let endDate = new Date(
          moment(request.body.date).endOf("day").toISOString()
        );
        let startDate = new Date(
          moment(request.body.date).startOf("day").toISOString()
        );
        where["$and"].push({
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        });
      }

      const pagination = {
        no_of_docs_each_page: request.body.no_of_docs_each_page
          ? Number(request.body.no_of_docs_each_page)
          : 2,
        current_page_number:
          typeof request.body.current_page != "undefined"
            ? Number(request.body.current_page)
            : 0,
      };

      let posts = await PostModel.getAllPost(where, pagination);
      const postCount = await PostModel.countPosts(where);
      if (posts && posts.length > 0) {
        posts = posts.map((post) => {
          if (post.vote_data) {
            let post_data = CONSTANTS.VOTE_TYPES.map((typ) => {
              let vote = post.vote_data.filter((vdata) => {
                return vdata.type === typ;
              });

              let isVoted = vote.filter(
                (vt) =>
                  vt.vote_by.toString() === request.user._id.toString() &&
                  vt.type === typ
              );

              return {
                type: typ,
                total_vote: vote.length,
                voted: isVoted && isVoted.length > 0 ? true : false,
              };
            });

            post.vote_data = post_data;
          }
          return post;
        });
      }
      let responseData = {
        posts: posts,
        total_posts: postCount,
      };

      return response
        .status(200)
        .json(util.success(responseData, message.list_all_post_success));
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_fetch_error));
    }
  }
  //-------------------------------//

  async listPersonalizedPosts(request, response) {
    try {
      const userId = request.body.user_id
        ? new ObjectId(request.body.user_id)
        : request.user._id;

      let blockIds = await BlockHelper.getBlockUser(userId);

      let filter = {
        is_deleted: false,
      };

      const { subcategory_id: subcategory_ids, interest_id: interest_ids } =
        request.body;

      if (
        (subcategory_ids && !Array.isArray(subcategory_ids)) ||
        (interest_ids && !Array.isArray(interest_ids))
      ) {
        return response.status(400).json({
          error:
            "Both subcategory_id and interest_id must be arrays if provided",
        });
      }

      let combined = [];

      if (Array.isArray(subcategory_ids)) {
        combined = [...combined, ...subcategory_ids];
      }

      if (Array.isArray(interest_ids)) {
        combined = [...combined, ...interest_ids];
      }

      combined = [...new Set(combined)];

      if (combined.length > 0) {
        filter.subcategory_id = { $in: combined.map((id) => new ObjectId(id)) };
      }

      if (blockIds && blockIds.length > 0) {
        filter["$and"] = [
          {
            post_by: {
              $nin: blockIds,
            },
          },
        ];
      }

      const pagination = {
        no_of_docs_each_page: request.body.no_of_docs_each_page
          ? Number(request.body.no_of_docs_each_page)
          : 2,
        current_page_number:
          typeof request.body.current_page != "undefined"
            ? Number(request.body.current_page)
            : 0,
      };

      let posts = await PostModel.getPostsBySubCategoryAndInterests(
        filter,
        pagination
      );
      const postCount = await PostModel.countPosts(filter);

      if (posts && posts.length > 0) {
        posts = posts.map((post) => {
          if (post.vote_data) {
            let post_data = CONSTANTS.VOTE_TYPES.map((typ) => {
              let vote = post.vote_data.filter((vdata) => {
                return vdata.type === typ;
              });

              let isVoted = vote.filter(
                (vt) =>
                  vt.vote_by.toString() === request.user._id.toString() &&
                  vt.type === typ
              );

              return {
                type: typ,
                total_vote: vote.length,
                voted: isVoted && isVoted.length > 0 ? true : false,
              };
            });

            post.vote_data = post_data;
          }
          return post;
        });
      }

      let responseData = {
        posts: posts,
        total_posts: postCount,
      };

      return response
        .status(200)
        .json(util.success(responseData, message.list_all_post_success));
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_fetch_error));
    }
  }

  //-------------------------------//

  async deletePost(request, response) {
    try {
      if (
        typeof request.params.post_id == "undefined" ||
        (request.params.post_id && !ObjectId.isValid(request.params.post_id))
      ) {
        return response
          .status(400)
          .json(util.error({}, message.post_id_is_empty));
      } else {
        let postWhere = {
          _id: new ObjectId(request.params.post_id),
        };
        let getPostData = await PostModel.getOne(postWhere);

        if (getPostData && getPostData._id) {
          let delRs = await PostModel.deletePostOne(postWhere);
          if (delRs && delRs.deletedCount > 0) {
            let delVode = await UpVoteModel.hardDelete({
              post_id: new ObjectId(request.params.post_id),
            });

            if (
              getPostData &&
              getPostData.images &&
              getPostData.images.length > 0
            ) {
              for (let file of getPostData.images) {
                if (file.indexOf(process.env.CLOUD_FRONT_URL) > -1) {
                  let AWSKey = file.replace(process.env.CLOUD_FRONT_URL, "");
                  let delFile = await uploadHelper.deleteFile(AWSKey);
                }
              }
            }

            if (
              getPostData &&
              getPostData.videos &&
              getPostData.videos.length > 0
            ) {
              for (let file of getPostData.videos) {
                if (file.indexOf(process.env.CLOUD_FRONT_URL) > -1) {
                  let AWSKey = file.replace(process.env.CLOUD_FRONT_URL, "");
                  let delFile = await uploadHelper.deleteFile(AWSKey);
                }
              }
            }
          }

          return response
            .status(200)
            .json(util.success(delRs, message.post_deleted_success));
        } else {
          return response
            .status(400)
            .json(util.error({}, message.post_id_is_not_valid));
        }
      }
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_creation_failed));
    }
  }

  async upVote(request, response) {
    try {
      if (
        !request.body.post_id ||
        typeof request.body.post_id == "undefined" ||
        (request.body.post_id && !ObjectId.isValid(request.body.post_id))
      ) {
        return response
          .status(400)
          .json(util.error({}, message.post_id_is_required));
      } else if (
        typeof request.body.type == "undefined" ||
        request.body.type == "" ||
        !CONSTANTS.VOTE_TYPES.includes(request.body.type)
      ) {
        return response
          .status(400)
          .json(util.error({}, message.vote_type_is_required));
      } else {
        let postWhere = {
          _id: new ObjectId(request.body.post_id),
          is_deleted: false,
        };
        const postCount = await PostModel.countPosts(postWhere);

        if (postCount > 0) {
          let resVote = {};
          let checkVoteWhere = {
            vote_by: request.user._id,
            post_id: new ObjectId(request.body.post_id),
            // type: request.body.type,
            is_deleted: false,
          };
          let voteCount = await UpVoteModel.countVotes(checkVoteWhere);

          if (voteCount > 0) {
            let removeVote = await UpVoteModel.hardDelete(checkVoteWhere);
          }

          let addVote = await UpVoteModel.createUpvote({
            vote_by: request.user._id,
            post_id: new ObjectId(request.body.post_id),
            type: request.body.type,
          });
          resVote.added = true;
          resVote.data = addVote;

          let totalVoteCount = await UpVoteModel.countVotes({
            post_id: new ObjectId(request.body.post_id),
            type: request.body.type,
            is_deleted: false,
          });

          resVote.total_vote = totalVoteCount;

          let postData = await PostModel.getOne(postWhere);

          if (postData && postData._id) {
            let tokens = await FirebaseTokenModel.findByKey({
              user_id: postData.post_by,
              is_deleted: false,
            });

            /* const postBy = userModel.getOne({
              _id: postData.post_by,
            }); */

            if (tokens && tokens.length > 0) {
              let notificationData = {
                tokens: tokens.map((rs) => rs.token),
                title: `Upvote`,
                body: `${request.user.user_name} found your post ${request.body.type}`,
                data: {
                  type: "Post Upvote",
                  post_id: postData._id,
                },
              };

              let sendRs = await pushNotification.sendMulticast(
                notificationData
              );
              if (
                sendRs &&
                sendRs.results &&
                sendRs.successCount &&
                sendRs.successCount > 0
              ) {
                let insObject = [];
                insObject.push({
                  user_id: request.user._id,
                  receiver_id: postData.post_by,
                  title: notificationData.title,
                  message: notificationData.body,
                  data_message: notificationData.data,
                  is_read: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });

                let addNotification =
                  await NotificationModel.createManyNotifications(insObject);
                io.to(request.user._id.toString()).emit("new_notification", {});
              }
            }

            /* if(postBy && postBy.email){
              await mailer.sendmailUsingOptions({
                to:postBy.email,
                subject:`Upvote`,
                html:`${request.user.user_name} found your post ${request.body.type}`
              });
            } */
          }
          return response
            .status(200)
            .json(util.success(resVote, message.vote_added_successfully));
        } else {
          return response
            .status(400)
            .json(util.error({}, message.post_is_not_exists));
        }
      }
    } catch (error) {
      console.log(error, "error");
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_fetch_error));
    }
  }

  async upVoteRemove(request, response) {
    try {
      if (
        !request.body.post_id ||
        typeof request.body.post_id == "undefined" ||
        (request.body.post_id && !ObjectId.isValid(request.body.post_id))
      ) {
        return response
          .status(400)
          .json(util.error({}, message.post_id_is_required));
      } else if (
        typeof request.body.type == "undefined" ||
        request.body.type == "" ||
        !CONSTANTS.VOTE_TYPES.includes(request.body.type)
      ) {
        return response
          .status(400)
          .json(util.error({}, message.vote_type_is_required));
      } else {
        let checkVoteWhere = {
          vote_by: request.user._id,
          post_id: new ObjectId(request.body.post_id),
          type: request.body.type,
        };

        let removeVote = await UpVoteModel.hardDelete(checkVoteWhere);

        let totalVoteCount = await UpVoteModel.countVotes({
          post_id: new ObjectId(request.body.post_id),
          type: request.body.type,
          is_deleted: false,
        });

        let resVote = {};
        resVote.total_vote = totalVoteCount;
        resVote.added = false;
        return response
          .status(200)
          .json(util.success(resVote, message.vote_removed_successfully));
      }
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_fetch_error));
    }
  }

  async createPostRequest(request, response) {
    const types = ["text", "image", "video"];

    try {
      let insObj = {};
      insObj.post_by = new ObjectId(request.user._id);

      if (
        !request.body.title ||
        (request.body.title && !request.body.title.trim())
      ) {
        return response
          .status(400)
          .json(util.error({}, message.title_is_required));
      } else {
        insObj.title = request.body.title.trim();
      }

      if (
        !request.body.description ||
        (request.body.description && !request.body.description.trim())
      ) {
        return response
          .status(400)
          .json(util.error({}, message.description_is_required));
      } else {
        insObj.description = request.body.description.trim();
      }
      if (
        request.body.category_id &&
        ObjectId.isValid(request.body.category_id)
      ) {
        // return response.status(400).json(util.error({}, message.category_id_is_required));
        insObj.category_id = new ObjectId(request.body.category_id);
      }

      if (
        request.body.subcategory_id &&
        ObjectId.isValid(request.body.subcategory_id)
      ) {
        insObj.subcategory_id = new ObjectId(request.body.subcategory_id);
        // return response.status(400).json(util.error({}, message.subcategory_id_is_required));
      }

      if (!request.body.type || !types.includes(request.body.type.trim())) {
        return response.status(422).json(util.error({}, message.invalid_type));
      } else {
        insObj.type = request.body.type.trim();
      }

      if (request.body.images && Array.isArray(request.body.images)) {
        insObj.images = request.body.images;
      }

      if (request.body.videos && Array.isArray(request.body.videos)) {
        insObj.videos = request.body.videos;
      }

      if (request.body.background_color) {
        insObj.background_color = request.body.background_color;
      }

      const post = await PostRequestsModel.createPostRequests(insObj);

      if (post && post._id) {
        let getSubCatUser = await userModel.getByKeys({
          subcategory_id: new ObjectId(request.body.subcategory_id),
          _id: { $nin: [new ObjectId(request.user._id)] },
          is_deleted: false,
        });

        if (getSubCatUser && getSubCatUser.length > 0) {
          let subCat = await SubcategoryModel.getOne({
            _id: new ObjectId(request.body.subcategory_id),
            is_deleted: false,
          });

          let tokens = await FirebaseTokenModel.findByKey({
            user_id: { $in: getSubCatUser.map((u) => u._id) },
            is_deleted: false,
          });

          let notificationData = {
            tokens: tokens.map((rs) => rs.token),
            title: `New post request is created in ${subCat.name}`,
            body: `A new ${subCat.name} content request has just been added to the platform. Your expertise is sought after. Contribute your knowledge and help fellow enthusiasts in your field!`,
            data: {
              type: "Post request",
              request_id: post._id,
            },
          };

          let sendRs = await pushNotification.sendMulticast(notificationData);
          if (
            sendRs &&
            sendRs.results &&
            sendRs.successCount &&
            sendRs.successCount > 0
          ) {
            let insObject = [];

            getSubCatUser.forEach((user) => {
              insObject.push({
                user_id: request.user._id,
                receiver_id: user._id,
                title: notificationData.title,
                message: notificationData.body,
                data_message: notificationData.data,
                is_read: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            });

            let addNotification =
              await NotificationModel.createManyNotifications(insObject);

            getSubCatUser.forEach((user) => {
              const roomId = user._id.toString();
              io.to(roomId).emit("new_notification", {});
            });
          }

          /* let emails = getSubCatUser.map((user)=> user.email ? user.email : "");
          emails = emails.filter((em)=> em != "");
          if(emails && emails.length > 0){
            await mailer.sendmailUsingOptions({
              to:emails,
              subject:notificationData.title,
              html:notificationData.body
            });
          } */
        }
      }

      return response
        .status(200)
        .json(util.success(post, message.post_request_created_success));
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_creation_failed));
    }
  }

  async listPostRequest(request, response) {
    try {
      let categoryId =
        request.user.category_id.length > 0 ? request.user.category_id : [];
      const userId = request.body.user_id
        ? new ObjectId(request.body.user_id)
        : request.user._id;

      let blockIds = await BlockHelper.getBlockUser(userId);
      let where = {
        // category_id:{$in:categoryId},
        is_deleted: false,
      };

      if (request.body.user_id && ObjectId.isValid(request.body.user_id)) {
        where.post_by = new ObjectId(request.body.user_id);
      }

      if (blockIds && blockIds.length > 0) {
        where["$and"] = [
          {
            post_by: {
              $nin: blockIds,
            },
          },
        ];
      }

      const pagination = {
        no_of_docs_each_page: request.body.no_of_docs_each_page
          ? Number(request.body.no_of_docs_each_page)
          : 2,
        current_page_number:
          typeof request.body.current_page != "undefined"
            ? Number(request.body.current_page)
            : 0,
      };

      let posts = await PostRequestsModel.getAllPost(where, pagination);
      const postCount = await PostRequestsModel.countPosts(where);
      /* if(posts && posts.length > 0){
        posts = posts.map((post)=>{
          if(post.vote_data){
            let post_data = CONSTANTS.VOTE_TYPES.map((typ)=> {
              let vote = post.vote_data.filter(vdata=>{
                return vdata.type === typ
              })
              return {type:typ, total_vote:vote.length}
            });
            
            post.vote_data = post_data
            
          }
          return post;
        });
      } */
      let responseData = {
        posts: posts,
        total_posts: postCount,
      };

      return response
        .status(200)
        .json(
          util.success(responseData, message.list_all_post_request_success)
        );
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_fetch_error));
    }
  }

  async listPostsRequestByCategory(request, response) {
    try {
      const userId = request.body.user_id
        ? new ObjectId(request.body.user_id)
        : request.user._id;

      let blockIds = await BlockHelper.getBlockUser(userId);

      let filter = {
        is_deleted: false,
      };

      const { subcategory_id: subcategory_ids } = request.body;
      if (subcategory_ids && !Array.isArray(subcategory_ids)) {
        return response.status(400).json({
          error: "subcategory_id must be arrays if provided",
        });
      }
      if (subcategory_ids.length > 0) {
        filter.subcategory_id = {
          $in: subcategory_ids.map((id) => new ObjectId(id)),
        };
      }
      if (blockIds && blockIds.length > 0) {
        filter["$and"] = [
          {
            post_by: {
              $nin: blockIds,
            },
          },
        ];
      }

      const pagination = {
        no_of_docs_each_page: request.body.no_of_docs_each_page
          ? Number(request.body.no_of_docs_each_page)
          : 2,
        current_page_number:
          typeof request.body.current_page != "undefined"
            ? Number(request.body.current_page)
            : 0,
      };
      let posts = await PostRequestsModel.getPostByCategory(filter, pagination);
      const postCount = await PostRequestsModel.countPosts(filter);

      let responseData = {
        posts: posts,
        total_posts: postCount,
      };

      return response
        .status(200)
        .json(
          util.success(responseData, message.list_all_post_request_success)
        );
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_fetch_error));
    }
  }

  async listOwnedPostRequest(request, response) {
    if (!request.body.user_id || !ObjectId.isValid(request.body.user_id)) {
      return response
        .status(400)
        .json(util.error([], message.user_id_is_empty));
    } else {
      request.body.user_id = request.body.user_id;
      return await this.listPostRequest(request, response);
    }
  }

  async postRequestRepliesList(request, response) {
    try {
      if (
        typeof request.body.request_id == "undefined" ||
        !request.body.request_id ||
        (request.body.request_id && !ObjectId.isValid(request.body.request_id))
      ) {
        return response
          .status(400)
          .json(util.error([], message.request_id_is_empty));
      } else {
        return await this.listPosts(request, response);
      }
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_creation_failed));
    }
  }

  async deletePostRequest(request, response) {
    try {
      if (
        typeof request.params.request_id == "undefined" ||
        (request.params.request_id &&
          !ObjectId.isValid(request.params.request_id))
      ) {
        return response
          .status(400)
          .json(util.error({}, message.request_id_is_empty));
      } else {
        let reqWhere = {
          _id: new ObjectId(request.params.request_id),
        };

        let getReqData = await PostRequestsModel.getOne(reqWhere);

        if (getReqData && getReqData._id) {
          let delRs = await PostRequestsModel.deleteRequestOne(reqWhere);

          if (delRs && delRs.deletedCount > 0) {
            let removeReqId = await PostModel.updatePostMany(
              {
                request_id: new ObjectId(request.params.request_id),
              },
              {
                request_id: null,
              }
            );

            if (
              getReqData &&
              getReqData.images &&
              getReqData.images.length > 0
            ) {
              for (let file of getReqData.images) {
                if (file.indexOf(process.env.CLOUD_FRONT_URL) > -1) {
                  let AWSKey = file.replace(process.env.CLOUD_FRONT_URL, "");
                  let delFile = await uploadHelper.deleteFile(AWSKey);
                }
              }
            }

            if (
              getReqData &&
              getReqData.videos &&
              getReqData.videos.length > 0
            ) {
              for (let file of getReqData.videos) {
                if (file.indexOf(process.env.CLOUD_FRONT_URL) > -1) {
                  let AWSKey = file.replace(process.env.CLOUD_FRONT_URL, "");
                  let delFile = await uploadHelper.deleteFile(AWSKey);
                }
              }
            }
          }

          return response
            .status(200)
            .json(util.success(delRs, message.post_request_deleted_success));
        } else {
          return response
            .status(400)
            .json(util.error({}, message.post_request_id_is_not_valid));
        }
      }
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_creation_failed));
    }
  }

  async getPostRequestDetails(request, response) {
    try {
      if (
        typeof request.params.request_id == "undefined" ||
        (request.params.request_id &&
          !ObjectId.isValid(request.params.request_id))
      ) {
        return response
          .status(400)
          .json(util.error({}, message.request_id_is_empty));
      } else {
        let reqWhere = {
          _id: new ObjectId(request.params.request_id),
        };

        const pagination = {
          no_of_docs_each_page: 1,
          current_page_number: 0,
        };

        let posts = await PostRequestsModel.getAllPost(reqWhere, pagination);

        let getReqData = await PostRequestsModel.getOne(reqWhere);

        if (posts && posts.length > 0) {
          return response
            .status(200)
            .json(
              util.success(posts[0], message.request_post_details_sucessfully)
            );
        } else {
          return response
            .status(400)
            .json(util.error({}, message.post_request_id_is_not_valid));
        }
      }
    } catch (error) {
      return response
        .status(400)
        .json(
          util.error({}, error.message || message.post_request_id_is_not_valid)
        );
    }
  }

  async reportPost(request, response) {
    try {
      if (
        typeof request.body.post_id == "undefined" ||
        (request.body.post_id && !ObjectId.isValid(request.body.post_id))
      ) {
        return response
          .status(400)
          .json(util.error({}, message.post_id_is_empty));
      } else if (
        typeof request.body.report_message == "undefined" ||
        (request.body.report_message &&
          request.body.report_message.trim() == "")
      ) {
        return response
          .status(400)
          .json(util.error({}, message.post_report_message_is_empty));
      } else {
        const checkWhere = {
          report_by: new ObjectId(request.user._id),
          post_id: new ObjectId(request.body.post_id),
        };

        let check = await PostReportModel.countReport(checkWhere);
        if (check > 0) {
          return response
            .status(200)
            .json(util.error({}, message.post_report_already_submitted));
        } else {
          const insObj = {
            report_by: new ObjectId(request.user._id),
            post_id: new ObjectId(request.body.post_id),
            report_message: request.body.report_message,
          };
          const insRs = await PostReportModel.createReport(insObj);
          return response
            .status(200)
            .json(util.success(insRs, message.post_report_submitted));
        }
      }
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_creation_failed));
    }
  }

  async reportRequestPost(request, response) {
    try {
      if (
        typeof request.body.post_request_id == "undefined" ||
        (request.body.post_request_id &&
          !ObjectId.isValid(request.body.post_request_id))
      ) {
        return response
          .status(400)
          .json(util.error({}, message.request_id_is_empty));
      } else if (
        typeof request.body.report_message == "undefined" ||
        (request.body.report_message &&
          request.body.report_message.trim() == "")
      ) {
        return response
          .status(400)
          .json(util.error({}, message.post_report_message_is_empty));
      } else {
        const checkWhere = {
          report_by: new ObjectId(request.user._id),
          post_request_id: new ObjectId(request.body.post_request_id),
        };

        let check = await PostRequestReportModel.countRequestReport(checkWhere);
        if (check > 0) {
          return response
            .status(200)
            .json(
              util.error({}, message.post_request_report_already_submitted)
            );
        } else {
          const insObj = {
            report_by: new ObjectId(request.user._id),
            post_request_id: new ObjectId(request.body.post_request_id),
            report_message: request.body.report_message,
          };
          const insRs = await PostRequestReportModel.createRequestReport(
            insObj
          );
          return response
            .status(200)
            .json(util.success(insRs, message.post_request_report_submitted));
        }
      }
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_creation_failed));
    }
  }

  async reportPostList(request, response) {
    try {
      let where = {};
      console.log(moment(request.body.from_date).startOf("D").toDate());
      if (typeof request.body.from_date != "undefined") {
        where.createdAt = {};
        where.createdAt["$gte"] = moment(request.body.from_date)
          .startOf("D")
          .toDate();
      }

      if (typeof request.body.to_date != "undefined") {
        if (typeof where.createdAt == "undefined") {
          where.createdAt = {};
        }
        where.createdAt["$lte"] = moment(request.body.to_date)
          .endOf("D")
          .toDate();
      }

      console.log(where, "where");

      let postReportList = await PostReportModel.getAllPostReport(where);
      console.log(postReportList, "postReportList");

      return response
        .status(200)
        .json(
          util.success(postReportList, message.post_request_report_submitted)
        );
    } catch (error) {
      console.log(error, "error");
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_creation_failed));
    }
  }

  async testNotification(request, response) {
    try {
      let tokens = await FirebaseTokenModel.findByKey({
        user_id: new ObjectId(request.user._id),
        is_deleted: false,
      });

      let sendRs = await pushNotification.sendMulticast({
        tokens: tokens.map((rs) => rs.token),
        title: "Test by yk 11",
        body: "---",
      });

      console.log(sendRs, "sendRs");

      return response
        .status(200)
        .json(util.success(sendRs, message.post_request_report_submitted));
    } catch (error) {
      console.log(error, "error");
      return response
        .status(400)
        .json(util.error({}, error.message || message.post_creation_failed));
    }
  }
}

module.exports = new PostHandler();