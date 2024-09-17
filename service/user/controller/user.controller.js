const fs = require("fs");
const CONSTANTS = require('../../../config/constant');
const util = require('../../../utils/response');
const mailer = require('../../../utils/mailer');
const message = require('../../../utils/messages.json');
const sanitizer = require("./../../../node_modules/sanitizer");
const userModel = require('../model/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const moment = require("moment")
const { ObjectId } = require('mongodb');
const helper = require('../../../utils/helper');
const AuthToken = require("../../../utils/auth_tokens");
const ResetPasswordModel = require('../model/reset.password.model');
const PostModel = require('../../post/model/post.model');
const PostRequestModel = require('../../post/model/post_requests.model');
const PostReportModel = require('../../post/model/post_report.model');
const UpVoteModel = require('../../post/model/upvote.model');
const PostRequestReportModel = require('../../post/model/post_request_report.model');
const FirebaseTokenModel = require('../model/firebase_token.model');
const EndorseModel = require('../model/endorse.model');
const uploadHelper = require('../../../utils/upload');
const logger = require("../../../config/winston");
const pushNotification = require("../../../utils/push-notification");

class UserHandler {
  async emailTest(request, response) {
    try {
      let emailRs = await mailer.sendmailUsingOptions({
        to: ["kothiyayogesh11@gmail.com", "jr.kothiya@yahoo.com"],
        subject: "Hello",
        html: "<h1>Yogesh</h1>",
      });
      console.log(emailRs);
      return response.send(emailRs);
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.error_message));
    }
  }

  async signup(request, response) {
    try {
      /* if (typeof request.body.user_name == "undefined" || (!request.body.user_name)) {
        return response.status(400).json(util.error({}, message.user_name_empty));
      } else */
      if (typeof request.body.email == "undefined" || !request.body.email) {
        return response
          .status(400)
          .json(util.error({}, message.email_address_empty));
      } else if (
        request.body.email &&
        !CONSTANTS.EMAIL_REGEX.test(request.body.email)
      ) {
        return response
          .status(400)
          .json(util.error({}, message.email_address_is_not_valid_format));
      } else if (
        !request.body.social_id &&
        (typeof request.body.password == "undefined" || !request.body.password)
      ) {
        return response
          .status(400)
          .json(util.error({}, message.password_is_empty));
      } else if (request.body.password && request.body.password.length < 6) {
        return response
          .status(400)
          .json(util.error({}, message.password_should_be_gte_6));
      } else {
        let checkEmail = await userModel.getOne({
          email: request.body.email.trim().toLowerCase(),
          is_deleted: false,
        });

        if (checkEmail && checkEmail._id)
          throw new Error("Email already exists");

        /* let checkUserName = await userModel.getOne({
          user_name: request.body.user_name.trim().toLowerCase(),
          is_deleted: false
        });

        if (checkUserName && checkUserName._id) throw new Error("Username is already taken"); */

        let userBody = {};
        if (request.body.first_name) {
          userBody.first_name = request.body.first_name.trim();
        }

        if (request.body.middle_name) {
          userBody.middle_name = request.body.middle_name.trim();
        }

        if (request.body.last_name) {
          userBody.last_name = request.body.last_name.trim();
        }

        if (request.body.user_name) {
          userBody.user_name = request.body.user_name.trim();
        }

        if (request.body.email) {
          userBody.email = request.body.email.trim();
        }

        if (request.body.gender) {
          userBody.gender = request.body.gender.trim();
        }

        if (request.body.social_id) {
          userBody.social_id = request.body.social_id;
          userBody.sign_up_type = request.body.sign_up_type;
        } else {
          if (request.body.password) {
            userBody.password = request.body.password;
          }
        }

        userBody.lastActive = new Date();

        const user = await userModel.createUser(userBody);

        let tokenRs = await AuthToken.signJWT({
          _id: user._id,
          email: user.email,
        });

        let createToken = await userModel.createToken({
          user_id: new ObjectId(user.id),
          token: tokenRs,
        });

        user.token = tokenRs;

        return response
          .status(200)
          .json(util.success(user, message.user_signup_success));
      }
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.error_message));
    }
  }

  async socialSignup(request, response) {
    try {
      if (
        !request.body.social_id &&
        (typeof request.body.email == "undefined" || !request.body.email)
      ) {
        return response
          .status(400)
          .json(util.error({}, message.email_address_empty));
      } else if (
        !request.body.social_id &&
        request.body.email &&
        !CONSTANTS.EMAIL_REGEX.test(request.body.email)
      ) {
        return response
          .status(400)
          .json(util.error({}, message.email_address_is_not_valid_format));
      } else if (!request.body.social_id) {
        return response
          .status(400)
          .json(util.error({}, message.social_id_is_empty));
      } else {
        let uUpdate = {};

        let userLoginWhere = {};
        if (
          request.body.social_id &&
          CONSTANTS.EMAIL_REGEX.test(request.body.email)
        ) {
          uUpdate.social_id = request.body.social_id;
          userLoginWhere.email = request.body.email.trim().toLowerCase();
        } else if (request.body.social_id && !request.body.email) {
          userLoginWhere.social_id = request.body.social_id;
        }
        userLoginWhere.is_deleted = false;

        const userRs = await userModel.getOne(userLoginWhere);

        if (!userRs) return await this.signup(request, response);

        if (request.body.social_id) {
          // if(request.body.social_id != userRs.social_id){
          //   throw new Error("Invalid social id");
          // }
        } else {
          if (
            !userRs.password ||
            (userRs.password &&
              !bcrypt.compareSync(request.body.password, userRs.password))
          ) {
            throw new Error("Invalid password");
          }
        }

        let tokenRs = await AuthToken.signJWT({
          _id: userRs._id,
          email: userRs.email,
        });

        let createToken = await userModel.createToken({
          user_id: new ObjectId(userRs.id),
          token: tokenRs,
        });

        userRs.token = tokenRs;
        return response
          .status(200)
          .json(util.success(userRs, message.user_signup_success));
      }
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.error_message));
    }
  }

  async login(request, response) {
    try {
      if (
        !request.body.social_id &&
        (request.body.email == "undefined" || !request.body.email)
      ) {
        return response
          .status(400)
          .json(util.error({}, message.email_address_empty));
      } else if (
        request.body.email &&
        !CONSTANTS.EMAIL_REGEX.test(request.body.email)
      ) {
        return response
          .status(400)
          .json(util.error({}, message.email_address_is_not_valid_format));
      } else if (
        !request.body.social_id &&
        (typeof request.body.password == "undefined" || !request.body.password)
      ) {
        return response
          .status(400)
          .json(util.error({}, message.password_is_empty));
      } else if (request.body.password && request.body.password.length < 6) {
        return response
          .status(400)
          .json(util.error({}, message.password_should_be_gte_6));
      } else {
        let uUpdate = {
          lastActive: new Date(),
        };

        let userLoginWhere = {};
        if (
          request.body.social_id &&
          CONSTANTS.EMAIL_REGEX.test(request.body.email)
        ) {
          uUpdate.social_id = request.body.social_id;
          userLoginWhere.email = request.body.email.trim().toLowerCase();
        } else if (request.body.social_id && !request.body.email) {
          userLoginWhere.social_id = request.body.social_id;
        } else {
          userLoginWhere.email = request.body.email.trim().toLowerCase();
        }
        userLoginWhere.is_deleted = false;

        const userRs = await userModel.getOne(userLoginWhere);

        if (!userRs) throw new Error("Invalid email address");

        if (request.body.social_id) {
          if (request.body.email) {
          } else {
            if (request.body.social_id != userRs.social_id) {
              throw new Error("Invalid social id");
            }
          }
        } else {
          if (
            !userRs.password ||
            (userRs.password &&
              !bcrypt.compareSync(request.body.password, userRs.password))
          ) {
            throw new Error("Invalid password");
          }
        }

        let tokenRs = await AuthToken.signJWT({
          _id: userRs._id,
          email: userRs.email,
        });

        let createToken = await userModel.createToken({
          user_id: new ObjectId(userRs.id),
          token: tokenRs,
        });

        let updDate = await userModel.updateUser(
          {
            _id: new ObjectId(userRs.id),
          },
          uUpdate
        );

        userRs.token = tokenRs;
        return response
          .status(200)
          .json(util.success(userRs, message.user_signup_success));
      }
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.error_message));
    }
  }

  async authSessionToken(request, response) {
    try {
      let userRs = await userModel.getOne({
        _id: new ObjectId(request.user._id),
        is_deleted: false,
      });

      let tokenRs = await AuthToken.signJWT({
        _id: userRs._id,
        email: userRs.email,
      });

      let createToken = await userModel.createToken({
        user_id: new ObjectId(userRs.id),
        token: tokenRs,
      });

      if (userRs) userRs.token = tokenRs;

      let uUpdate = {
        lastActive: new Date(),
      };

      let updDate = await userModel.updateUser(
        {
          _id: new ObjectId(request.user._id),
        },
        uUpdate
      );

      return response
        .status(200)
        .json(util.success(userRs, message.auth_data_get_successfully));
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.error_message));
    }
  }

  async getUserData(request, response) {
    try {
      if (
        typeof request.body.user_id == "undefined" ||
        (request.body.user_id && !ObjectId.isValid(request.body.user_id))
      ) {
        return response
          .status(400)
          .json(util.error({}, message.user_id_is_empty));
      } else {
        let userRs = await userModel.getProfileData({
          _id: new ObjectId(request.body.user_id),
          is_deleted: false,
        });

        let uUpdate = {
          lastActive: new Date(),
        };

        let updDate = await userModel.updateUser(
          {
            _id: new ObjectId(request.user._id),
          },
          uUpdate
        );

        if (userRs && userRs.length > 0) {
          userRs = userRs[0];
          // delete userRs[0].token;

          let endorseCount = await EndorseModel.countEndorse({
            endorse_to: userRs._id,
            is_deleted: false,
          });

          let isEndorse = await EndorseModel.countEndorse({
            endorse_to: userRs._id,
            endorse_by: request.user._id,
            is_deleted: false,
          });

          userRs.endorse = {
            endorseCount: endorseCount,
            isEndorseByMe: isEndorse > 0 ? true : false,
          };

          let postCount=await PostModel.countPosts({
            post_by:userRs._id,
            is_deleted:false,
          })

          userRs.postCount = postCount;

          return response
            .status(200)
            .json(util.success(userRs, message.user_data_get_successfully));
        } else {
          return response
            .status(400)
            .json(util.error({}, message.user_does_not_exists));
        }
      }
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.error_message));
    }
  }

  async checkEmailExists(request, response) {
    try {
      if (typeof request.body.email == "undefined" || !request.body.email) {
        return response
          .status(400)
          .json(util.error({}, message.email_address_empty));
      } else if (
        request.body.email &&
        !CONSTANTS.EMAIL_REGEX.test(request.body.email)
      ) {
        return response
          .status(400)
          .json(util.error({}, message.email_address_is_not_valid_format));
      } else {
        const userRs = await userModel.getOne({
          email: request.body.email.trim().toLowerCase(),
          is_deleted: false,
        });

        if (userRs && userRs.email) {
          return response.status(200).json(
            util.success(
              {
                exists: true,
              },
              message.email_is_already_exists
            )
          );
        } else {
          return response.status(200).json(
            util.success(
              {
                exists: false,
              },
              message.email_is_no_exists
            )
          );
        }
      }
    } catch (error) {
      console.log(error);
      return response
        .status(200)
        .send(util.error({}, error.message || message.error_message));
    }
  }

  async checkUsernameExists(request, response) {
    try {
      if (
        typeof request.body.user_name == "undefined" ||
        !request.body.user_name
      ) {
        return response
          .status(400)
          .json(util.error({}, message.user_name_empty));
      } else {
        const userRs = await userModel.getOne({
          user_name: request.body.user_name.trim().toLowerCase(),
          is_deleted: false,
        });

        if (userRs && userRs.user_name) {
          return response.status(200).json(
            util.success(
              {
                exists: true,
              },
              message.username_is_already_exists
            )
          );
        } else {
          return response.status(200).json(
            util.success(
              {
                exists: false,
              },
              message.username_is_no_exists
            )
          );
        }
      }
    } catch (error) {
      return response
        .status(200)
        .send(util.error({}, error.message || message.error_message));
    }
  }

  async createLink(request, response) {
    try {
      const { email } = request.body;

      const otpData = await ResetPasswordModel.createLink(email);

      const link = `${process.env.API_DOMAIN_URL}reset-password?email=${otpData.email}&otp=${otpData.otp}`;

      let emailRs = await mailer.sendmailUsingOptions({
        to: email,
        subject: "Noosk - Reset Password Link",
        html: `<h1>Reset your Noosk App Password</h1>
        <p>You’ve received this email because you (or someone pretending to be you) requested a password reset.</p>
        <p>Please ignore this message if you do not wish to reset your password.</p>
        <div>Click the link to <a target="_blank" href="${link}">Reset Password</a></div>
        `,
      });

      console.log(link);
      return response
        .status(200)
        .json(util.success({}, message.link_generated_success));
    } catch (error) {
      console.error(error);
      return response
        .status(400)
        .json(util.error({}, error.message || message.error_message));
    }
  }
  //sending email for verification
  async sendVerification(request, response) {
    try {
      let { email, _id, instagram, linkedin, twitter } = request.body;
      const removeHttps = (url) => {
        return url.replace(/^https?:\/\//i, "");
      };
      instagram = instagram ? removeHttps(instagram) : instagram;
      linkedin = linkedin ? removeHttps(linkedin) : linkedin;
      twitter = twitter ? removeHttps(twitter) : twitter;

      let emailRs = await mailer.sendEmailDirectly(
        "info@noosk.co",
        "info@noosk.co",
        "Expert Verification",
        `<h4>${email} is requiring a verification</h4>
         <p>User id : ${_id}</p>
         <p>Instagram : <a href="https://${instagram}" target="_blank">Instagram Profile</a></p>
         <p>Linkedin : <a href="https://${linkedin}" target="_blank">Linkedin Profile</a></p>
         <p>Twitter : <a href="https://${twitter}" target="_blank">Twitter Profile</a></p>
        `
      );
      return response
        .status(200)
        .json(util.success({}, message.verification_email_sent));
    } catch (error) {
      console.error(error);
      return response
        .status(400)
        .json(util.error({}, error.message || message.error_message));
    }
  }

  async showResetPasswordForm(request, response) {
    try {
      const { email, otp } = request.query;

      const resetForm = await ResetPasswordModel.showResetPasswordForm(
        email,
        otp
      );

      return response.render("reset_password", resetForm);
    } catch (error) {
      console.error(error);
      return response
        .status(400)
        .json(util.error({}, error.message || message.error_message));
    }
  }

  async updatePassword(request, response) {
    try {
      const { email, otp, password } = request.body;

      await ResetPasswordModel.updatePassword(email, otp, password);

      return response
        .status(200)
        .json(util.success({}, message.password_updated_success));
    } catch (error) {
      console.error(error);
      return response
        .status(400)
        .json(util.error({}, error.message || message.error_message));
    }
  }

  async userProfileUpdate(request, response) {
    try {
      let userBody = {};

      let oldData = await userModel.getOne({
        _id: request.user._id,
      });

      if (request.body.first_name) {
        userBody.first_name = request.body.first_name.trim();
      }

      if (request.body.middle_name) {
        userBody.middle_name = request.body.middle_name.trim();
      }

      if (typeof request.body.bio != "undefined") {
        userBody.bio = request.body.bio.trim();
      }

      if (request.body.last_name) {
        userBody.last_name = request.body.last_name.trim();
      }

      if (request.body.user_name) {
        let checkUserName = await userModel.getOne({
          user_name: {
            $regex: `^${request.body.user_name.trim().toLowerCase()}$`,
            $options: "i",
          },
          _id: { $nin: [new ObjectId(request.user._id)] },
          is_deleted: false,
        });

        if (checkUserName && checkUserName._id)
          throw new Error("Username is already taken");

        userBody.user_name = request.body.user_name.trim();
      }

      if (request.body.gender) {
        userBody.gender = request.body.gender.trim().toLowerCase();
      }

      if (request.body.mobile) {
        userBody.mobile = request.body.mobile;
      }

      if (request.body.category_id && Array.isArray(request.body.category_id)) {
        userBody.category_id = request.body.category_id.map(
          (catId) => new ObjectId(catId)
        );
      }
      //subcategory section
      if (
        request.body.subcategory_id &&
        Array.isArray(request.body.subcategory_id)
      ) {
        userBody.subcategory_id = request.body.subcategory_id.map(
          (scatId) => new ObjectId(scatId)
        );
      }

      //interest section
      if (request.body.interest_id && Array.isArray(request.body.interest_id)) {
        userBody.interest_id = request.body.interest_id.map(
          (intId) => new ObjectId(intId)
        );
      }

      //talks about
      if (request.body.talks_about && Array.isArray(request.body.talks_about)) {
        userBody.talks_about = request.body.talks_about;
      }

      //userType
      if (request.body.user_type && request.body.user_type !== undefined) {
        userBody.user_type = request.body.user_type;
      }
      //social
      if ("social_links" in request.body) {
        if (
          typeof request.body.social_links !== "object" ||
          request.body.social_links === null ||
          Array.isArray(request.body.social_links)
        ) {
          return response
            .status(400)
            .json(util.error({}, "The social_links must be an object."));
        }

        userBody.social_links = {};

        if (request.body.social_links.instagram) {
          userBody.social_links.instagram =
            request.body.social_links.instagram.trim();
        }
        if (request.body.social_links.linkedin) {
          userBody.social_links.linkedin =
            request.body.social_links.linkedin.trim();
        }
        if (request.body.social_links.twitter) {
          userBody.social_links.twitter =
            request.body.social_links.twitter.trim();
        }
      }

      if (request.body.profile) {
        userBody.profile = request.body.profile;
        if (
          oldData.profile &&
          oldData.profile.indexOf(process.env.CLOUD_FRONT_URL) > -1
        ) {
          let AWSKey = oldData.profile.replace(process.env.CLOUD_FRONT_URL, "");
          let delFile = await uploadHelper.deleteFile(AWSKey);
        }
      }
      if (request.body.password) {
        const salt = bcrypt.genSaltSync(Number(process.env.SALT_ROUND));
        const hash = bcrypt.hashSync(request.body.password, salt);
        userBody.password = hash;
      }

      const user = await userModel.updateUser(
        { _id: new ObjectId(request.user._id) },
        userBody
      );

      if (user && user.acknowledged) {
        let userRs = await userModel.getOne({
          _id: new ObjectId(request.user._id),
        });
        userRs.token = request.headers["x-access-token"];
        return response
          .status(200)
          .json(util.success(userRs, message.user_signup_success));
      } else {
        throw new Error("Failed to update user data");
      }
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.error_message));
    }
  }

  async removeAccount(request, response) {
    try {
      const delWhere = { _id: new ObjectId(request.user._id) };
      let getUserData = await userModel.getOne(delWhere);
      if (getUserData && getUserData._id) {
        let delRs = await userModel.hardDeleteOne(delWhere);
        if (delRs && delRs.deletedCount > 0) {
          let deleteTokens = await userModel.deleteAuthTokens({
            user_id: new ObjectId(getUserData._id),
          });   

          let deletePost = await PostModel.deletePostMany({
            post_by: new ObjectId(getUserData._id),
          });

          let deleteVote = await UpVoteModel.hardDelete({
            vote_by: new ObjectId(getUserData._id),
          });

          let deleteRequest = await PostRequestModel.deleteRequestMany({
            post_by: new ObjectId(getUserData._id),
          });

          let deleteReport = await PostReportModel.hardDelete({
            report_by: new ObjectId(getUserData._id),
          });

          let deleteReportRequest = await PostRequestReportModel.hardDelete({
            report_by: new ObjectId(getUserData._id),
          });

          return response
            .status(200)
            .json(
              util.success({}, message.user_account_is_repoved_successfully)
            );
        } else {
          return response
            .status(400)
            .json(util.error({}, message.error_message));
        }
      } else {
        return response
          .status(400)
          .json(util.error({}, message.user_does_not_exists));
      }
    } catch (error) {
      console.log(error);
      return response
        .status(400)
        .json(util.error({}, error.message || message.error_message));
    }
  }

  async saveToken(request, response) {
    try {
      if (
        !request.body.firebase_token ||
        (request.body.firebase_token &&
          request.body.firebase_token.trim() == "")
      ) {
        return response
          .status(400)
          .json(util.error({}, message.firebase_token_is_empty));
      } else {
        let tokenObj = {
          token: request.body.firebase_token,
          user_id: request.user._id,
        };
        var tokenRs = await FirebaseTokenModel.getOne(tokenObj);
        if (!tokenRs) {
          tokenRs = await FirebaseTokenModel.createToken(tokenObj);
        }
        return response
          .status(200)
          .json(util.success(tokenRs, message.firebase_token_saved));
      }
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.error_message));
    }
  }

  async logoutUser(request, response) {
    try {
      let deleteTokens = await userModel.deleteAuthTokens({
        user_id: new ObjectId(request.user._id),
        token: request.headers["x-access-token"],
      });

      if (request.body.firebase_token) {
        let deleteFireBaseToken = await FirebaseTokenModel.hardDelete({
          user_id: new ObjectId(request.user._id),
          token: request.body.firebase_token,
        });
      }

      let uUpdate = {
        lastActive: new Date(),
      };

      let updDate = await userModel.updateUser(
        {
          _id: new ObjectId(request.user._id),
        },
        uUpdate
      );

      console.log(updDate, "updDate");

      return response
        .status(200)
        .json(util.success({}, message.user_logged_out_successfully));
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.error_message));
    }
  }

  async inviteUser(request, response) {
    try {
      let count = 0;
      let invite_badge = false;

      let userData = await userModel.getOne({
        _id: new ObjectId(request.user._id),
      });

      if (userData && userData.invite_count) {
        count = userData.invite_count + 1;
      } else {
        count = 1;
      }

      if (count > 9) {
        invite_badge = true;
      }

      let updUser = await userModel.updateUser(
        {
          _id: new ObjectId(request.user._id),
        },
        {
          invite_badge: invite_badge,
          invite_count: count,
        }
      );

      return response.status(200).json(
        util.success(
          {
            invite_badge: invite_badge,
            invite_count: count,
          },
          message.user_invite_count_successfully
        )
      );
    } catch (error) {
      return response
        .status(400)
        .json(util.error({}, error.message || message.error_message));
    }
  }

  async shownUpdate(request, response) {
    try {
      if (
        typeof request.body.badge == "undefined" ||
        (request.body.badge &&
          ![
            "first_post_badge",
            "tenth_post_badge",
            "twenty_post_badge",
            "fifty_post_badge",
            "hundred_post_badge",
          ].includes(request.body.badge))
      ) {
        return response
          .status(400)
          .json(util.error({}, message.invalide_badge_given));
      } else {
        let updObj = {
          [request.body.badge + ".isShown"]: true,
        };
        let updUser = await userModel.updateUser(
          {
            _id: request.user._id,
          },
          updObj
        );

        return response
          .status(200)
          .json(util.success({}, message.badge_update));
      }
    } catch (error) {
      console.log(error, "error");
      return response
        .status(400)
        .json(util.error({}, error.message || message.error_message));
    }
  }

  async lastActiveNotification() {
    let prevDate = moment(new Date()).subtract(10, "day").toDate();
    logger.info(`----In lastActiveNotification ${prevDate}`);

    let userList = await userModel.getForLastActive(
      { lastActive: { $lte: prevDate } },
      {
        _id: 1,
        user_name: 1,
        first_name: 1,
        last_name: 1,
        middle_name: 1,
        email: 1,
      }
    );

    // console.log(userList);
    if (userList && userList.length > 0) {
      for (let u of userList) {
        let getTokens = await FirebaseTokenModel.findByKey({
          user_id: u._id,
          is_deleted: false,
        });

        if (getTokens && getTokens.length > 0) {
          let tokenArr = getTokens.map((tk) => tk.token);
          if (tokenArr && tokenArr.length > 0) {
            let notificationData = {
              tokens: tokenArr,
              title: `We miss you on Noosk`,
              body: `Hi ${
                u.user_name ? u.user_name : u.first_name
              } We've missed you on Noosk! Your insights are valuable – come back and help other users by sharing your knowledge!`,
              data: {
                type: "System Notification",
              },
            };

            let sendRs = await pushNotification.sendMulticast(notificationData);
          }
        }

        /* if(u && u.email){
          await mailer.sendmailUsingOptions({
            to:u.email,
            subject:`We miss you on Noosk`,
            html:`Hi ${u.user_name ? u.user_name : (u.first_name)} We've missed you on Noosk! Your insights are valuable – come back and help other users by sharing your knowledge!`
          });
        } */
      }
    }
    return true;
  }
}

module.exports = new UserHandler();